import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Square } from 'lucide-react';
import { usePriceNegotiation } from '@/hooks/usePriceNegotiation';

export const AGRO_COLORS = {
  deep: '#0a1a0f',
  soil: '#0f2318',
  leaf: '#22c55e',
  leafDim: '#16a34a',
  gold: '#f59e0b',
  danger: '#ef4444',
  text: '#dcfce7',
  textDim: '#9ca3af',
  muted: '#6b7280',
  glass: 'rgba(34,197,94,0.06)',
  border: 'rgba(34,197,94,0.15)',
};

export const WASTE_LABELS: Record<string, string> = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

export interface PriceNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  wasteType: string;
  quantityTons: number;
  city: string;
  onApplyPrice: (price: number) => void;
}

export default function PriceNegotiationModal({
  isOpen,
  onClose,
  wasteType,
  quantityTons,
  city,
  onApplyPrice,
}: PriceNegotiationModalProps) {
  const { state, fetchMarketPrice, sendMessage, reset, stopStreaming } = usePriceNegotiation(
    wasteType,
    quantityTons,
    city
  );
  const [inputText, setInputText] = useState('');
  const [applied, setApplied] = useState(false);
  const [dealRejected, setDealRejected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  const wasteLabel = WASTE_LABELS[wasteType] || wasteType;

  useEffect(() => {
    if (!isOpen) return;
    reset();
    setApplied(false);
    setDealRejected(false);
    initialSentRef.current = false;
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      await fetchMarketPrice();
      if (cancelled) return;
      if (!initialSentRef.current) {
        initialSentRef.current = true;
        sendMessage(
          `I have ${quantityTons} tons of ${wasteLabel} in ${city}. What is the current market rate and what price should I ask for?`
        );
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, fetchMarketPrice, sendMessage, quantityTons, wasteLabel, city]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.messages.length]);

  useEffect(() => {
    if (state.agreedPrice != null) setDealRejected(false);
  }, [state.agreedPrice]);

  const handleAccept = () => {
    if (state.agreedPrice == null) return;
    onApplyPrice(state.agreedPrice);
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleRejectDeal = () => {
    setDealRejected(true);
    sendMessage('I want a better price. Justify higher with more market data.');
  };

  if (!isOpen) return null;

  const market = state.marketPrice;
  const gaugePct =
    market && market.max > market.min
      ? Math.min(100, Math.max(0, ((market.current - market.min) / (market.max - market.min)) * 100))
      : 50;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,0,0,0.85)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="flex h-full w-full max-h-[100vh] max-w-6xl flex-col overflow-hidden rounded-none sm:rounded-2xl border border-green-500/20 bg-[#0a1a0f] shadow-2xl"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '100vh' }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            style={{ borderColor: AGRO_COLORS.border }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🌾</span>
              <h2 className="font-bold text-[#dcfce7]" style={{ fontFamily: 'Sora, sans-serif' }}>
                AI Price Negotiation
              </h2>
              <span
                className="agro-live-dot ml-1 h-2 w-2 rounded-full bg-green-500"
                title="Live market data"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#9ca3af] hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Two-column layout */}
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Left — Price Intelligence */}
            <div
              className="w-full shrink-0 border-b sm:border-b-0 sm:border-r sm:w-[300px] flex flex-col p-4 gap-4 overflow-y-auto"
              style={{ borderColor: AGRO_COLORS.border, background: AGRO_COLORS.glass }}
            >
              <div className="flex items-center gap-2">
                <span className="agro-live-dot h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400">
                  Live market intel
                </span>
              </div>

              {state.isLoadingMarket && !market ? (
                <div className="flex items-center gap-2 text-[#9ca3af]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading market price…</span>
                </div>
              ) : market ? (
                <>
                  <div
                    className="rounded-xl border p-4 agro-price-value"
                    style={{ borderColor: AGRO_COLORS.leaf, background: AGRO_COLORS.soil }}
                  >
                    <div className="text-xs uppercase tracking-wider text-[#9ca3af] mb-1">
                      Market price today
                    </div>
                    <div
                      className="text-3xl font-extrabold text-[#dcfce7]"
                      style={{ fontFamily: 'Sora, sans-serif' }}
                    >
                      ₹{market.current.toFixed(2)}/kg
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="agro-gauge-fill h-full rounded-full bg-green-500"
                        style={{ width: `${gaugePct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-[#9ca3af]">
                      <span>₹{market.min} min</span>
                      <span>₹{market.max} max</span>
                    </div>
                  </div>

                  {state.marketPosition && (
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        state.marketPosition === 'above'
                          ? 'border-green-500/50 text-green-400'
                          : state.marketPosition === 'below'
                            ? 'border-red-500/50 text-red-400'
                            : 'border-amber-500/50 text-amber-400'
                      }`}
                    >
                      {state.marketPosition === 'above' && '▲ '}
                      {state.marketPosition === 'below' && '▼ '}
                      {state.marketPosition === 'at' && '● '}
                      {state.marketPct != null && state.marketPosition !== 'at' && `${state.marketPct}% `}
                      {state.marketPosition.toUpperCase()} MARKET
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/5 p-2">
                      <div className="text-[#9ca3af] text-xs">Total value</div>
                      <div className="font-semibold text-[#dcfce7]">
                        {state.totalValue != null
                          ? `₹${state.totalValue.toLocaleString()}`
                          : state.agreedPrice != null
                            ? `₹${(state.agreedPrice * quantityTons * 1000).toLocaleString()}`
                            : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                      <div className="text-[#9ca3af] text-xs">Carbon bonus</div>
                      <div className="font-semibold text-green-400">
                        +₹{(0.34 * quantityTons * 1000).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-[#9ca3af]">
                    Trend: {market.trend === 'rising' ? '📈 RISING' : market.trend === 'falling' ? '📉 FALLING' : '➡️ STABLE'}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {market.source === 'live' ? '🟢 Live APMC data' : '🟡 Historical data'}
                  </div>
                </>
              ) : state.error ? (
                <p className="text-sm text-red-400">{state.error}</p>
              ) : null}
            </div>

            {/* Right — Chat */}
            <div className="flex min-h-0 flex-1 flex-col bg-[#0f2318]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {state.messages.length === 0 && state.isStreaming && (
                  <div className="flex items-center gap-2 text-[#9ca3af]">
                    <span className="text-2xl">🌾</span>
                    <span className="text-sm">Connecting to market intelligence…</span>
                  </div>
                )}
                {state.messages.map((m) => (
                  <motion.div
                    key={m.id}
                    className={`agro-message-enter flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {m.role === 'assistant' && (
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                        style={{ background: `linear-gradient(135deg, ${AGRO_COLORS.leafDim}, ${AGRO_COLORS.leaf})` }}
                      >
                        🌾
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-green-800 to-green-900 text-white'
                          : 'bg-white/5 text-[#dcfce7] border border-white/10'
                      }`}
                    >
                      {m.content || (state.isStreaming && m.role === 'assistant' ? (
                        <span className="inline-flex gap-1">
                          <span className="agro-typing-dot h-2 w-2 rounded-full bg-green-500" />
                          <span className="agro-typing-dot h-2 w-2 rounded-full bg-green-500" />
                          <span className="agro-typing-dot h-2 w-2 rounded-full bg-green-500" />
                        </span>
                      ) : null)}
                      {m.agreedPrice != null && (
                        <div className="mt-2 rounded-lg bg-green-500/20 px-2 py-1 text-xs font-medium text-green-300">
                          💰 Agreed: ₹{m.agreedPrice}/kg
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {state.error && (
                <div className="shrink-0 px-4 pb-2 text-sm text-red-400">{state.error}</div>
              )}

              {/* Deal panel */}
              {state.agreedPrice != null && !applied && !dealRejected && (
                <motion.div
                  className="agro-message-enter shrink-0 border-t px-4 py-4"
                  style={{ borderColor: AGRO_COLORS.border, background: AGRO_COLORS.glass }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="font-semibold text-[#dcfce7] mb-1">
                    💰 Negotiated price: ₹{state.agreedPrice.toFixed(2)}/kg
                  </div>
                  <div className="text-xs text-[#9ca3af] mb-3">
                    {state.marketPct != null && state.marketPosition === 'above' && `${state.marketPct}% above market`}
                    {state.marketPct != null && state.marketPosition === 'below' && `${state.marketPct}% below market`}
                    {state.marketPosition === 'at' && 'At market rate'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRejectDeal}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                    >
                      ✗ Reject, negotiate more
                    </button>
                    <button
                      type="button"
                      onClick={handleAccept}
                      className="agro-accept-pulse rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors"
                      style={{
                        background: `linear-gradient(135deg, ${AGRO_COLORS.leafDim}, ${AGRO_COLORS.leaf})`,
                        boxShadow: '0 0 20px rgba(34,197,94,0.4)',
                      }}
                    >
                      ✓ Accept & apply to form
                    </button>
                  </div>
                </motion.div>
              )}

              {applied && state.agreedPrice != null && (
                <motion.div
                  className="shrink-0 border-t px-4 py-4"
                  style={{ borderColor: AGRO_COLORS.leaf, background: 'rgba(34,197,94,0.15)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="font-semibold text-green-400">
                    ✅ ₹{state.agreedPrice.toFixed(2)}/kg applied to your listing!
                  </div>
                </motion.div>
              )}

              {(!state.agreedPrice || applied || dealRejected) && (
                <div className="shrink-0 flex gap-2 p-4 border-t" style={{ borderColor: AGRO_COLORS.border }}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim() && !state.isStreaming) {
                          sendMessage(inputText.trim());
                          setInputText('');
                        }
                      }
                    }}
                    placeholder="Ask for a better price or more details…"
                    className="flex-1 rounded-full border bg-[#0a1a0f] px-4 py-3 text-sm text-[#dcfce7] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    style={{ borderColor: AGRO_COLORS.border }}
                    disabled={state.isStreaming}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (state.isStreaming) {
                        stopStreaming();
                        return;
                      }
                      if (inputText.trim()) {
                        sendMessage(inputText.trim());
                        setInputText('');
                      }
                    }}
                    disabled={!state.isStreaming && !inputText.trim()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        state.isStreaming || inputText.trim()
                          ? `linear-gradient(135deg, ${AGRO_COLORS.leafDim}, ${AGRO_COLORS.leaf})`
                          : '#374151',
                    }}
                    aria-label={state.isStreaming ? 'Stop response' : 'Send message'}
                  >
                    {state.isStreaming ? (
                      <Square className="h-5 w-5" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
