/**
 * Deterministic 30-day forecast fallback when DeepSeek is slow or down.
 */

const BASE_SUPPLY = {
  paddy_husk: { daily: 3060 },
  wheat_straw: { daily: 2200 },
  corn_stalks: { daily: 1800 },
  sugarcane_bagasse: { daily: 4100 },
  coconut_shells: { daily: 980 },
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getFallbackForecast(wasteType, city, quantityTons) {
  const base = BASE_SUPPLY[wasteType] || BASE_SUPPLY.paddy_husk;
  const baseKg = base.daily;
  const today = new Date();
  const peakDay = 8 + Math.floor(seededRandom(wasteType.length + city.length) * 10);

  const dailyForecast = [];
  for (let day = 1; day <= 30; day++) {
    const t = (day - peakDay) / 8;
    const curve = 1 + 0.15 * Math.sin(day / 4) - 0.08 * t * t;
    const variance = 0.92 + seededRandom(day * 7) * 0.16;
    const forecastKg = Math.round(baseKg * curve * variance);
    const band = 0.15;
    const upperBoundKg = Math.round(forecastKg * (1 + band));
    const lowerBoundKg = Math.round(forecastKg * (1 - band));
    const d = new Date(today);
    d.setDate(d.getDate() + day - 1);
    dailyForecast.push({
      day,
      date: d.toLocaleDateString('en-IN'),
      forecastKg,
      upperBoundKg,
      lowerBoundKg,
      note: day === peakDay ? 'Peak' : '',
    });
  }

  const predictedTotalKg = dailyForecast.reduce((s, d) => s + d.forecastKg, 0);
  const trend = quantityTons > 2 ? 'RISING' : quantityTons < 1 ? 'FALLING' : 'STABLE';

  return {
    predictedTotalKg,
    confidencePercent: 72,
    trend,
    trendReason: 'Statistical estimate based on seasonal patterns.',
    peakDay,
    peakReason: 'Mid-period demand cycle.',
    bestSellWindow: `Days ${Math.max(1, peakDay - 3)}–${Math.min(30, peakDay + 3)}`,
    insight: 'Sell within the best window for optimal price. Consider local mill demand.',
    priceImpact: 'neutral',
    dailyForecast,
    source: 'fallback',
  };
}
