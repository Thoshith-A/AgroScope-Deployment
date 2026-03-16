import express from 'express';
import {
  fetchAgricultureNews,
  filterNewsByLocation,
  extractTrendingTopics,
  getDemoAgricultureNews
} from '../services/newsService.js';
import {
  enrichNewsForLocation,
  generateLocationInsight,
  generateLiveUpdateSummary
} from '../services/deepseekAgriNews.js';
import {
  reverseGeocode,
  getLocationFromIP,
  getAgricultureRegion,
  getLocationKeywords,
  isValidCoordinates
} from '../services/geocodingService.js';

const router = express.Router();
const TEN_MINUTES_MS = 10 * 60 * 1000;

const cache = {
  global: { data: null, ts: 0, ttl: TEN_MINUTES_MS },
  location: new Map(),
  trending: { data: null, ts: 0, ttl: TEN_MINUTES_MS },
  live: { data: null, ts: 0, ttl: 30 * 1000 }
};

function isCacheFresh(entry) {
  return !!entry?.data && Date.now() - entry.ts < entry.ttl;
}

function safeLimit(value, fallback = 20) {
  return Math.max(1, Math.min(50, parseInt(value, 10) || fallback));
}

function mapToFeedItem(item, index) {
  return {
    id: item.id || `agri_${Date.now()}_${index}`,
    title: item.title,
    summary: item.summary || item.snippet || '',
    category: item.category || 'Market Trends',
    region: item.region || 'Global',
    sentiment: item.sentiment || 'Neutral',
    source: item.source || 'unknown-source',
    url: item.url || '#',
    published_date: item.published_date || new Date().toISOString(),
    snippet: item.snippet || item.summary || ''
  };
}

async function loadGlobalFeed(limit = 20) {
  const structured = await fetchAgricultureNews({
    tavilyApiKey: process.env.TAVILY_API_KEY
  });

  const analyzed = await enrichNewsForLocation(structured.slice(0, limit), process.env.DEEPSEEK_API_KEY, null);
  const feed = analyzed.map(mapToFeedItem);
  return feed.length > 0 ? feed : getDemoAgricultureNews().map((item, idx) => mapToFeedItem(item, idx));
}

