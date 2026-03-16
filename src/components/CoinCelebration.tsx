import { useEffect } from "react";
import { motion } from "framer-motion";
import { useWalletOptional } from "@/context/WalletContext";

const COIN_VALUE_RUPEE = 950;

export default function CoinCelebration() {
  const wallet = useWalletOptional();
  if (!wallet) return null;

  const { lastEarned, clearLastEarned, creditsToNextCoin } = wallet;

  useEffect(() => {
    if (!lastEarned) return;
    const isCoin = lastEarned.coinsEarned > 0;
    const t = setTimeout(clearLastEarned, isCoin ? 4000 : 3000);
    return () => clearTimeout(t);
  }, [lastEarned, clearLastEarned]);

  if (!lastEarned) return null;

  const isCoin = lastEarned.coinsEarned > 0;

  if (isCoin) {
    return (
      <motion.div
        initial={{ x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 120, opacity: 0 }}
        transition={{ type: "tween", duration: 0.3 }}
        onClick={clearLastEarned}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && clearLastEarned()}
        className="fixed top-20 right-6 z-[10000] w-[320px] cursor-pointer rounded-2xl border border-[rgba(0,200,83,0.4)] p-5 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
          boxShadow: "0 8px 32px rgba(0,200,83,0.3)",
        }}
      >
        <div className="text-center text-5xl">🪙</div>
        <h3 className="mt-2 text-center text-lg font-bold text-white">Agro Coin Earned!</h3>
        <div className="my-2 border-t border-white/20" />
        <p className="text-center text-sm text-white/95">
          You converted 1,000 AgroCredits into {lastEarned.coinsEarned} Agro Coin
          {lastEarned.coinsEarned > 1 ? "s" : ""}. 🎉
        </p>
        <div className="mt-2 border-t border-white/20" />
        <p className="mt-2 text-center text-lg font-bold text-white">
          Total: {lastEarned.coinsEarned} 🪙 Agro Coin{lastEarned.coinsEarned > 1 ? "s" : ""}
        </p>
        <p className="text-center text-xs text-amber-200">
          Worth approx. ₹{lastEarned.coinsEarned * COIN_VALUE_RUPEE} market value
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ type: "tween", duration: 0.25 }}
      onClick={clearLastEarned}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && clearLastEarned()}
      className="fixed bottom-24 right-6 z-[10000] w-[260px] cursor-pointer rounded-xl border border-[rgba(0,200,83,0.3)] bg-[#0F2318] px-4 py-3"
    >
      <p className="font-semibold text-green-400">✅ +{lastEarned.creditsEarned} AgroCredits Earned</p>
      <p className="mt-1 text-xs text-green-300/90">{creditsToNextCoin} credits to next coin 🪙</p>
    </motion.div>
  );
}
