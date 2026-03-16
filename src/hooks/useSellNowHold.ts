import { useState, useCallback, useEffect } from 'react';

export interface ChartPoint {
  label: string;
  value: number;
  type: 'actual' | 'projected';
}

export interface SellNowHoldResult {
  recommendation: 'sell_now' | 'hold';
  confidence: number;
  reason: string;
  chartData: ChartPoint[];
}

export function useSellNowHold(wasteType: string, city: string) {
  const [data, setData] = useState<SellNowHoldResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!wasteType?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        wasteType: wasteType.trim(),
        city: (city || 'Chennai').trim(),
      });
      const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? '';
      const res = await fetch(`${base}/api/market-price/sell-now-hold?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as SellNowHoldResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analysis');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wasteType, city]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
