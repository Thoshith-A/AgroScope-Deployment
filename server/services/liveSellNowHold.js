/**
 * Sell Now vs Hold recommendation + chart data. Tavily + DeepSeek. Cache 2h.
 */
import fetch from 'node-fetch';

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const cache = new Map();

const WASTE_LABELS = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

function cacheKey(wasteType, city) {
  return `sh:${String(wasteType || '').trim().toLowerCase()}:${String(city || '').trim()}`;
}

async function tavilySearch(wasteType, city) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const query = `Should I sell ${label} now or hold India ${city} market price trend next 2 weeks`;
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

async function deepSeekSellHold(wasteType, city, searchResults) {
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
          content: 'You are a crop market analyst for India. Return ONLY valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: `Crop: ${label}. City: ${city}.\nContext: ${context.slice(0, 2000)}\n\nReturn JSON: {"recommendation":"sell_now" or "hold","confidence":0-100,"reason":"one short sentence","chartData":[{"label":"Day 1","value":2.1,"type":"actual"},{"label":"Day 3","value":2.2,"type":"actual"},{"label":"Day 7","value":2.35,"type":"projected"},{"label":"Day 14","value":2.4,"type":"projected"}]}. chartData: 4-6 points, mix of actual (past) and projected (next 14 days), value = price per kg.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}

function fallbackChartData() {
  const base = 2.0;
  return [
    { label: 'Day 1', value: base, type: 'actual' },
    { label: 'Day 5', value: base + 0.1, type: 'actual' },
    { label: 'Day 7', value: base + 0.15, type: 'projected' },
    { label: 'Day 10', value: base + 0.2, type: 'projected' },
    { label: 'Day 14', value: base + 0.25, type: 'projected' },
  ];
}

export async function getSellNowHold(wasteType, city) {
  const key = cacheKey(wasteType, city);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const w = (wasteType && String(wasteType).trim()) || 'paddy_husk';
  const c = (city && String(city).trim()) || 'Chennai';

  let searchResults = null;
  try {
    searchResults = await tavilySearch(w, c);
  } catch (e) {
    console.warn('liveSellNowHold Tavily:', e.message);
  }

  let parsed = null;
  try {
    parsed = await deepSeekSellHold(w, c, searchResults);
  } catch (e) {
    console.warn('liveSellNowHold DeepSeek:', e.message);
  }

  const recommendation = parsed?.recommendation === 'hold' ? 'hold' : 'sell_now';
  const confidence = Math.min(100, Math.max(0, Number(parsed?.confidence) || 70));
  const reason = parsed?.reason || (recommendation === 'sell_now' ? 'Current prices are strong; lock in now.' : 'Prices may improve in the next 1–2 weeks.');
  const chartData = Array.isArray(parsed?.chartData) && parsed.chartData.length > 0
    ? parsed.chartData.map((d) => ({
        label: d.label || 'Day',
        value: Number(d.value) || 2,
        type: d.type === 'projected' ? 'projected' : 'actual',
      }))
    : fallbackChartData();

  const data = { recommendation, confidence, reason, chartData };
  cache.set(key, { data, at: Date.now() });
  return data;
}
