/**
 * 30-day price forecast by period (1-5, 6-10, ... 26-30 days). Tavily + DeepSeek. Cache 6h.
 */
import fetch from 'node-fetch';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

const WASTE_LABELS = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

const FALLBACK_PERIODS = [
  { period: '1-5 days', minPrice: 1.8, maxPrice: 2.4, trend: 'stable' },
  { period: '6-10 days', minPrice: 1.85, maxPrice: 2.5, trend: 'rising' },
  { period: '11-15 days', minPrice: 1.9, maxPrice: 2.55, trend: 'rising' },
  { period: '16-20 days', minPrice: 1.88, maxPrice: 2.52, trend: 'stable' },
  { period: '21-25 days', minPrice: 1.92, maxPrice: 2.6, trend: 'rising' },
  { period: '26-30 days', minPrice: 1.95, maxPrice: 2.65, trend: 'rising' },
];

function cacheKey(wasteType, city) {
  return `fc:${String(wasteType || '').trim().toLowerCase()}:${String(city || '').trim()}`;
}

async function tavilySearch(wasteType, city) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const query = `${label} crop residue price forecast 30 days India ${city} market trend`;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    }),
  });
  return res.json().catch(() => ({}));
}

async function deepSeekForecast(wasteType, city, searchResults) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const context = searchResults?.answer || (Array.isArray(searchResults?.results)
    ? searchResults.results.map((r) => r.content || '').join('\n')
    : '');
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an agricultural commodity analyst for India. From search results, extract a 30-day price forecast. Return ONLY valid JSON array, no markdown.',
        },
        {
          role: 'user',
          content: `Crop: ${label}. City: ${city}. Today's context:\n${context.slice(0, 2500)}\n\nReturn a JSON array of exactly 6 objects, one per period, with keys: period (string "1-5 days", "6-10 days", "11-15 days", "16-20 days", "21-25 days", "26-30 days"), minPrice (number ₹/kg), maxPrice (number ₹/kg), trend ("rising"|"falling"|"stable"). Use realistic India crop residue prices. Example: [{"period":"1-5 days","minPrice":1.8,"maxPrice":2.4,"trend":"stable"},...]`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    if (Array.isArray(arr) && arr.length >= 6) return arr.slice(0, 6);
  } catch (_) {}
  return null;
}

export async function getLiveMarketForecast(wasteType, city) {
  const key = cacheKey(wasteType, city);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const w = (wasteType && String(wasteType).trim()) || 'paddy_husk';
  const c = (city && String(city).trim()) || 'Chennai';

  let searchResults = null;
  try {
    searchResults = await tavilySearch(w, c);
  } catch (e) {
    console.warn('liveMarketForecast Tavily:', e.message);
  }

  let periods = null;
  try {
    periods = await deepSeekForecast(w, c, searchResults);
  } catch (e) {
    console.warn('liveMarketForecast DeepSeek:', e.message);
  }

  const data = {
    periods: (periods || FALLBACK_PERIODS).map((p) => ({
      period: p.period || '1-5 days',
      minPrice: Number(p.minPrice) || 1.5,
      maxPrice: Number(p.maxPrice) || 2.5,
      trend: ['rising', 'falling', 'stable'].includes(p.trend) ? p.trend : 'stable',
    })),
  };
  cache.set(key, { data, at: Date.now() });
  return data;
}
