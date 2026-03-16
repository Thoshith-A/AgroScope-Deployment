export interface WeatherDay {
  date: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  extrapolated: boolean;
}

export interface WeatherForecastResponse {
  city: string;
  wasteType: string;
  generatedAt: string;
  dataSource: string;
  forecast: WeatherDay[];
}

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Delhi: { lat: 28.6139, lon: 77.209 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Surat: { lat: 21.1702, lon: 72.8311 },
};

async function fetchOpenMeteoDirect(
  city: string,
  wasteType: string
): Promise<WeatherForecastResponse> {
  const coords = CITY_COORDS[city];
  if (!coords) throw new Error(`Unknown city: ${city}`);

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,` +
    `relative_humidity_2m_max,windspeed_10m_max,weathercode` +
    `&timezone=Asia%2FKolkata&forecast_days=16`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo request failed");
  const raw = (await res.json()) as {
    daily?: {
      time: string[];
      temperature_2m_max?: (number | null)[];
      temperature_2m_min?: (number | null)[];
      precipitation_sum?: (number | null)[];
      relative_humidity_2m_max?: (number | null)[];
      windspeed_10m_max?: (number | null)[];
      weathercode?: (number | null)[];
    };
  };

  const daily = raw.daily;
  if (!daily?.time?.length) throw new Error("Invalid Open-Meteo response");

  const realDays: WeatherDay[] = daily.time.map((date, i) => ({
    date,
    dayLabel: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
    tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 30),
    tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 22),
    rainfall: Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
    humidity: Math.round(daily.relative_humidity_2m_max?.[i] ?? 65),
    windSpeed: Math.round(daily.windspeed_10m_max?.[i] ?? 12),
    weatherCode: daily.weathercode?.[i] ?? 1,
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
  const extrapolated: WeatherDay[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const v = Math.sin(i * 1.7 + 0.5) * 0.12;
    return {
      date: d.toISOString().split("T")[0],
      dayLabel: d.toLocaleDateString("en-IN", { weekday: "short" }),
      tempMax: Math.round(avg.tempMax * (1 + v * 0.5)),
      tempMin: Math.round(avg.tempMin * (1 + v * 0.3)),
      rainfall: Math.max(0, Math.round(avg.rainfall * (1 + v) * 10) / 10),
      humidity: Math.min(
        95,
        Math.max(35, Math.round(avg.humidity * (1 + v * 0.2)))
      ),
      windSpeed: Math.round(avg.windSpeed * (1 + Math.abs(v) * 0.3)),
      weatherCode: avg.rainfall > 10 ? 61 : 1,
      extrapolated: true,
    };
  });

  return {
    city,
    wasteType,
    generatedAt: new Date().toISOString(),
    dataSource: "Open-Meteo (open-meteo.com)",
    forecast: [...realDays, ...extrapolated],
  };
}

async function fetchOpenMeteoByCoords(
  lat: number,
  lon: number,
  wasteType: string,
  lang: string = "en"
): Promise<WeatherForecastResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,` +
    `relative_humidity_2m_max,windspeed_10m_max,weathercode` +
    `&timezone=auto&forecast_days=16`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo request failed");
  const raw = (await res.json()) as {
    daily?: {
      time: string[];
      temperature_2m_max?: (number | null)[];
      temperature_2m_min?: (number | null)[];
      precipitation_sum?: (number | null)[];
      relative_humidity_2m_max?: (number | null)[];
      windspeed_10m_max?: (number | null)[];
      weathercode?: (number | null)[];
    };
    timezone?: string;
  };

  const daily = raw.daily;
  if (!daily?.time?.length) throw new Error("Invalid Open-Meteo response");
  const locale = lang && lang.length >= 2 ? lang : "en";

  const realDays: WeatherDay[] = daily.time.map((date, i) => ({
    date,
    dayLabel: new Date(date).toLocaleDateString(locale, { weekday: "short" }),
    tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 30),
    tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 22),
    rainfall: Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
    humidity: Math.round(daily.relative_humidity_2m_max?.[i] ?? 65),
    windSpeed: Math.round(daily.windspeed_10m_max?.[i] ?? 12),
    weatherCode: daily.weathercode?.[i] ?? 1,
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
  const extrapolated: WeatherDay[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const v = Math.sin(i * 1.7 + 0.5) * 0.12;
    return {
      date: d.toISOString().split("T")[0],
      dayLabel: d.toLocaleDateString(locale, { weekday: "short" }),
      tempMax: Math.round(avg.tempMax * (1 + v * 0.5)),
      tempMin: Math.round(avg.tempMin * (1 + v * 0.3)),
      rainfall: Math.max(0, Math.round(avg.rainfall * (1 + v) * 10) / 10),
      humidity: Math.min(
        95,
        Math.max(35, Math.round(avg.humidity * (1 + v * 0.2)))
      ),
      windSpeed: Math.round(avg.windSpeed * (1 + Math.abs(v) * 0.3)),
      weatherCode: avg.rainfall > 10 ? 61 : 1,
      extrapolated: true,
    };
  });

  return {
    city: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    wasteType,
    generatedAt: new Date().toISOString(),
    dataSource: "Open-Meteo (open-meteo.com)",
    forecast: [...realDays, ...extrapolated],
  };
}

