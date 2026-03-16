import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getWallet, earnCredits } from "@/lib/api";
import type { WalletTransaction } from "@/lib/api";

export interface EarnResult {
  creditsEarned: number;
  coinsEarned: number;
  message: string;
  timestamp: number;
}

export interface WalletState {
  agroCredits: number;
  agroCoins: number;
  pendingCredits: number;
  creditsToNextCoin: number;
  progressPercent: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  lastEarned: EarnResult | null;
}

export interface WalletContextType extends WalletState {
  earn: (action: string, metadata?: Record<string, string | number>) => Promise<EarnResult>;
  refresh: () => Promise<void>;
  clearLastEarned: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const initialState: WalletState = {
  agroCredits: 0,
  agroCoins: 0,
  pendingCredits: 0,
  creditsToNextCoin: 1000,
  progressPercent: 0,
  transactions: [],
  isLoading: true,
  lastEarned: null,
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(initialState);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    try {
      const data = await getWallet();
      if (data.success && data.wallet) {
        setState((prev) => ({
          ...prev,
          agroCredits: data.wallet.agroCredits,
          agroCoins: data.wallet.agroCoins,
          pendingCredits: data.wallet.pendingCredits,
          creditsToNextCoin: data.creditsToNextCoin ?? 1000 - data.wallet.pendingCredits,
          progressPercent: data.progressPercent ?? (data.wallet.pendingCredits / 1000) * 100,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const earn = useCallback(
    async (action: string, metadata?: Record<string, string | number>): Promise<EarnResult> => {
      const data = await earnCredits(action, metadata);
      if (!data.success) throw new Error("Earn failed");
      const result: EarnResult = {
        creditsEarned: data.creditsEarned,
        coinsEarned: data.coinsEarned,
        message: data.message,
        timestamp: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        agroCredits: data.newTotal,
        agroCoins: data.newCoins,
        pendingCredits: data.pendingCredits,
        creditsToNextCoin: data.creditsToNextCoin,
        progressPercent: (data.pendingCredits / 1000) * 100,
        lastEarned: result,
      }));
      return result;
    },
    []
  );

  const clearLastEarned = useCallback(() => {
    setState((prev) => ({ ...prev, lastEarned: null }));
  }, []);

  const value: WalletContextType = {
    ...state,
    earn,
    refresh,
    clearLastEarned,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function useWalletOptional(): WalletContextType | null {
  return useContext(WalletContext);
}
