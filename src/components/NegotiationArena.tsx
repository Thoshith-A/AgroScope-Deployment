import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, BarChart3, ExternalLink } from 'lucide-react';
import { useLivePrice } from '@/hooks/useLivePrice';
import { useToast } from '@/hooks/use-toast';
import PriceOracle from './PriceOracle';
import NegotiationChat from './NegotiationChat';
import LanguageSelector, { getDefaultLanguage } from './LanguageSelector';
import type { Language } from '@/lib/languages';

const LANG_STORAGE_KEY = 'agroscope_lang';

function wasteTypeLabelToKey(label: string): string {
  const map: Record<string, string> = {
    'Paddy Husk': 'paddy_husk',
    'Wheat Straw': 'wheat_straw',
    'Corn Stalks': 'corn_stalks',
    'Sugarcane Bagasse': 'sugarcane_bagasse',
    'Coconut Shells': 'coconut_shells',
  };
  return map[label] ?? label.replace(/\s+/g, '_').toLowerCase() ?? 'paddy_husk';
}

export interface NegotiationArenaProps {
  wasteType: string;
  quantityTons: number;
  city: string;
  farmerPricePerKg?: number | null;
  onApplyDeal: (deal: { agreedPrice: number; buyerName: string; note: string }) => void;
  onClose: () => void;
}

export default function NegotiationArena({
  wasteType,
  quantityTons,
  city,
  farmerPricePerKg,
  onApplyDeal,
  onClose,
}: NegotiationArenaProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: livePriceData } = useLivePrice(wasteType, city, quantityTons);
  const [chatMarketPriceLabel, setChatMarketPriceLabel] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguageState] = useState<Language>(() => {
    if (typeof sessionStorage === 'undefined') return getDefaultLanguage();
    try {
      const saved = sessionStorage.getItem(LANG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Language;
        if (parsed?.code) return parsed;
      }
    } catch {
      /* ignore */
    }
    return getDefaultLanguage();
  });

  const setSelectedLanguage = useCallback((lang: Language) => {
    setSelectedLanguageState(lang);
    try {
      sessionStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(lang));
    } catch {
      /* ignore */
    }
    toast({
      title: 'Language set',
      description: `${lang.native} ${lang.name} ${lang.flag}`,
      variant: 'default',
    });
  }, [toast]);

  const handleForecastClick = () => {
    const wasteKey = wasteTypeLabelToKey(wasteType);
    const params = new URLSearchParams({
      wasteType: wasteKey,
      city: city || 'Chennai',
      quantity: String(quantityTons || 1),
    });
    onClose();
    navigate(`/forecast?${params.toString()}`);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setChatMarketPriceLabel(null);
  }, [wasteType, city]);

  return (
    <div
      className="negotiation-arena fixed inset-0 z-50 flex flex-col bg-[var(--void)]"
      style={{ background: 'var(--void)' }}
    >
      <div className="arena-grain absolute inset-0 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,127,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,127,0.02)_1px,transparent_1px)] bg-[size_24px_24px] pointer-events-none opacity-60" aria-hidden />

      <header className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <h1 className="font-display text-2xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            NEGOTIATION ARENA
          </h1>
          <span className="arena-live-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" title="Live" />
        </div>
        <LanguageSelector selected={selectedLanguage} onChange={setSelectedLanguage} />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        <motion.aside
          className="w-full sm:w-[40%] min-w-0 flex flex-col border-r border-white/10 bg-[var(--field)]"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="shrink-0 px-4 pt-3 pb-3 border-b border-white/10 bg-[var(--field)]">
            <button
              type="button"
              onClick={handleForecastClick}
              onMouseEnter={() => {
                try {
                  const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? '';
                  fetch(
                    `${apiBase}/api/forecast/ai-30days?wasteType=${encodeURIComponent(wasteTypeLabelToKey(wasteType))}&city=${encodeURIComponent(city || 'Chennai')}&quantity=${encodeURIComponent(String(quantityTons || 1))}`
                  ).catch(() => {});
                } catch (_) {}
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--crop-green)',
                color: '#0a1a0f',
              }}
              title="View full 30-day supply forecast"
            >
              <BarChart3 className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              <span>View Full Forecast</span>
              <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>
          </div>
          <PriceOracle
            wasteType={wasteType}
            city={city}
            quantityTons={quantityTons}
            farmerPricePerKg={farmerPricePerKg}
            chatMarketPriceLabel={chatMarketPriceLabel}
          />
        </motion.aside>

        <motion.section
          className="flex-1 min-w-0 flex flex-col"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        >
          <NegotiationChat
            wasteType={wasteType}
            quantityTons={quantityTons}
            city={city}
            livePriceData={livePriceData ?? null}
            selectedLanguage={selectedLanguage}
            onMarketPriceFromChat={setChatMarketPriceLabel}
            onApplyDeal={(deal) => {
              onApplyDeal(deal);
              setTimeout(onClose, 1200);
            }}
          />
        </motion.section>
      </div>
    </div>
  );
}
