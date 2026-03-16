// server/services/newsService.js - Agriculture news aggregation (Tavily + RSS fallback)

import axios from 'axios';
import Parser from 'rss-parser';

const rssParser = new Parser({
  headers: { 'User-Agent': 'AgroScope/1.0 (Agriculture News; +https://agroscope.app)', 'Accept': 'application/rss+xml' },
  timeout: 8000
});

const DEFAULT_AGRI_QUERIES = [
  'agriculture news India',
  'crop waste management',
  'farming technology',
  'global agriculture market'
];

const GOOGLE_NEWS_RSS_FALLBACK = [
  'https://news.google.com/rss/search?q=agriculture+India&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=crop+waste+management&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=farming+technology&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=global+agriculture+market&hl=en-US&gl=US&ceid=US:en'
];

function sourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown-source';
  }
}

function normalizeToStructured(article) {
  return {
    title: article.title,
    url: article.url,
    source: article.source || sourceFromUrl(article.url),
    published_date: article.published_date || new Date().toISOString(),
    snippet: article.snippet || ''
  };
}

export async function fetchTavilyNews(apiKey, query, maxResults = 10) {
  if (!apiKey || apiKey === 'demo_key') {
    console.log('⚠️ Tavily API key not configured');
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query,
        search_depth: 'basic',
        max_results: Math.min(maxResults, 10),
        topic: 'news',
        include_answer: false,
        include_raw_content: false,
        include_images: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        timeout: 15000
      }
    );

    const results = response.data.results || [];
    return results
      .map((result) => ({
        title: result.title || 'Untitled',
        url: result.url || '#',
        source: sourceFromUrl(result.url),
        published_date: result.published_date || new Date().toISOString(),
        snippet: result.content || result.description || 'No snippet available'
      }))
      .filter((item) => item.url && item.title);
  } catch (error) {
    console.error('Tavily API error:', error.response?.data || error.message);
    return null;
  }
}

export async function fetchRSSFeeds(feedUrls = GOOGLE_NEWS_RSS_FALLBACK) {
  const allArticles = [];
  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const articles = (feed.items || []).slice(0, 10).map((item) => ({
        title: item.title || 'Untitled',
        url: item.link || '#',
        source: feed.title || sourceFromUrl(item.link),
        published_date: item.pubDate || new Date().toISOString(),
        snippet: item.contentSnippet || (item.content && item.content.substring(0, 240)) || 'No snippet available'
      }));
      allArticles.push(...articles);
    } catch (error) {
      console.error(`RSS feed error (${feedUrl}):`, error.message);
    }
  }
  return allArticles;
}

export function getDemoAgricultureNews() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return [
    {
      title: 'India launches new scheme for crop residue management',
      url: 'https://agriculture.gov.in',
      source: 'agriculture.gov.in',
      published_date: new Date(now - 1 * dayMs).toISOString(),
      snippet: 'The government announced support for farmers adopting non-burning alternatives for paddy residue.'
    },
    {
      title: 'Farming technology pilots expand in South Asia',
      url: 'https://www.fao.org',
      source: 'fao.org',
      published_date: new Date(now - 2 * dayMs).toISOString(),
      snippet: 'New pilots for precision irrigation and monitoring tools are being rolled out across multiple regions.'
    },
    {
      title: 'Global agriculture markets show mixed commodity trends',
      url: 'https://www.worldbank.org',
      source: 'worldbank.org',
      published_date: new Date(now - 3 * dayMs).toISOString(),
      snippet: 'Commodity prices remain mixed due to weather pressure, logistics constraints, and demand rebalancing.'
    },
    {
      title: 'Crop waste management startups secure new climate funding',
      url: 'https://www.unep.org',
      source: 'unep.org',
      published_date: new Date(now - 4 * dayMs).toISOString(),
      snippet: 'Startups focused on biomass and residue value chains announced new climate-linked investments.'
    }
  ];
}

function dedupeStructuredNews(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${(item.title || '').trim().toLowerCase()}|${item.url || ''}`;
    if (!item.title || !item.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchAgricultureNews(config = {}) {
  try {
    const { tavilyApiKey, queries = DEFAULT_AGRI_QUERIES, rssFeeds = GOOGLE_NEWS_RSS_FALLBACK } = config;
    console.log('🔄 Fetching agriculture intelligence feed...');

    const tavilyBatches = await Promise.all(
      queries.map((q) => fetchTavilyNews(tavilyApiKey, q, 8))
    );

    const tavilyMerged = dedupeStructuredNews(tavilyBatches.flat().filter(Boolean));
    if (tavilyMerged.length > 0) {
      return tavilyMerged
        .map(normalizeToStructured)
        .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
    }

    console.warn('⚠️ Tavily failed or returned no data; falling back to Google News RSS feeds.');
    const rssItems = dedupeStructuredNews(await fetchRSSFeeds(rssFeeds));
    if (rssItems.length > 0) {
      return rssItems
        .map(normalizeToStructured)
        .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
    }

    return getDemoAgricultureNews();
  } catch (err) {
    console.error('fetchAgricultureNews error:', err.message);
    return getDemoAgricultureNews();
  }
}

export function extractTrendingTopics(articles = [], topN = 8) {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'over', 'under', 'after', 'before',
    'agriculture', 'farming', 'news', 'india', 'global', 'market', 'today', 'says', 'amid', 'across'
  ]);

  const counts = new Map();
  for (const article of articles) {
    const text = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();
    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic, mentions]) => ({ topic, mentions }));
}

export function filterNewsByLocation(articles, locationKeywords) {
  if (!locationKeywords || locationKeywords.length === 0) return articles;
  const keywords = locationKeywords.map(k => k.toLowerCase());
  return articles.filter(article => {
    const searchText = `${article.headline || article.title || ''} ${article.summary || article.snippet || ''}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword));
  });
}

export function categorizeNews(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  if (text.match(/government|policy|law|regulation|ban|mandate|subsidy|scheme/)) return 'Policy';
  if (text.match(/price|market|trade|export|import|demand|supply|cost/)) return 'Market';
  if (text.match(/technology|app|digital|drone|automation|ai|sensor|iot/)) return 'Technology';
  if (text.match(/climate|environment|pollution|sustainability|green|carbon|emission/)) return 'Environment';
  return 'Market';
}

export function calculateImpactScore(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  let score = 5;
  const highImpact = ['billion', 'million', 'nationwide', 'government', 'crisis', 'breakthrough'];
  highImpact.forEach(keyword => { if (text.includes(keyword)) score += 2; });
  const mediumImpact = ['thousand', 'regional', 'increase', 'decrease', 'launch', 'new'];
  mediumImpact.forEach(keyword => { if (text.includes(keyword)) score += 1; });
  return Math.min(Math.round(score), 10);
}

export function detectOpportunity(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  const opportunityKeywords = ['subsidy', 'grant', 'funding', 'scheme', 'program', 'opportunity', 'earn', 'income', 'profit', 'benefit', 'register', 'apply', 'enroll'];
  if (!opportunityKeywords.some(keyword => text.includes(keyword))) return null;
  const sentences = (article.summary || '').split(/[.!?]/);
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (opportunityKeywords.some(keyword => lowerSentence.includes(keyword)))
      return sentence.trim() || 'Check article for opportunity details';
  }
  return 'Potential opportunity for farmers - read full article';
}
