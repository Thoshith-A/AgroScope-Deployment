/**
 * Live Prices — fetch and display live market price (DeepSeek API) for every crop waste type.
 * Uses device location for city; lists all ~30 crop waste types from CROP_WASTE_CONFIG.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Leaf, Loader2, TrendingUp, RefreshCw, MapPin } from "lucide-react";
import { CROP_WASTE_CONFIG } from "@/lib/cropIcons";
import type { CropWasteKey } from "@/lib/cropIcons";

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
const LIVE_PRICES_CACHE_KEY = "agro-live-prices-cache-v1";

const DEFAULT_CITY = "Chennai";

const WASTE_TYPES: { key: CropWasteKey; label: string; icon: string }[] = Object.entries(
  CROP_WASTE_CONFIG
).map(([key, config]) => ({
  key: key as CropWasteKey,
  label: config.label,
  icon: config.emoji,
}));

interface LivePriceRow {
  key: string;
  label: string;
  icon: string;
  pricePerKg: number | null;
  trend: "rising" | "falling" | "stable" | null;
  source: string | null;
  loading: boolean;
  error: string | null;
}

async function reverseGeocodeToCity(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json", "Accept-Language": "en" } }
    );
    const data = await res.json();
    return (
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.state ||
      data?.display_name?.split(",")[0]?.trim() ||
      DEFAULT_CITY
    );
  } catch {
    return DEFAULT_CITY;
  }
}

async function fetchLivePrice(
  wasteType: string,
  city: string
): Promise<{ pricePerKg: number; trend?: string; source?: string }> {
  const params = new URLSearchParams({
    wasteType,
    city,
    quantityTons: "1",
  });
  const url = `${API_BASE.replace(/\/$/, "")}/api/market-price/live?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const pricePerKg =
    typeof json?.pricePerKg === "number"
      ? json.pricePerKg
      : json?.priceRange
        ? (json.priceRange.min + json.priceRange.max) / 2
        : 0;
  return {
    pricePerKg,
    trend: json?.trend ?? "stable",
    source: json?.source ?? "DeepSeek",
  };
}

export default function LivePrices() {
  const navigate = useNavigate();
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [locationStatus, setLocationStatus] = useState<"idle" | "getting" | "done" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [rows, setRows] = useState<LivePriceRow[]>(
    WASTE_TYPES.map((w) => ({
      ...w,
      pricePerKg: null,
      trend: null,
      source: null,
      loading: false,
      error: null,
    }))
  );
  const [refreshing, setRefreshing] = useState(false);

  const applyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location not supported");
      setLocationStatus("error");
      return;
    }
    setLocationStatus("getting");
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const resolvedCity = await reverseGeocodeToCity(lat, lng);
        setCity(resolvedCity);
        setLocationStatus("done");
      },
      (err) => {
        setLocationStatus("error");
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location denied. Using default city."
            : "Could not get location. Using default city."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      const cityToUse = city || DEFAULT_CITY;
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          loading: true,
          error: null,
          // keep last known price while refreshing for instant display
          pricePerKg: r.pricePerKg,
          trend: r.trend,
          source: r.source,
        }))
      );
      const results = await Promise.allSettled(
        WASTE_TYPES.map((w) => fetchLivePrice(w.key, cityToUse))
      );
      const nextRows: LivePriceRow[] = [];
      setRows((prev) =>
        prev.map((r, i) => {
          const result = results[i];
          if (result.status === "fulfilled") {
            const updated: LivePriceRow = {
              ...r,
              loading: false,
              pricePerKg: result.value.pricePerKg,
              trend: (result.value.trend as LivePriceRow["trend"]) ?? "stable",
              source: result.value.source ?? null,
              error: null,
            };
            nextRows.push(updated);
            return updated;
          }
          const errored: LivePriceRow = {
            ...r,
            loading: false,
            error: result.reason?.message ?? "Failed to load",
            pricePerKg: null,
            trend: null,
            source: null,
          };
          nextRows.push(errored);
          return errored;
        })
      );
      try {
        localStorage.setItem(
          LIVE_PRICES_CACHE_KEY,
          JSON.stringify({ city: cityToUse, rows: nextRows, savedAt: Date.now() })
        );
      } catch {
        // ignore cache errors
      }
      if (isRefresh) setRefreshing(false);
    },
    [city]
  );

  useEffect(() => {
    // Hydrate from cache for instant display, if available
    try {
      const raw = localStorage.getItem(LIVE_PRICES_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { city?: string; rows?: LivePriceRow[] };
        if (parsed.city) setCity(parsed.city);
        if (Array.isArray(parsed.rows) && parsed.rows.length === WASTE_TYPES.length) {
          setRows(parsed.rows.map((r, idx) => ({ ...WASTE_TYPES[idx], ...r, loading: false, error: null })));
        }
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  useEffect(() => {
    if (locationStatus === "idle") applyLocation();
  }, [locationStatus, applyLocation]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 max-w-4xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button
              onClick={() => navigate("/home")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="bg-primary rounded-full p-2 shadow-sm">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-wide">AgroScope</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              Live Prices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live market price per kg for all crop waste types
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{city}</span>
              {locationStatus === "getting" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button variant="outline" size="sm" onClick={applyLocation} disabled={locationStatus === "getting"} className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Use my location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh prices
            </Button>
          </div>
        </div>

        {locationError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{locationError}</p>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prices by waste type ({rows.length})</CardTitle>
            <CardDescription>
              Prices are cached for 24 hours. Use Refresh to fetch the latest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0" aria-hidden>
                      {row.icon}
                    </span>
                    <span className="font-medium text-foreground truncate text-sm">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {row.loading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {row.error && !row.loading && (
                      <span className="text-xs text-destructive">{row.error}</span>
                    )}
                    {!row.loading && !row.error && row.pricePerKg != null && (
                      <>
                        <span className="text-base font-semibold text-foreground">
                          ₹{row.pricePerKg.toFixed(2)}/kg
                        </span>
                        {row.trend && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              row.trend === "rising"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : row.trend === "falling"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {row.trend}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
