/**
 * 30-day supply forecast via DeepSeek API. Cache 30 min per (wasteType, city, quantity).
 * Key: process.env.DEEPSEEK_API_KEY
 */
import fetch from 'node-fetch';
import { getFallbackForecast } from './forecastFallback.js';

const VALID_WASTE = new Set(['paddy_husk', 'wheat_straw', 'corn_stalks', 'sugarcane_bagasse', 'coconut_shells']);
const VALID_CITIES = new Set([
  'Chennai', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
]);

const BASE_SUPPLY = {
  paddy_husk: { daily: 3060, unit: 'kg', season: 'post-kharif' },
  wheat_straw: { daily: 2200, unit: 'kg', season: 'rabi-harvest' },
  corn_stalks: { daily: 1800, unit: 'kg', season: 'kharif' },
  sugarcane_bagasse: { daily: 4100, unit: 'kg', season: 'crushing' },
  coconut_shells: { daily: 980, unit: 'kg', season: 'year-round' },
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

function cacheKey(wasteType, city, quantityTons) {
  const dateKey = new Date().toISOString().slice(0, 13);
  return `${wasteType}|${city}|${quantityTons}|${dateKey}`;
}

async function generate30DayForecast(wasteType, city, quantityTons) {
  const today = new Date();
  const month = today.toLocaleString('en-IN', { month: 'long' });
  const year = today.getFullYear();
  const base = BASE_SUPPLY[wasteType] || BASE_SUPPLY.paddy_husk;
  const farmerQuantityKg = quantityTons * 1000;
  const label = (wasteType || '').replace(/_/g, ' ');
  const day1Date = new Date(today);
  const peakHint = 8 + (wasteType.length % 10);

  const prompt = `You are an Indian agricultural commodity supply forecasting expert with deep knowledge of crop residue markets across Indian states.

TODAY: ${today.toDateString()}
CROP RESIDUE: ${wasteType} (label: ${label})
CITY: ${city}, India
FARMER QUANTITY: ${farmerQuantityKg} kg (${quantityTons} tons)
SEASON: ${month} ${year}, ${base.season} season
BASE DAILY SUPPLY for ${city}: ~${base.daily} kg/day

Generate a precise 30-day supply forecast for ${wasteType} in ${city}.
Consider:
1. Current month (${month}) seasonal patterns for this crop in India
2. Post-harvest timing, monsoon effects, local demand cycles
3. The farmer's specific quantity (${farmerQuantityKg}kg) as a data point
4. City-specific industrial demand (biofuel plants, paper mills, etc.)
5. Recent market activity typical for ${month} in ${city}

Return ONLY this exact JSON, no markdown, no explanation:
{
  "predictedTotalKg": <number: total 30-day supply in kg, realistic>,
  "confidencePercent": <number: 0-100, based on seasonal certainty>,
  "trend": "RISING"|"FALLING"|"STABLE"|"VOLATILE",
  "trendReason": "<string: 1 sentence why>",
  "peakDay": <number: 1-30>,
  "peakReason": "<string: why day X peaks>",
  "dailyForecast": [
    {"day": 1, "date": "${day1Date.toLocaleDateString('en-IN')}", "forecastKg": <number>, "upperBoundKg": <number>, "lowerBoundKg": <number>, "note": ""},
    ... repeat for all 30 days. Start near base, rise to peak around day ${peakHint}, gentle decline. Add ±5-8% daily variance. Weekends (6,7,13,14,20,21,27,28) slightly lower (-8%). Never below 60% or above 150% of base.
  ],
  "insight": "<string: 2 sentences actionable intelligence>",
  "bestSellWindow": "<string: e.g. Days 8-14 — peak demand>",
  "priceImpact": "positive"|"negative"|"neutral"
}`;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { ...getFallbackForecast(wasteType, city, quantityTons), source: 'fallback' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.warn('DeepSeek forecast API error:', response.status, errText);
      return { ...getFallbackForecast(wasteType, city, quantityTons), source: 'fallback' };
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed.dailyForecast) || parsed.dailyForecast.length < 30) {
      return { ...getFallbackForecast(wasteType, city, quantityTons), source: 'fallback' };
    }

    const dailyForecast = parsed.dailyForecast.slice(0, 30).map((d, i) => ({
      day: d.day ?? i + 1,
      date: d.date || new Date(today.getTime() + ((d.day ?? i + 1) - 1) * 86400000).toLocaleDateString('en-IN'),
      forecastKg: Number(d.forecastKg) || 0,
      upperBoundKg: Number(d.upperBoundKg) || 0,
      lowerBoundKg: Number(d.lowerBoundKg) || 0,
      note: String(d.note || ''),
    }));

    const sumKg = dailyForecast.reduce((s, d) => s + (d.forecastKg || 0), 0);
    const fallback = getFallbackForecast(wasteType, city, quantityTons);

    return {
      predictedTotalKg: Number(parsed.predictedTotalKg) || sumKg || fallback.predictedTotalKg,
      confidencePercent: Math.min(100, Math.max(0, Number(parsed.confidencePercent) || 75)),
      trend: ['RISING', 'FALLING', 'STABLE', 'VOLATILE'].includes(parsed.trend) ? parsed.trend : 'STABLE',
      trendReason: String(parsed.trendReason || fallback.trendReason).trim() || fallback.trendReason,
      peakDay: Math.min(30, Math.max(1, Number(parsed.peakDay) || 11)),
      peakReason: String(parsed.peakReason || fallback.peakReason).trim() || fallback.peakReason,
      bestSellWindow: String(parsed.bestSellWindow || fallback.bestSellWindow).trim() || fallback.bestSellWindow,
      insight: String(parsed.insight || fallback.insight).trim() || fallback.insight,
      priceImpact: ['positive', 'negative', 'neutral'].includes(parsed.priceImpact) ? parsed.priceImpact : 'neutral',
      dailyForecast,
      source: 'deepseek',
    };
  } catch (err) {
    clearTimeout(timeout);
    console.warn('DeepSeek forecast error:', err.message);
    return { ...getFallbackForecast(wasteType, city, quantityTons), source: 'fallback' };
  }
}

export async function getCachedForecast(wasteType, city, quantityTons) {
  const w = String(wasteType || 'paddy_husk').trim().toLowerCase();
  const c = String(city || 'Chennai').trim();
  const q = Math.max(0.1, Number(quantityTons) || 1);
  const key = cacheKey(w, c, q);
  if (cache.has(key)) {
    const cached = cache.get(key);
    return { ...cached, fromCache: true, generatedAt: cached.generatedAt };
  }
  const result = await generate30DayForecast(w, c, q);
  const generatedAt = new Date().toISOString();
  cache.set(key, { ...result, generatedAt });
  return { ...result, fromCache: false, generatedAt };
}

export function validateForecastParams(wasteType, city, quantity) {
  const w = String(wasteType || '').trim().toLowerCase();
  const c = String(city || 'Chennai').trim();
  const q = Number(quantity);
  if (!VALID_WASTE.has(w)) return { valid: false, wasteType: 'paddy_husk', city: c, quantityTons: 1 };
  if (!VALID_CITIES.has(c)) return { valid: false, wasteType: w, city: 'Chennai', quantityTons: 1 };
  if (Number.isNaN(q) || q <= 0) return { valid: false, wasteType: w, city: c, quantityTons: 1 };
  return { valid: true, wasteType: w, city: c, quantityTons: Math.min(100, q) };
}
