/**
 * Live market price: Tavily search -> DeepSeek extraction -> structured price.
 * Cache 24 hours per (wasteType + city).
 */
import fetch from 'node-fetch';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map();

const WASTE_LABELS = {
  paddy_husk: 'Paddy Husk',
  rice_straw: 'Rice Straw',
  rice_husk: 'Rice Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
  groundnut_shell: 'Groundnut Shell',
  maize_cob: 'Maize Cob',
  oilseed_waste: 'Oilseed Waste',
  brewery_spent_grains: 'Brewery Spent Grains',
  fruit_waste: 'Fruit Waste',
  vegetable_waste: 'Vegetable Waste',
  other_agro_waste: 'Other Agricultural Waste',
};

/** Normalize to a stable key for cache/lookups. Preserves underscore keys (e.g. rice_straw). */
function toWasteKey(wasteType) {
  const s = String(wasteType || '').trim();
  const keyForm = s.toLowerCase().replace(/\s+/g, '_');
  if (WASTE_LABELS[keyForm]) return keyForm;
  const entry = Object.entries(WASTE_LABELS).find(([, label]) => label.toLowerCase() === s.toLowerCase());
  if (entry) return entry[0];
  return keyForm || 'paddy_husk';
}

const FALLBACK_RANGES = {
  paddy_husk: { min: 1.2, max: 2.8 },
  rice_straw: { min: 1.0, max: 2.5 },
  rice_husk: { min: 1.3, max: 3.0 },
  wheat_straw: { min: 0.8, max: 2.2 },
  corn_stalks: { min: 0.6, max: 1.8 },
  sugarcane_bagasse: { min: 1.5, max: 3.5 },
  coconut_shells: { min: 2.0, max: 4.5 },
  groundnut_shell: { min: 1.8, max: 4.2 },
  maize_cob: { min: 1.1, max: 2.8 },
  oilseed_waste: { min: 1.2, max: 3.0 },
  brewery_spent_grains: { min: 1.8, max: 3.8 },
  fruit_waste: { min: 0.5, max: 1.6 },
  vegetable_waste: { min: 0.5, max: 1.5 },
  other_agro_waste: { min: 1.0, max: 3.0 },
};

function getFallbackRange(key) {
  if (FALLBACK_RANGES[key]) return FALLBACK_RANGES[key];

  if (/(shell|husk|cob)/.test(key)) return { min: 1.6, max: 4.2 };
  if (/(pomace|bagasse|brewery)/.test(key)) return { min: 1.6, max: 3.8 };
  if (/(fruit|vegetable|banana|mango|tomato|citrus|cassava|potato)/.test(key)) return { min: 0.5, max: 1.9 };
  if (/(straw|stalk|vine|efb)/.test(key)) return { min: 0.8, max: 2.7 };
  if (/(tea|coffee|tobacco|hemp|jute|olive|cocoa|sesame|castor|almond|cashew|pea|gram|lentil|bean|cowpea|tur|rapeseed|sorghum|millet|rye)/.test(key)) {
    return { min: 1.0, max: 3.2 };
  }
  return { min: 1.0, max: 3.0 };
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTrend(value) {
  return ['rising', 'falling', 'stable'].includes(value) ? value : 'stable';
}

function normalizeConfidence(value) {
  return ['high', 'medium', 'low'].includes(value) ? value : 'low';
}

/**
 * Normalize model output and reject generic/outlier values
 * so one bad extraction does not show same price for all crops.
 */
function sanitizeExtracted(extracted, wasteType) {
  if (!extracted || typeof extracted !== 'object') return null;
  const key = toWasteKey(wasteType);
  const fallback = getFallbackRange(key);

  const confidence = normalizeConfidence(extracted.confidence);
  const trend = normalizeTrend(extracted.trend);
  const rawPrice = toNumberOrNull(extracted.pricePerKg);

  let min = toNumberOrNull(extracted?.priceRange?.min);
  let max = toNumberOrNull(extracted?.priceRange?.max);
  if (min == null || max == null || min <= 0 || max <= 0 || min > max) {
    min = fallback.min;
    max = fallback.max;
  }

  const generic15 = rawPrice != null && Math.abs(rawPrice - 15) < 0.01 && confidence !== 'high';
  const tooLow = rawPrice != null && rawPrice < fallback.min * 0.6;
  const tooHigh = rawPrice != null && rawPrice > fallback.max * 1.8;

  let price = rawPrice;
  if (price == null || price <= 0 || generic15 || tooLow || tooHigh) {
    price = (fallback.min + fallback.max) / 2;
    min = fallback.min;
    max = fallback.max;
  } else if (confidence === 'low' && (price < fallback.min * 0.8 || price > fallback.max * 1.4)) {
    price = (fallback.min + fallback.max) / 2;
    min = fallback.min;
    max = fallback.max;
  }

  const source = extracted.source && String(extracted.source).trim()
    ? String(extracted.source).trim()
    : `Tavily + DeepSeek | ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
  const lastUpdated = extracted.lastUpdated
    ? String(extracted.lastUpdated)
    : new Date().toISOString().slice(0, 10);

  return {
    pricePerKg: Number(price.toFixed(2)),
    priceRange: {
      min: Number(Math.max(0.1, min).toFixed(2)),
      max: Number(Math.max(min + 0.1, max).toFixed(2)),
    },
    trend,
    confidence,
    source,
    lastUpdated,
  };
}

function cacheKey(wasteType, city) {
  return `${String(wasteType || '').trim().toLowerCase()}:${String(city || '').trim()}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}

async function tavilySearch(wasteType, city) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const monthYear = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const query = `${label} crop residue market price per kg India ${city} ${monthYear}`;
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
  const data = await res.json().catch(() => ({}));
  return data;
}