export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string;
  country_code: string;
}

export async function getGeocodeSuggestions(
  query: string,
  lang: string = "en"
): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];
  const base = import.meta.env.VITE_API_URL ?? "";
  const url = `${base}/api/weather-forecast/geocode?q=${encodeURIComponent(query.trim())}&lang=${encodeURIComponent(lang)}&count=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Backend geocode failed (${res.status})`);
    const data = (await res.json()) as { results?: GeocodeResult[] };
    if (data.results?.length) return data.results;
  } catch {
    // fallback to direct Open-Meteo geocoding when backend is unavailable
  }

  try {
    const directUrl =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(query.trim())}` +
      `&count=10&language=${encodeURIComponent(lang)}`;
    const res = await fetch(directUrl);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id?: number;
        name?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        country?: string;
        country_code?: string;
      }>;
    };
    return (data.results ?? [])
      .filter((r) => r.name && r.latitude != null && r.longitude != null)
      .map((r, index) => ({
        id: r.id ?? index + 1,
        name: r.name as string,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        timezone: r.timezone ?? "UTC",
        country: r.country ?? "",
        country_code: r.country_code ?? "",
      }));
  } catch {
    return [];
  }
}

export async function getWeatherForecast({
  city,
  place,
  lat,
  lon,
  wasteType,
  lang,
}: {
  city?: string;
  place?: string;
  lat?: number;
  lon?: number;
  wasteType: string;
  lang?: string;
}): Promise<WeatherForecastResponse> {
  const base = import.meta.env.VITE_API_URL ?? "";
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const params = new URLSearchParams();
  params.set("wasteType", wasteType);
  if (lang) params.set("lang", lang);
  // When user searched a place, send only place so backend uses geocode for that location
  if (place) {
    params.set("place", place);
  } else if (city) {
    params.set("city", city);
  } else if (lat == null || lon == null) {
    params.set("city", "Chennai");
  }
  if (lat != null) params.set("lat", String(lat));
  if (lon != null) params.set("lon", String(lon));

  const apiUrl = `${base}/api/weather-forecast/forecast?${params.toString()}`;

  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) return res.json() as Promise<WeatherForecastResponse>;
    const errBody = await res.json().catch(() => ({}));
    const msg = (errBody && typeof errBody.error === "string") ? errBody.error : `Request failed (${res.status})`;
    throw new Error(msg);
  } catch (e) {
    // If coordinates are available, always fallback directly by coords (global support).
    if (lat != null && lon != null) {
      return fetchOpenMeteoByCoords(lat, lon, wasteType, lang);
    }
    if (e instanceof Error && e.message !== "Failed to fetch" && !e.message.startsWith("Request failed")) throw e;
    if (place) throw e; // don't fall back to Indian cities when user searched a place
    const fallbackCity = city || "Chennai";
    return fetchOpenMeteoDirect(fallbackCity, wasteType);
  }
}
