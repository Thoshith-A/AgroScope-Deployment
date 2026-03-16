// API client for Agro News Live - same-origin in prod, Vite proxy in dev
const base = (import.meta.env.VITE_API_URL as string) ?? "";

function toUrl(path: string): string {
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

export interface AgriNewsItem {
  id: string;
  title?: string;
  headline: string;
  summary: string;
  category:
    | "Crop Production"
    | "Agricultural Waste"
    | "Farming Technology"
    | "Market Trends"
    | "Government Policy"
    | "Climate Impact";
  region: string;
  sentiment: "Positive" | "Neutral" | "Negative" | string;
  source?: string;
  location?: string;
  impactScore?: number;
  opportunityAlert?: string | null;
  timestamp?: number;
  tags?: string[];
  url?: string;
  published_date?: string;
  snippet?: string;
  isLive?: boolean;
}

function normalizeNewsItem(item: AgriNewsItem): AgriNewsItem {
  const publishedDate = item.published_date || new Date(item.timestamp || Date.now()).toISOString();
  return {
    ...item,
    title: item.title || item.headline,
    headline: item.headline || item.title || 'Untitled',
    source: item.source || item.location || 'Unknown Source',
    location: item.location || item.source || 'Unknown Source',
    impactScore: item.impactScore ?? 6,
    opportunityAlert: item.opportunityAlert ?? null,
    published_date: publishedDate,
    timestamp: item.timestamp || new Date(publishedDate).getTime(),
    tags: item.tags || []
  };
}

export interface LocationInfo {
  city: string;
  state: string;
  country: string;
  region: string;
  coordinates: { lat: number; lng: number };
  agricultureRegion?: string;
  insight?: string;
}

export interface GlobalNewsResponse {
  success: boolean;
  count: number;
  news: AgriNewsItem[];
  timestamp: number;
  cached?: boolean;
}

export interface LocationNewsResponse {
  success: boolean;
  location: LocationInfo;
  news: AgriNewsItem[];
  count: number;
  timestamp: number;
  cached?: boolean;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
}

export interface TrendingNewsResponse {
  success: boolean;
  topics: TrendingTopic[];
  timestamp: number;
  cached?: boolean;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface RegionOption {
  value: string;
  label: string;
}

export async function fetchGlobalAgriNews(params?: {
  category?: string;
  region?: string;
  limit?: number;
}): Promise<GlobalNewsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set("category", params.category);
  if (params?.region) queryParams.set("region", params.region);
  if (params?.limit) queryParams.set("limit", String(params.limit ?? 15));
  const path = `/api/agri-news/global${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
  const response = await fetch(toUrl(path), { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`Failed to fetch global news: ${response.statusText}`);
  const data = (await response.json()) as GlobalNewsResponse;
  if (!Array.isArray(data.news)) data.news = [];
  data.news = data.news.map(normalizeNewsItem);
  return data;
}

export async function fetchLocationAgriNews(lat: number, lng: number, limit = 15): Promise<LocationNewsResponse> {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng), limit: String(limit) });
  const response = await fetch(toUrl(`/api/agri-news/location?${query.toString()}`), {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error(`Failed to fetch location news: ${response.statusText}`);
  const data = (await response.json()) as LocationNewsResponse;
  if (!Array.isArray(data.news)) data.news = [];
  data.news = data.news.map(normalizeNewsItem);
  return data;
}

export async function fetchTrendingAgriNews(topics = 8): Promise<TrendingNewsResponse> {
  const response = await fetch(toUrl(`/api/agri-news/trending?topics=${encodeURIComponent(String(topics))}`), {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error(`Failed to fetch trending news: ${response.statusText}`);
  return response.json();
}

// Backward-compatible names used by existing components.
export const getGlobalAgriNews = fetchGlobalAgriNews;
export async function getLocationAgriNews(params: { latitude: number; longitude: number; radius?: number }) {
  return fetchLocationAgriNews(params.latitude, params.longitude);
}

export async function getAgriNewsCategories(): Promise<{ success: boolean; categories: CategoryOption[] }> {
  return {
    success: true,
    categories: [
      { value: "all", label: "All Categories" },
      { value: "Crop Production", label: "Crop Production" },
      { value: "Agricultural Waste", label: "Agricultural Waste" },
      { value: "Farming Technology", label: "Farming Technology" },
      { value: "Market Trends", label: "Market Trends" },
      { value: "Government Policy", label: "Government Policy" },
      { value: "Climate Impact", label: "Climate Impact" },
    ],
  };
}

export async function getAgriNewsRegions(): Promise<{ success: boolean; regions: RegionOption[] }> {
  return {
    success: true,
    regions: [
      { value: "all", label: "All Regions" },
      { value: "India", label: "India" },
      { value: "Asia", label: "Asia" },
      { value: "Global", label: "Global" }
    ]
  };
}

export async function getLiveAgriNewsUpdate(): Promise<{ success: boolean; news: AgriNewsItem }> {
  const response = await fetch(toUrl(`/api/agri-news/live`), { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("Failed to fetch live update");
  const data = (await response.json()) as { success: boolean; news: AgriNewsItem };
  return { ...data, news: normalizeNewsItem(data.news) };
}
