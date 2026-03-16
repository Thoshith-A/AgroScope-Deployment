import { motion } from "framer-motion";
import { ShieldCheck, Star, Sparkles } from "lucide-react";

export type LoyaltyTier = "A" | "B" | "C";

interface TierBadgeProps {
  tier: LoyaltyTier;
  className?: string;
  showLabel?: boolean;
}

const tierConfig = {
  A: {
    name: "Tier A (Elite)",
    icon: Star,
    container:
      "bg-gradient-to-br from-amber-50 via-amber-100 to-green-50 border-amber-200 text-amber-900 shadow-lg shadow-amber-300/60",
    ring: "ring-2 ring-amber-300/90",
    glow: "drop-shadow-[0_0_14px_rgba(240,165,0,0.45)]",
  },
  B: {
    name: "Tier B (Established)",
    icon: ShieldCheck,
    container:
      "bg-gradient-to-br from-green-50 via-white to-green-100 border-green-200 text-green-900 shadow-lg shadow-green-200/55",
    ring: "ring-2 ring-green-200/95",
    glow: "drop-shadow-[0_0_10px_rgba(82,183,136,0.35)]",
  },
  C: {
    name: "Tier C (Emerging)",
    icon: Sparkles,
    container:
      "bg-gradient-to-br from-white to-green-50 border-green-400 text-green-900 shadow-md shadow-green-200/50",
    ring: "ring-1 ring-green-300",
    glow: "drop-shadow-[0_0_8px_rgba(116,198,157,0.25)]",
  },
};

export default function TierBadge({ tier, className = "", showLabel = true }: TierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.C;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.container} ${config.ring} ${config.glow} ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-semibold tracking-wide">{showLabel ? config.name : `Tier ${tier}`}</span>
    </motion.div>
  );
}
