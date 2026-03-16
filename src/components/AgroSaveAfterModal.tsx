import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { AgroSaveProvision } from "./AgroSaveBeforeModal";

interface AgroSaveAfterModalProps {
  provision: AgroSaveProvision;
  /** Optional: use farmer's actual price for earnings when set */
  pricePerKg?: number | null;
  /** When set, show these wallet-earned values instead of formula-based credits */
  creditsEarned?: number | null;
  coinsEarned?: number | null;
  onViewInventory?: () => void;
  onShare?: () => void;
}

function getPreventedCo2(quantityTons: number): number {
  return quantityTons * 1.4;
}

function getEstimatedEarnings(wasteType: string, quantityTons: number): number {
  const basePerTon = 5000;
  const multipliers: Record<string, number> = {
    paddy_husk: 1.0,
    wheat_straw: 0.95,
    corn_stalks: 1.1,
    sugarcane_bagasse: 1.2,
    coconut_shells: 1.3,
  };
  const multiplier = multipliers[wasteType] || 1.0;
  return quantityTons * basePerTon * multiplier;
}

/** 1 tree equivalent = 1 AgroCredit. Trees = CO2 saved (t) × 50. */
function getAgroCreditsFromTrees(co2Tons: number): number {
  return Math.round(co2Tons * 50);
}

function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatTons(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

const PLATFORM_TOTAL_KEY = "agro_platform_tons";

export default function AgroSaveAfterModal({
  provision,
  pricePerKg,
  creditsEarned: creditsEarnedProp,
  coinsEarned: coinsEarnedProp,
  onViewInventory,
  onShare,
}: AgroSaveAfterModalProps) {
  const co2 = useMemo(() => getPreventedCo2(provision.quantityTons), [provision.quantityTons]);
  const earningsFromFormula = useMemo(
    () => getEstimatedEarnings(provision.wasteType, provision.quantityTons),
    [provision.quantityTons, provision.wasteType],
  );
  const earnings = useMemo(() => {
    if (pricePerKg != null && pricePerKg > 0) {
      return provision.quantityTons * 1000 * pricePerKg;
    }
    return earningsFromFormula;
  }, [pricePerKg, provision.quantityTons, earningsFromFormula]);
  const creditsFromFormula = useMemo(
    () => getAgroCreditsFromTrees(co2),
    [co2],
  );
  const credits =
    creditsEarnedProp != null
      ? creditsEarnedProp
      : creditsFromFormula;
  const displayCredits = creditsEarnedProp != null ? creditsEarnedProp : creditsFromFormula;

  const [animatedCredits, setAnimatedCredits] = useState(0);
  const [platformTotal, setPlatformTotal] = useState(provision.quantityTons);

  useEffect(() => {
    const previous = Number(window.localStorage.getItem(PLATFORM_TOTAL_KEY) || "0");
    const nextTotal = previous + provision.quantityTons;
    window.localStorage.setItem(PLATFORM_TOTAL_KEY, nextTotal.toFixed(1));
    setPlatformTotal(nextTotal);
  }, [provision.quantityTons]);

  useEffect(() => {
    const durationMs = 1200;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const next = Math.round(displayCredits * progress);
      setAnimatedCredits(next);
      if (progress >= 1) {
        window.clearInterval(interval);
      }
    }, 20);

    return () => window.clearInterval(interval);
  }, [displayCredits]);

  const rows = [
    {
      label: "SDG 13 - Climate Action",
      value: `${co2.toFixed(1)}t CO2eq PREVENTED`,
    },
    {
      label: "SDG 1 - No Poverty",
      value: `INR ${formatIndianCurrency(earnings)} unlocked for you`,
    },
    {
      label: "SDG 12 - Responsible Consumption",
      value: `${formatTons(provision.quantityTons)}t ${provision.wasteTypeLabel} repurposed`,
    },
    {
      label: "SDG 15 - Life on Land",
      value: "Zero field burning",
    },
    {
      label: "SDG 8 - Decent Work",
      value: "Fair market price secured",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex min-h-screen w-full items-center justify-center bg-white px-4 py-6 md:px-6"
      >
        <div className="w-full max-w-lg rounded-2xl border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.12))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45),inset_0_0_22px_rgba(255,255,255,0.22)] backdrop-blur-[14px] md:p-8">
          <p className="text-xs uppercase tracking-widest text-green-600" style={{ fontFamily: "Syne, sans-serif" }}>
            After AgroSave
          </p>

          <h2 className="mt-2 text-3xl font-bold text-[#111111] md:text-4xl" style={{ fontFamily: "Syne, sans-serif" }}>
            Welcome to the Network.
          </h2>

          <p className="mt-2 text-base text-[#1f2937]" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Your crop waste now drives earnings, climate action, and circular value.
          </p>

          <div className="my-4 border-t border-green-500/10" />

          <div className="space-y-3">
            {rows.map((row, index) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, ease: "easeOut" }}
                className="flex items-start gap-3 rounded-lg border-l-2 border-green-600 bg-green-700/20 p-3"
              >
                <span className="mt-0.5 text-green-600">✅</span>
                <div>
                  <p className="text-sm font-medium text-emerald-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {row.label}
                  </p>
                  <p className="text-xs text-emerald-800" style={{ fontFamily: "DM Mono, monospace" }}>
                    {row.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, ease: "easeOut" }}
            className="mt-6 rounded-xl border border-green-500/30 bg-green-50/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700/70" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  AgroCredits Earned
                </p>
                <p className="text-2xl font-bold text-green-700" style={{ fontFamily: "Syne, sans-serif" }}>
                  +{animatedCredits}
                </p>
                {coinsEarnedProp != null && coinsEarnedProp > 0 && (
                  <p className="mt-1 text-base font-semibold text-amber-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    🪙 +{coinsEarnedProp} Agro Coin{coinsEarnedProp > 1 ? "s" : ""}!
                  </p>
                )}
              </div>
              <div className="text-3xl">🎉</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, ease: "easeOut" }}
            className="mt-4 flex items-center justify-between rounded-lg bg-amber-50/50 px-4 py-3"
          >
            <div>
              <p className="text-xs text-amber-700/70" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Network Total
              </p>
              <p className="text-lg font-semibold text-amber-900" style={{ fontFamily: "Syne, sans-serif" }}>
                {formatTons(platformTotal)}t saved
              </p>
            </div>
            <div className="text-2xl">🌍</div>
          </motion.div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onViewInventory}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition-opacity hover:bg-green-700 active:scale-95"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              View Inventory
            </button>
            <button
              onClick={onShare}
              className="flex-1 rounded-lg border border-green-600 px-4 py-2.5 font-medium text-green-600 transition-colors hover:bg-green-50 active:scale-95"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Share Impact
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
