import { useState, useCallback, useEffect } from 'react';

export interface LivePriceResult {
  pricePerKg: number;
  priceRange: { min: number; max: number };
  trend: 'rising' | 'falling' | 'stable';
  confidence: 'high' | 'medium' | 'low';
  source: string;
  lastUpdated: string;
  carbonValuePerTon: number;
  totalLotValue: number;
}

export function useLivePrice(wasteType: string, city: string, quantityTons: number = 1) {
  const [data, setData] = useState<LivePriceResult | null>(null);
  const [loading, setLoading] = useState(!!wasteType?.trim());
  const [error, setError] = useState<string | null>(null);

  const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '';
  const fetchLive = useCallback(async () => {
    if (!wasteType?.trim()) return;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const params = new URLSearchParams({
        wasteType: wasteType.trim(),
        city: (city || 'Chennai').trim(),
        quantityTons: String(quantityTons),
      });
      const url = `${base.replace(/\/$/, '')}/api/market-price/live?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const pricePerKg = typeof json?.pricePerKg === 'number' ? json.pricePerKg : (json?.priceRange ? (json.priceRange.min + json.priceRange.max) / 2 : 0);
      setData({ ...json, pricePerKg } as LivePriceResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load live price');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wasteType, city, quantityTons]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  return { data, loading, error, refetch: fetchLive };
}
