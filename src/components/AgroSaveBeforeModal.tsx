import { useMemo } from "react";
import { motion } from "framer-motion";

export interface AgroSaveProvision {
  wasteType: string;
  wasteTypeLabel: string;
  quantityTons: number;
  location: string;
  farmerName?: string;
}

interface AgroSaveBeforeModalProps {
  provision: AgroSaveProvision;
  onContinue: () => void;
  isPosting?: boolean;
  canContinue?: boolean;
}

function getPreventedCo2(quantityTons: number): number {
  return quantityTons * 1.4;
}

export default function AgroSaveBeforeModal({
  provision,
  onContinue,
  isPosting = true,
  canContinue = false,
}: AgroSaveBeforeModalProps) {
  const co2 = useMemo(() => getPreventedCo2(provision.quantityTons), [provision.quantityTons]);

  const rows = [
    {
      icon: "🔥",
      label: "Field burning",
      value: `Releasing ${co2.toFixed(1)}t CO2 into atmosphere`,
    },
    {
      icon: "💸",
      label: "No earnings",
      value: "INR 0 earned - waste left to rot",
    },
    {
      icon: "🌾",
      label: "Biomass loss",
      value: `${provision.quantityTons}t of ${provision.wasteTypeLabel} going to waste`,
    },
    {
      icon: "❌",
      label: "Market disconnect",
      value: "No buyer. No network. No value.",
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
          <p className="text-xs uppercase tracking-widest text-amber-400" style={{ fontFamily: "Syne, sans-serif" }}>
            Before AgroSave
          </p>

          <h2 className="mt-2 text-3xl font-bold text-[#111111] md:text-4xl" style={{ fontFamily: "Syne, sans-serif" }}>
            Your Waste. Reimagined.
          </h2>

          <p className="mt-2 text-base text-[#1f2937]" style={{ fontFamily: "DM Sans, sans-serif" }}>
            This is the current path your crop residue is taking before AgroSave.
          </p>

          <div className="my-4 border-t border-green-500/10" />

          <div className="space-y-3">
            {rows.map((row, index) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, ease: "easeOut" }}
                className="flex items-start gap-3 rounded-lg border-l-2 border-amber-500 bg-amber-700/25 p-3"
              >
                <span className="mt-0.5 text-amber-500">{row.icon}</span>
                <div>
                  <p className="text-sm font-medium text-amber-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {row.label}
                  </p>
                  <p className="text-xs text-amber-800" style={{ fontFamily: "DM Mono, monospace" }}>
                    {row.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-[#1f2937]" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <span>Connecting to AgroNetwork...</span>
              <span style={{ fontFamily: "DM Mono, monospace" }}>{isPosting ? "Syncing" : "Ready"}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                style={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5, ease: "linear" }}
                className="h-1 rounded-full bg-green-600"
              />
            </div>
          </div>

          <button
            onClick={onContinue}
            disabled={isPosting || !canContinue}
            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50 hover:bg-green-700 active:scale-95"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {isPosting ? "Saving to Network..." : "Continue to Impact"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
