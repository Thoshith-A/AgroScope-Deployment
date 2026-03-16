import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const CACHE = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

const CITY_COORDS = {
  Chennai: { lat: 13.0827, lon: 80.2707, timezone: "Asia/Kolkata" },
  Mumbai: { lat: 19.076, lon: 72.8777, timezone: "Asia/Kolkata" },
  Delhi: { lat: 28.6139, lon: 77.209, timezone: "Asia/Kolkata" },
  Bengaluru: { lat: 12.9716, lon: 77.5946, timezone: "Asia/Kolkata" },
  Hyderabad: { lat: 17.385, lon: 78.4867, timezone: "Asia/Kolkata" },
  Kolkata: { lat: 22.5726, lon: 88.3639, timezone: "Asia/Kolkata" },
  Pune: { lat: 18.5204, lon: 73.8567, timezone: "Asia/Kolkata" },
  Ahmedabad: { lat: 23.0225, lon: 72.5714, timezone: "Asia/Kolkata" },
  Jaipur: { lat: 26.9124, lon: 75.7873, timezone: "Asia/Kolkata" },
  Surat: { lat: 21.1702, lon: 72.8311, timezone: "Asia/Kolkata" },
};

const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1/search";

router.get("/geocode", async (req, res) => {
  const q = (req.query.q || req.query.name || "").trim();
  const lang = (req.query.lang || "en").toLowerCase();
  const count = Math.min(100, Math.max(1, parseInt(req.query.count, 10) || 10));
  if (q.length < 2) return res.json({ results: [] });
  try {
    const url = `${GEOCODE_BASE}?name=${encodeURIComponent(q)}&count=${count}&language=${encodeURIComponent(lang)}`;
    const geoRes = await fetch(url);
    if (!geoRes.ok) return res.status(geoRes.status).json({ results: [] });
    const data = await geoRes.json();
    const results = (data.results || []).map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone || "UTC",
      country: r.country,
      country_code: r.country_code,
    }));
    return res.json({ results });
  } catch (err) {
    console.error("[WeatherForecast] geocode error:", err.message);
    return res.status(500).json({ results: [] });
  }
});

async function resolveCoordsAndTimezone(city, place, lat, lon) {
  if (lat != null && lon != null) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (Number.isFinite(latNum) && Number.isFinite(lonNum))
      return { lat: latNum, lon: lonNum, timezone: "auto", displayName: `${latNum.toFixed(2)}, ${lonNum.toFixed(2)}` };
  }
  // Prefer place (search) over city so "Himalaya" / any location works
  if (place && String(place).trim().length >= 2) {
    const url = `${GEOCODE_BASE}?name=${encodeURIComponent(String(place).trim())}&count=5`;
    const geoRes = await fetch(url);
    if (geoRes.ok) {
      const data = await geoRes.json();
      const r = data.results && data.results[0];
      if (r)
        return {
          lat: r.latitude,
          lon: r.longitude,
          timezone: r.timezone || "UTC",
          displayName: `${r.name}${r.country ? `, ${r.country}` : ""}`,
        };
    }
  }
  const known = city ? CITY_COORDS[city] : null;
  if (known) return { lat: known.lat, lon: known.lon, timezone: known.timezone, displayName: city };
  return null;
}

router.get("/forecast", async (req, res) => {
  const { city, place, lat, lon, wasteType = "paddy_husk", lang = "en" } = req.query;
  const resolved = await resolveCoordsAndTimezone(city, place, lat, lon);
  if (!resolved) {
    return res.status(400).json({
      error: "Provide a city (e.g. Chennai), place (e.g. London), or lat & lon for anywhere in the world.",
    });
  }
  const { lat: latitude, lon: longitude, timezone, displayName } = resolved;
  const cacheKey = `${latitude}_${longitude}_${new Date().toDateString()}`;

  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (Date.now() < cached.expiresAt) {
      const data = { ...cached.data, city: displayName };
      return res.json(data);
    }
    CACHE.delete(cacheKey);
  }

  try {
    const tzParam = timezone === "auto" ? "auto" : encodeURIComponent(timezone);
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,` +
      `relative_humidity_2m_max,windspeed_10m_max,weathercode` +
      `&timezone=${tzParam}&forecast_days=16`;

    const omRes = await fetch(url);
    if (!omRes.ok) throw new Error(`Open-Meteo error: ${omRes.status}`);
    const raw = await omRes.json();

    const locale = lang && String(lang).length >= 2 ? String(lang).toLowerCase() : "en";
    const realDays = raw.daily.time.map((date, i) => ({
      date,
      dayLabel: new Date(date).toLocaleDateString(locale, { weekday: "short" }),
      tempMax: Math.round(raw.daily.temperature_2m_max[i] ?? 30),
      tempMin: Math.round(raw.daily.temperature_2m_min[i] ?? 22),
      rainfall: Math.round((raw.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      humidity: Math.round(raw.daily.relative_humidity_2m_max[i] ?? 65),
      windSpeed: Math.round(raw.daily.windspeed_10m_max[i] ?? 12),
      weatherCode: raw.daily.weathercode[i] ?? 1,
      extrapolated: false,
    }));

    const avg = {
      tempMax: realDays.reduce((s, d) => s + d.tempMax, 0) / realDays.length,
      tempMin: realDays.reduce((s, d) => s + d.tempMin, 0) / realDays.length,
      rainfall: realDays.reduce((s, d) => s + d.rainfall, 0) / realDays.length,
      humidity: realDays.reduce((s, d) => s + d.humidity, 0) / realDays.length,
      windSpeed: realDays.reduce((s, d) => s + d.windSpeed, 0) / realDays.length,
    };

    const lastDate = new Date(realDays[realDays.length - 1].date);
    const extrapolated = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      const v = Math.sin(i * 1.7 + 0.5) * 0.12;
      return {
        date: d.toISOString().split("T")[0],
        dayLabel: d.toLocaleDateString(locale, { weekday: "short" }),
        tempMax: Math.round(avg.tempMax * (1 + v * 0.5)),
        tempMin: Math.round(avg.tempMin * (1 + v * 0.3)),
        rainfall: Math.max(0, Math.round(avg.rainfall * (1 + v) * 10) / 10),
        humidity: Math.min(95, Math.max(35, Math.round(avg.humidity * (1 + v * 0.2)))),
        windSpeed: Math.round(avg.windSpeed * (1 + Math.abs(v) * 0.3)),
        weatherCode: avg.rainfall > 10 ? 61 : 1,
        extrapolated: true,
      };
    });

    const data = {
      city: displayName,
      wasteType,
      generatedAt: new Date().toISOString(),
      dataSource: "Open-Meteo (open-meteo.com)",
      forecast: [...realDays, ...extrapolated],
    };

    CACHE.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
    res.json(data);
  } catch (err) {
    console.error("[WeatherForecast]", err.message);
    res.status(500).json({ error: "Failed to fetch weather data. Try again shortly." });
  }
});

export default router;
