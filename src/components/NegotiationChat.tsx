import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Volume2, Square } from 'lucide-react';
import { usePriceNegotiation } from '@/hooks/usePriceNegotiation';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import DealCard from './DealCard';
import VoiceInputButton from './VoiceInputButton';
import type { LivePriceResult } from '@/hooks/useLivePrice';
import type { Language } from '@/lib/languages';

const WASTE_LABELS: Record<string, string> = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

const QUICK_CHIPS: Record<string, string[]> = {
  paddy_husk: [
    "What's today's ceiling price?",
    'Find me a biofuel buyer',
    'How much carbon credit will I earn?',
    'Should I sell now or wait?',
  ],
  wheat_straw: [
    "What's the best price this week?",
    'Find biomass buyers',
    'Carbon credit for this lot?',
    'Sell now or hold?',
  ],
  corn_stalks: [
    "Today's market rate?",
    'Biofuel buyers near me',
    'Carbon value?',
    'Negotiate ceiling price',
  ],
  sugarcane_bagasse: [
    "Ceiling price for bagasse?",
    'Paper mill buyers',
    'Carbon bonus?',
    'Best time to sell?',
  ],
  coconut_shells: [
    'Activated carbon buyers near me',
    'Best export price?',
    'Carbon credit?',
    'Ceiling price today?',
  ],
};

const BUYER_PERSONAS = [
  'GreenFuel Industries, Mumbai',
  'BioPackers Pvt Ltd, Pune',
  'Sunrise Bioenergy, Chennai',
  'EcoMart Pvt Ltd, Bengaluru',
  'AgroCycle Ltd, Hyderabad',
];

/** Extract first price range from DeepSeek chat text, e.g. "₹8–₹10 per kg" or "₹8-₹10/kg" → "₹8–₹10/kg" */
function extractPriceRangeFromChat(content: string): string | null {
  if (!content?.trim()) return null;
  // Match ₹X–₹Y or ₹X-₹Y (with optional "per kg" or "/kg" or "per kg")
  const m = content.match(/₹\s*([\d.]+)\s*[–-]\s*₹\s*([\d.]+)(?:\s*(?:per\s*kg|\/kg))?/i);
  if (m) return `₹${m[1]}–₹${m[2]}/kg`;
  // Single price: "₹10 per kg" or "₹10/kg"
  const single = content.match(/₹\s*([\d.]+)(?:\s*(?:per\s*kg|\/kg))?/i);
  if (single) return `₹${single[1]}/kg`;
  return null;
}

export interface NegotiationChatProps {
  wasteType: string;
  quantityTons: number;
  city: string;
  livePriceData: LivePriceResult | null;
  selectedLanguage: Language;
  onApplyDeal: (deal: { agreedPrice: number; buyerName: string; note: string }) => void;
  onMarketPriceFromChat?: (priceLabel: string | null) => void;
}

const AUTO_SPEAK_KEY = 'agroscope_auto_speak';

