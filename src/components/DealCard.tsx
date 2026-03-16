import { motion } from 'framer-motion';

const BUYER_PERSONAS = [
  'GreenFuel Industries, Mumbai',
  'BioPackers Pvt Ltd, Pune',
  'Sunrise Bioenergy, Chennai',
  'EcoMart Pvt Ltd, Bengaluru',
  'AgroCycle Ltd, Hyderabad',
];

export interface DealCardProps {
  agreedPrice: number;
  quantityTons: number;
  marketPosition: 'above' | 'below' | 'at';
  marketPct?: number | null;
  totalValue: number;
  carbonBonus: number;
  buyerName: string;
  onAccept: (deal: { agreedPrice: number; buyerName: string; note: string }) => void;
  onCounter: () => void;
  onReject: () => void;
}

export default function DealCard({
  agreedPrice,
  quantityTons,
  marketPosition,
  marketPct,
  totalValue,
  carbonBonus,
  buyerName,
  onAccept,
  onCounter,
  onReject,
}: DealCardProps) {
  const buyer = buyerName || BUYER_PERSONAS[Math.floor(Math.random() * BUYER_PERSONAS.length)];

  return (
    <motion.div
      className="rounded-xl border-2 border-[var(--crop-green)]/40 bg-[var(--field)] p-5 shadow-xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className="text-sm font-semibold text-[var(--text-muted)] mb-3">🤝 DEAL OFFER</div>
      <div className="text-[var(--text-primary)] font-medium">Buyer: {buyer}</div>
      <div className="mt-1 text-lg font-display text-[var(--crop-green)]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
        ₹{agreedPrice.toFixed(2)}/kg
        {marketPosition === 'above' && <span className="ml-2 text-sm text-[var(--safe)]">(above market ✅)</span>}
        {marketPosition === 'below' && <span className="ml-2 text-sm text-[var(--danger)]">(below market)</span>}
        {marketPosition === 'at' && <span className="ml-2 text-sm text-[var(--neutral)]">(at market)</span>}
      </div>
      <div className="mt-2 text-sm text-[var(--text-muted)]">
        Total: ₹{totalValue.toLocaleString()} for {quantityTons}t
      </div>
      <div className="mt-1 text-sm text-[var(--crop-green)]">Carbon bonus: ₹{carbonBonus.toLocaleString()}</div>
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => onAccept({ agreedPrice, buyerName: buyer, note: 'Deal via AgroBot' })}
          className="flex-1 rounded-lg py-2.5 font-semibold text-[var(--void)] bg-[var(--crop-green)] hover:opacity-95 transition-opacity shadow-lg shadow-[var(--crop-green)]/30"
        >
          ✅ ACCEPT — Apply to Form
        </button>
        <button
          type="button"
          onClick={onCounter}
          className="flex-1 rounded-lg py-2.5 font-medium text-[var(--text-primary)] border border-[var(--harvest)]/50 bg-[var(--harvest)]/10 hover:bg-[var(--harvest)]/20 transition-colors"
        >
          💬 Counter Offer
        </button>
        <button
          type="button"
          onClick={onReject}
          className="flex-1 rounded-lg py-2.5 font-medium text-[var(--danger)] border border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 transition-colors"
        >
          ❌ Reject — Keep Negotiating
        </button>
      </div>
    </motion.div>
  );
}
