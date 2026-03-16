/**
 * Nearest Cold Storage Hub detection using OpenStreetMap Nominatim API.
 * No API key required; free and hackathon-safe.
 */

// Fixed cold storage hub coordinates (lat, lon)
const COLD_STORAGE_HUBS = [
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Pune', lat: 18.5204, lon: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { name: 'Surat', lat: 21.1702, lon: 72.8311 },
];

// Fallback when API fails or location invalid (per spec)
const FALLBACK_HUB = 'Chennai';
const FALLBACK_DISTANCE_KM = 40;

/**
 * Haversine formula: distance in km between two (lat, lon) points.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Geocode location string to { lat, lon } using Nominatim.
 * Returns null on failure, timeout, or invalid response.
 */
export async function geocodeWithNominatim(location) {
  const q = String(location || '').trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q: q + ', India',
    format: 'json',
    limit: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AgroScope-Hackathon/1.0 (contact@agroscope.demo)',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    return { lat, lon };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Check if location string matches a hub name (case-insensitive).
 * Returns that hub with 0 km so we don't call Nominatim for hub cities.
 */
function matchHubByName(location) {
  const q = String(location || '').trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const hub = COLD_STORAGE_HUBS.find((h) => h.name.toLowerCase() === lower);
  return hub ? { hubName: hub.name, distanceKm: 0 } : null;
}

/**
 * Get nearest cold storage hub and approximate distance in km.
 * - If location matches a hub name exactly → that hub, 0 km (no external API).
 * - Else geocode via Nominatim, then Haversine to nearest hub.
 * - On API failure or invalid location: returns Chennai, 40 km.
 */
export async function getNearestHub(location) {
  const direct = matchHubByName(location);
  if (direct) return direct;

  const coords = await geocodeWithNominatim(location).catch(() => null);

  if (!coords) {
    return {
      hubName: FALLBACK_HUB,
      distanceKm: FALLBACK_DISTANCE_KM,
    };
  }

  let minKm = Infinity;
  let nearest = COLD_STORAGE_HUBS[0];

  for (const hub of COLD_STORAGE_HUBS) {
    const km = haversineKm(coords.lat, coords.lon, hub.lat, hub.lon);
    if (km < minKm) {
      minKm = km;
      nearest = hub;
    }
  }

  return {
    hubName: nearest.name,
    distanceKm: Math.round(minKm * 10) / 10,
  };
}