/** Default: auto-speak ON so farmers hear DeepSeek's answer in their language immediately. */
export default function NegotiationChat({
  wasteType,
  quantityTons,
  city,
  livePriceData,
  selectedLanguage,
  onApplyDeal,
  onMarketPriceFromChat,
}: NegotiationChatProps) {
  const [inputText, setInputText] = useState('');
  const [applied, setApplied] = useState(false);
  const [dealRejected, setDealRejected] = useState(false);
  const [dealBuyerName, setDealBuyerName] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceIsInterim, setVoiceIsInterim] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      const v = sessionStorage.getItem(AUTO_SPEAK_KEY);
      const on = v !== 'false';
      if (v === null) sessionStorage.setItem(AUTO_SPEAK_KEY, 'true');
      return on;
    } catch {
      return true;
    }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  const { speak, stop, isSpeaking } = useTextToSpeech();
  const { state, sendMessage, reset, stopStreaming } = usePriceNegotiation(wasteType, quantityTons, city, {
    livePricePerKg: livePriceData?.pricePerKg ?? null,
    liveTrend: livePriceData?.trend ?? 'stable',
    selectedLanguage: {
      code: selectedLanguage.code,
      name: selectedLanguage.name,
      native: selectedLanguage.native,
    },
  });

  const cropLabel = WASTE_LABELS[wasteType] || wasteType;
  const chips = QUICK_CHIPS[wasteType] || QUICK_CHIPS.paddy_husk;

  useEffect(() => {
    reset();
    initialSentRef.current = false;
    setApplied(false);
    setDealRejected(false);
  }, [wasteType, city, reset]);

  useEffect(() => {
    if (!wasteType || initialSentRef.current) return;
    const openMessage = livePriceData?.pricePerKg != null
      ? `I have ${quantityTons} tons of ${cropLabel} in ${city}. Today's market is ₹${livePriceData.pricePerKg.toFixed(2)}/kg. What price should I ask for and can you find me a buyer at ceiling price?`
      : `I have ${quantityTons} tons of ${cropLabel} in ${city}. What is the current market rate and what price should I ask for?`;
    initialSentRef.current = true;
    sendMessage(openMessage);
  }, [wasteType, city, quantityTons, cropLabel, livePriceData?.pricePerKg, sendMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Push DeepSeek price from latest assistant message to LIVE MARKET PRICE panel
  const lastAssistantContent = state.messages.filter((m) => m.role === 'assistant').pop()?.content ?? '';
  useEffect(() => {
    if (!onMarketPriceFromChat) return;
    const priceLabel = extractPriceRangeFromChat(lastAssistantContent);
    if (priceLabel) onMarketPriceFromChat(priceLabel);
  }, [lastAssistantContent, onMarketPriceFromChat]);

  const lastDealPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.agreedPrice != null) {
      setDealRejected(false);
      if (lastDealPriceRef.current !== state.agreedPrice) {
        lastDealPriceRef.current = state.agreedPrice;
        setDealBuyerName(BUYER_PERSONAS[Math.floor(Math.random() * BUYER_PERSONAS.length)]);
      }
    } else {
      lastDealPriceRef.current = null;
    }
  }, [state.agreedPrice]);

  const handleAcceptDeal = (deal: { agreedPrice: number; buyerName: string; note: string }) => {
    onApplyDeal(deal);
    setApplied(true);
  };

  const handleCounter = () => {
    setDealRejected(true);
    sendMessage('I want a higher price. Justify with market data and give me a counter-offer.');
  };

  const handleRejectDeal = () => {
    setDealRejected(true);
    sendMessage('Reject this offer. Suggest next negotiation tactic.');
  };

  const handleSpeakMessage = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      stop();
      setSpeakingMessageId(null);
      return;
    }
    stop();
    setSpeakingMessageId(messageId);
    speak(content, selectedLanguage.code);
  };

  useEffect(() => {
    if (!isSpeaking) setSpeakingMessageId(null);
  }, [isSpeaking]);

  const handleAutoSpeakToggle = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    try {
      sessionStorage.setItem(AUTO_SPEAK_KEY, next ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  };

  // Auto-speak every AI answer immediately in the selected language so farmers understand DeepSeek
  const lastAssistantIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoSpeak) return;
    const lastAssistant = state.messages.filter((m) => m.role === 'assistant').pop();
    if (!lastAssistant?.content || state.isStreaming) return;
    if (lastAssistantIdRef.current === lastAssistant.id) return;
    lastAssistantIdRef.current = lastAssistant.id;
    speak(lastAssistant.content, selectedLanguage.code);
  }, [autoSpeak, state.messages, state.isStreaming, selectedLanguage.code, speak]);

  const handleVoiceTranscript = (text: string, isFinal: boolean) => {
    setInputText(text);
    setVoiceIsInterim(!isFinal);
  };

  const carbonBonus = Math.round((livePriceData?.carbonValuePerTon ?? 340) * quantityTons);
  const totalValue = state.totalValue ?? (state.agreedPrice != null ? state.agreedPrice * quantityTons * 1000 : 0);
  const buyerName = dealBuyerName || BUYER_PERSONAS[0];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--void)]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {state.messages.length === 0 && state.isStreaming && (
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <span className="arena-live-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
            <span className="text-sm">AgroBot thinking...</span>
            <span className="flex gap-1">
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
            </span>
          </div>
        )}

        {state.messages.map((m) => (
          <motion.div
            key={m.id}
            className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {m.role === 'assistant' && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg bg-[var(--crop-green)]/20 border border-[var(--crop-green)]/40"
              >
                🌾
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-[var(--crop-green)]/20 border border-[var(--crop-green)]/40 text-[var(--text-primary)]'
                  : 'bg-[var(--field)] border border-white/10 text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {m.content
                    ? m.content
                    : state.isStreaming && m.role === 'assistant'
                      ? (
                          <span className="inline-flex gap-1">
                            <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
                            <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
                            <span className="arena-typing-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
                          </span>
                        )
                      : null}
                  {m.agreedPrice != null && (
                    <div className="mt-2 text-xs text-[var(--crop-green)]">{`💰 Agreed: ₹${m.agreedPrice}/kg`}</div>
                  )}
                </div>
                {m.role === 'assistant' && m.content && (
                  <button
                    type="button"
                    onClick={() => handleSpeakMessage(m.id, m.content ?? '')}
                    className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--crop-green)] transition-colors"
                    aria-label={speakingMessageId === m.id ? 'Stop speaking' : 'Speak message'}
                  >
                    {speakingMessageId === m.id ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {state.error && (
        <div className="shrink-0 px-5 pb-2 text-sm text-[var(--danger)]">{state.error}</div>
      )}

      {state.agreedPrice != null && !applied && !dealRejected && (
        <div className="shrink-0 px-5 pb-4">
          <DealCard
            agreedPrice={state.agreedPrice}
            quantityTons={quantityTons}
            marketPosition={state.marketPosition ?? 'at'}
            marketPct={state.marketPct}
            totalValue={Math.round(totalValue)}
            carbonBonus={carbonBonus}
            buyerName={buyerName}
            onAccept={handleAcceptDeal}
            onCounter={handleCounter}
            onReject={handleRejectDeal}
          />
        </div>
      )}

      {(!state.agreedPrice || applied || dealRejected) && (
        <>
          <div className="shrink-0 px-5 pb-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAutoSpeakToggle}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  autoSpeak
                    ? 'border-[var(--crop-green)]/50 text-[var(--crop-green)] bg-[var(--crop-green)]/10'
                    : 'border-white/20 text-[var(--text-muted)] hover:bg-white/5'
                }`}
              >
                🔊 Auto-speak: {autoSpeak ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setSpeakingMessageId(null);
                }}
                disabled={!isSpeaking}
                className="text-xs font-medium px-2.5 py-1 rounded-full border border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                aria-label="Stop talking"
              >
                <Square className="h-3.5 w-3.5" />
                Stop talking
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
            {chips.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => sendMessage(label)}
                disabled={state.isStreaming}
                className="rounded-full px-3 py-1.5 text-xs font-medium border border-[var(--crop-green)]/40 text-[var(--crop-green)] hover:bg-[var(--crop-green)]/10 transition-colors disabled:opacity-50"
              >
                {label}
              </button>
            ))}
            </div>
          </div>
          <div className="shrink-0 flex gap-2 p-5 border-t border-white/10">
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
                    setVoiceIsInterim(false);
                  }
                }
              }}
              placeholder={
                isVoiceListening
                  ? 'Listening... speak now 🎤'
                  : `Type or speak in ${selectedLanguage.native}...`
              }
              className={`flex-1 rounded-xl border border-[var(--crop-green)]/30 bg-[var(--field)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--crop-green)]/50 ${isVoiceListening && voiceIsInterim ? 'italic text-[var(--text-muted)]' : ''}`}
              disabled={state.isStreaming}
            />
            <VoiceInputButton
              selectedLanguage={selectedLanguage}
              onTranscript={handleVoiceTranscript}
              onSend={(text) => {
                sendMessage(text);
                setInputText('');
                setVoiceIsInterim(false);
              }}
              onListeningChange={setIsVoiceListening}
              disabled={state.isStreaming}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--crop-green)]/30 bg-[var(--field)] text-[var(--crop-green)] hover:bg-[var(--crop-green)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => {
                if (state.isStreaming) {
                  stopStreaming();
                  setVoiceIsInterim(false);
                  return;
                }
                if (inputText.trim()) {
                  sendMessage(inputText.trim());
                  setInputText('');
                  setVoiceIsInterim(false);
                }
              }}
              disabled={!state.isStreaming && !inputText.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--crop-green)] text-[var(--void)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={state.isStreaming ? 'Stop response' : 'Send message'}
            >
              {state.isStreaming ? <Square className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