async function deepSeekExtract(wasteType, city, searchResults) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const today = new Date().toLocaleDateString('en-IN');
  const context = searchResults?.answer || (Array.isArray(searchResults?.results)
    ? searchResults.results.map((r) => r.content || '').join('\n')
    : 'No results');
  const fallbackRange = getFallbackRange(wasteType);

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a commodity price extraction expert for Indian agricultural markets. Extract structured price data from search results. Return ONLY valid JSON, no markdown, no code block.',
        },
        {
          role: 'user',
          content: `From these search results, extract the current market price for ${label} in ${city}, India. Today is ${today}.\n\nSearch results:\n${context.slice(0, 3000)}\n\nReturn exactly this JSON (no other text):\n{"pricePerKg": number, "confidence": "high"|"medium"|"low", "source": "string", "priceRange": {"min": number, "max": number}, "trend": "rising"|"falling"|"stable", "lastUpdated": "string"}\n\nIf no real price found, set confidence to "low" and use this fallback range for ${label}: INR ${fallbackRange.min}-${fallbackRange.max} per kg. Avoid generic placeholder values (like 10 or 15) across all crops.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function buildResponse(extracted, wasteType, quantityTons = 1) {
  const key = toWasteKey(wasteType);
  const range = getFallbackRange(key);
  const normalized = extracted || null;

  const pricePerKg = normalized?.pricePerKg ?? Number((((range.min + range.max) / 2)).toFixed(2));
  const priceRange = normalized?.priceRange ?? { min: range.min, max: range.max };
  const trend = normalized?.trend ?? 'stable';
  const confidence = normalized?.confidence ?? 'low';
  const source = normalized?.source ?? 'Estimated (configure API keys for live rates)';
  const lastUpdated = normalized?.lastUpdated ?? new Date().toISOString().slice(0, 10);
  const carbonPerKg = 0.34;
  const carbonValuePerTon = carbonPerKg * 1000;
  const totalLotValue = pricePerKg * quantityTons * 1000;

  return {
    pricePerKg,
    priceRange,
    trend,
    confidence,
    source,
    lastUpdated,
    carbonValuePerTon,
    totalLotValue: Math.round(totalLotValue),
  };
}

/**
 * Get live market price for wasteType + city. Uses cache for 24h.
 * @param {string} wasteType - e.g. paddy_husk
 * @param {string} city - e.g. Chennai
 * @param {number} [quantityTons] - for totalLotValue
 */
export async function getLiveMarketPrice(wasteType, city, quantityTons = 1) {
  const w = toWasteKey(wasteType);
  const c = (city && String(city).trim()) || 'Chennai';
  const key = cacheKey(w, c);
  const cached = getCached(key);
  if (cached) {
    return buildResponse(cached, w, quantityTons);
  }

  let searchResults = null;
  try {
    searchResults = await tavilySearch(w, c);
  } catch (err) {
    console.warn('liveMarketPrice: Tavily error', err.message);
  }

  let extracted = null;
  if (searchResults) {
    try {
      extracted = await deepSeekExtract(w, c, searchResults);
    } catch (err) {
      console.warn('liveMarketPrice: DeepSeek error', err.message);
    }
  }

  const sanitized = sanitizeExtracted(extracted, w);
  const response = buildResponse(sanitized, w, quantityTons);
  if (sanitized) setCache(key, sanitized);
  return response;
}

/** Fallback when API fails � always returns valid shape so UI never sees 404. */
export function getLiveMarketPriceFallback(wasteType, city, quantityTons = 1) {
  const w = toWasteKey(wasteType);
  const c = (city && String(city).trim()) || 'Chennai';
  return buildResponse(null, w, quantityTons);
}
