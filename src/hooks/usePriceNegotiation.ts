import { useState, useCallback, useRef } from 'react';

export interface MarketPrice {
  min: number;
  current: number;
  max: number;
  trend: 'rising' | 'falling' | 'stable';
  source: 'live' | 'historical';
}

export interface NegotiationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agreedPrice?: number;
}

interface NegotiationState {
  messages: NegotiationMessage[];
  marketPrice: MarketPrice | null;
  agreedPrice: number | null;
  marketPosition: 'above' | 'below' | 'at' | null;
  marketPct: number | null;
  totalValue: number | null;
  isLoadingMarket: boolean;
  isStreaming: boolean;
  error: string | null;
}

const initialState: NegotiationState = {
  messages: [],
  marketPrice: null,
  agreedPrice: null,
  marketPosition: null,
  marketPct: null,
  totalValue: null,
  isLoadingMarket: false,
  isStreaming: false,
  error: null,
};

export interface SelectedLanguageForApi {
  code: string;
  name: string;
  native: string;
}

export function usePriceNegotiation(
  wasteType: string,
  quantityTons: number,
  city: string,
  options?: {
    livePricePerKg?: number | null;
    liveTrend?: 'rising' | 'falling' | 'stable';
    selectedLanguage?: SelectedLanguageForApi | null;
  }
) {
  const [state, setState] = useState<NegotiationState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<NegotiationMessage[]>([]);
  messagesRef.current = state.messages;
  const livePricePerKg = options?.livePricePerKg ?? null;
  const liveTrend = options?.liveTrend ?? 'stable';
  const selectedLanguage = options?.selectedLanguage ?? null;

  const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? '';
  const fetchMarketPrice = useCallback(async (): Promise<MarketPrice | null> => {
    setState((s) => ({ ...s, isLoadingMarket: true, error: null }));
    try {
      const res = await fetch(
        `${apiBase}/api/price-negotiation/market-price?wasteType=${encodeURIComponent(wasteType)}&city=${encodeURIComponent(city)}`
      );
      const data: MarketPrice = await res.json();
      setState((s) => ({ ...s, marketPrice: data, isLoadingMarket: false }));
      return data;
    } catch {
      setState((s) => ({ ...s, isLoadingMarket: false, error: 'Could not fetch market data' }));
      return null;
    }
  }, [wasteType, city, apiBase]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMsg: NegotiationMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: userText,
        timestamp: new Date(),
      };
      const assistantId = `a-${Date.now() + 1}`;

      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          userMsg,
          { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ],
        isStreaming: true,
        error: null,
      }));

      const messagesToSend = [...messagesRef.current, userMsg].filter((m) => m.id !== assistantId);
      const body = {
        messages: messagesToSend.map((m) => ({ role: m.role, content: m.content })),
        wasteType,
        quantityTons,
        city,
        ...(livePricePerKg != null && livePricePerKg > 0 && { livePricePerKg, liveTrend }),
        ...(selectedLanguage && {
          selectedLanguage: {
            code: selectedLanguage.code,
            name: selectedLanguage.name,
            native: selectedLanguage.native,
          },
        }),
      };

      try {
        abortRef.current = new AbortController();
        const res = await fetch(`${apiBase}/api/price-negotiation/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortRef.current.signal,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setState((s) => ({ ...s, isStreaming: false }));
          return;
        }

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of lines) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              fullContent += token;
              setState((s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ),
              }));
            } catch {
              /* skip malformed SSE chunks */
            }
          }
        }

        const jsonMatch = fullContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            const priceData = JSON.parse(jsonMatch[1]);
            const cleanContent = fullContent.replace(/```json[\s\S]*?```/g, '').trim();
            setState((s) => ({
              ...s,
              agreedPrice: priceData.agreedPrice ?? null,
              marketPosition: priceData.marketPosition ?? null,
              marketPct: priceData.marketPct ?? null,
              totalValue: priceData.totalValue ?? null,
              isStreaming: false,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: cleanContent, agreedPrice: priceData.agreedPrice }
                  : m
              ),
            }));
            return;
          } catch {
            /* fall through */
          }
        }

        setState((s) => ({ ...s, isStreaming: false }));
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState((s) => ({
            ...s,
            isStreaming: false,
            error: err.message || 'Connection lost. Please check your network and retry.',
          }));
        }
      }
    },
    [wasteType, quantityTons, city, livePricePerKg, liveTrend, selectedLanguage, apiBase]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  const stopStreaming = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  return { state, fetchMarketPrice, sendMessage, reset, stopStreaming };
}