router.get('/global', async (req, res) => {
  const limit = safeLimit(req.query.limit, 20);
  const category = String(req.query.category || 'all');
  const region = String(req.query.region || 'all');

  try {
    if (!isCacheFresh(cache.global)) {
      const feed = await loadGlobalFeed(limit);
      cache.global = { data: feed, ts: Date.now(), ttl: TEN_MINUTES_MS };
    }

    let scoped = cache.global.data;
    if (category !== 'all') scoped = scoped.filter((n) => n.category === category);
    if (region !== 'all') scoped = scoped.filter((n) => String(n.region).toLowerCase().includes(region.toLowerCase()));

    res.json({
      success: true,
      count: scoped.slice(0, limit).length,
      news: scoped.slice(0, limit),
      cached: true,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GET /api/agri-news/global error:', error);
    const fallback = getDemoAgricultureNews().map((item, idx) => mapToFeedItem(item, idx));
    res.json({
      success: true,
      count: fallback.slice(0, limit).length,
      news: fallback.slice(0, limit),
      cached: false,
      timestamp: Date.now()
    });
  }
});

async function handleLocationNews(req, res, coordinatesSource = 'query') {
  const latRaw = coordinatesSource === 'body' ? req.body?.latitude : req.query.lat;
  const lngRaw = coordinatesSource === 'body' ? req.body?.longitude : req.query.lng;
  const limitRaw = coordinatesSource === 'body' ? req.body?.limit : req.query.limit;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const limit = safeLimit(limitRaw, 15);

  try {
    let location;
    if (isValidCoordinates(lat, lng)) {
      location = await reverseGeocode(lat, lng, process.env.OPENCAGE_API_KEY);
    } else {
      location = await getLocationFromIP();
    }

    const regionProfile = getAgricultureRegion(location);
    const cacheKey = `${location.country || 'Unknown'}|${location.state || 'Unknown'}|${location.city || 'Unknown'}|${limit}`;
    const cached = cache.location.get(cacheKey);

    if (cached && isCacheFresh(cached)) {
      return res.json({
        success: true,
        location: cached.location,
        count: cached.data.length,
        news: cached.data,
        cached: true,
        timestamp: Date.now()
      });
    }

    let baseFeed = isCacheFresh(cache.global) ? cache.global.data : await loadGlobalFeed(25);
    if (!isCacheFresh(cache.global)) {
      cache.global = { data: baseFeed, ts: Date.now(), ttl: TEN_MINUTES_MS };
    }

    const locationKeywords = getLocationKeywords(location);
    const locationMatched = filterNewsByLocation(baseFeed, locationKeywords);
    const scopedRaw = (locationMatched.length > 0 ? locationMatched : baseFeed).slice(0, limit);
    const localized = await enrichNewsForLocation(scopedRaw, process.env.DEEPSEEK_API_KEY, location);
    const locationInsight = await generateLocationInsight({ ...location, agricultureRegion: regionProfile }, localized, process.env.DEEPSEEK_API_KEY);

    const finalNews = localized.map(mapToFeedItem);
    const payloadLocation = {
      city: location.city,
      state: location.state,
      country: location.country,
      coordinates: location.coordinates,
      agricultureRegion: regionProfile,
      insight: locationInsight
    };

    cache.location.set(cacheKey, {
      data: finalNews,
      location: payloadLocation,
      ts: Date.now(),
      ttl: TEN_MINUTES_MS
    });

    res.json({
      success: true,
      location: payloadLocation,
      count: finalNews.length,
      news: finalNews,
      cached: false,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GET /api/agri-news/location error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch location agriculture news', timestamp: Date.now() });
  }
}

router.get('/location', async (req, res) => handleLocationNews(req, res, 'query'));

// Backward compatibility for existing frontend body-based call.
router.post('/location', async (req, res) => {
  return handleLocationNews(req, res, 'body');
});

router.get('/trending', async (req, res) => {
  const topicLimit = safeLimit(req.query.topics, 8);

  try {
    if (!isCacheFresh(cache.trending)) {
      const globalFeed = isCacheFresh(cache.global) ? cache.global.data : await loadGlobalFeed(30);
      if (!isCacheFresh(cache.global)) {
        cache.global = { data: globalFeed, ts: Date.now(), ttl: TEN_MINUTES_MS };
      }

      cache.trending = {
        data: extractTrendingTopics(globalFeed, topicLimit),
        ts: Date.now(),
        ttl: TEN_MINUTES_MS
      };
    }

    res.json({
      success: true,
      topics: cache.trending.data,
      timestamp: Date.now(),
      cached: true
    });
  } catch (error) {
    console.error('GET /api/agri-news/trending error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending topics', timestamp: Date.now() });
  }
});

router.get('/live', async (_req, res) => {
  try {
    if (isCacheFresh(cache.live)) {
      return res.json({ success: true, news: cache.live.data, cached: true });
    }

    const liveUpdate = await generateLiveUpdateSummary(process.env.DEEPSEEK_API_KEY);
    const newsItem = {
      id: `live_${Date.now()}`,
      title: liveUpdate.headline,
      summary: liveUpdate.summary,
      timestamp: liveUpdate.timestamp,
      category: 'Market Trends',
      region: 'Global',
      sentiment: 'Neutral'
    };

    cache.live = { data: newsItem, ts: Date.now(), ttl: 30 * 1000 };
    res.json({ success: true, news: newsItem, cached: false });
  } catch {
    res.json({
      success: true,
      news: {
        id: `live_${Date.now()}`,
        title: 'Agriculture Updates Live',
        summary: 'Monitoring real-time agriculture news across key producing regions.',
        timestamp: Date.now(),
        category: 'Market Trends',
        region: 'Global',
        sentiment: 'Neutral'
      },
      cached: false
    });
  }
});

export default router;
