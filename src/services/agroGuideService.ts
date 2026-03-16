/**
 * AgroGuide — same API pattern as NegotiationArena (POST /api/price-negotiation/chat).
 * Uses mode: 'agro_guide' for non-streaming JSON { reply }.
 * API base: empty = same-origin (Railway prod or Vite proxy in dev).
 * Fetches real-time user data (balance, agro coins, provisions, transactions) when logged in.
 */

import { AGROGUIDE_SYSTEM_PROMPT } from "@/lib/agroGuideKnowledge";
import type { BalanceWallet, BalanceWalletTransaction } from "@/lib/api";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface AgroGuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  language?: string;
}

/** Injected wallet/balance from UI context — same data shown in nav bar and Wallet dropdown. */
export interface AgroGuideInjectedData {
  agroCredits?: number;
  agroCoins?: number;
  pendingCredits?: number;
  balance?: number;
  totalEarned?: number;
  totalWithdrawn?: number;
}

/**
 * Fetch real-time user context for AgroGuide. When injected data is provided (from WalletContext + getBalanceWallet),
 * uses those values so AgroGuide shows the SAME numbers as the nav bar and Wallet dropdown.
 */
export async function getAgroGuideUserContext(injected?: AgroGuideInjectedData | null): Promise<string | null> {
  const token = localStorage.getItem("authToken");
  const userRaw = localStorage.getItem("user");
  if (!token || !userRaw) return null;

  let user: { role?: string; name?: string; email?: string; userId?: string } = {};
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  const role = (user.role || "farmer") as string;
  const name = user.name || user.email || user.userId || "User";
  const headers = getAuthHeaders();
  const lines: string[] = [
    `LOGGED-IN USER (real-time): Role = ${role}. Name/Email = ${name}.`,
  ];

  const hasInjectedWalletData = injected && (injected.balance != null || injected.agroCredits != null || injected.agroCoins != null);

  if (hasInjectedWalletData) {
    const bal = Number(injected!.balance ?? 0);
    const earned = Number(injected!.totalEarned ?? 0);
    const withdrawn = Number(injected!.totalWithdrawn ?? 0);
    lines.push(
      `Balance (INR): ₹${bal.toFixed(2)}. Total earned: ₹${earned.toFixed(2)}. Total withdrawn: ₹${withdrawn.toFixed(2)}.`
    );
    const credits = Number(injected!.agroCredits ?? 0);
    const coins = Number(injected!.agroCoins ?? 0);
    const pending = Number(injected!.pendingCredits ?? 0);
    lines.push(
      `AgroCredits (AgroPoints): ${credits}. AgroCoins: ${coins}. Pending credits to next coin: ${pending}/1000.`
    );
  }

  const provisionsUrl = role === "farmer" ? `${API_BASE}/api/provisions/my` : `${API_BASE}/api/provisions`;

  const [balanceRes, transactionsRes, provisionsRes] = await Promise.allSettled([
    hasInjectedWalletData ? Promise.resolve(null) : fetch(`${API_BASE}/api/wallet/me`, { method: "GET", headers }).then((r) => (r.ok ? r.json() : null)),
    fetch(`${API_BASE}/api/wallet/me/transactions?page=1&limit=10`, { method: "GET", headers }).then((r) => (r.ok ? r.json() : null)),
    fetch(provisionsUrl, { method: "GET", headers }).then((r) => (r.ok ? r.json() : { provisions: [] })),
  ]);

  if (!hasInjectedWalletData) {
    const balanceData = balanceRes.status === "fulfilled" ? balanceRes.value : null;
    const balanceWallet = balanceData?.wallet as BalanceWallet | undefined;
    if (balanceWallet != null) {
      const bal = Number(balanceWallet.balance ?? 0);
      const earned = Number(balanceWallet.totalEarned ?? 0);
      const withdrawn = Number(balanceWallet.totalWithdrawn ?? 0);
      lines.push(
        `Balance (INR): ₹${bal.toFixed(2)}. Total earned: ₹${earned.toFixed(2)}. Total withdrawn: ₹${withdrawn.toFixed(2)}.`
      );
    }
    const walletRes = await fetch(`${API_BASE}/api/wallet`, { method: "GET", headers }).then((r) => (r.ok ? r.json() : null));
    const loyaltyWallet = walletRes?.wallet as { agroCredits?: number; agroCoins?: number; pendingCredits?: number } | undefined;
    if (loyaltyWallet != null) {
      const credits = Number(loyaltyWallet.agroCredits ?? 0);
      const coins = Number(loyaltyWallet.agroCoins ?? 0);
      const pending = Number(loyaltyWallet.pendingCredits ?? 0);
      lines.push(
        `AgroCredits (AgroPoints): ${credits}. AgroCoins: ${coins}. Pending credits to next coin: ${pending}/1000.`
      );
    }
  }

  const txData = transactionsRes.status === "fulfilled" ? transactionsRes.value : null;
  const provisionsPayload = provisionsRes.status === "fulfilled" ? provisionsRes.value : null;
  const provisionsList = Array.isArray(provisionsPayload?.provisions) ? provisionsPayload.provisions : [];

  if (provisionsList.length > 0) {
    const list = provisionsList
      .slice(0, 15)
      .map((p: { wasteType?: string; quantityTons?: number; location?: string; status?: string }) =>
        `${p.wasteType ?? "?"} ${p.quantityTons ?? "?"}t at ${p.location ?? "?"} (${p.status ?? "?"})`
      )
      .join("; ");
    if (role === "farmer") {
      lines.push(`Provisions (${provisionsList.length}): ${list}.`);
    } else {
      lines.push(`Dashboard: ${provisionsList.length} provision(s) available to request.`);
    }
  } else if (role === "farmer") {
    lines.push("Provisions: 0 listings.");
  }

  const transactions = txData?.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const recent = (transactions as BalanceWalletTransaction[])
      .slice(0, 8)
      .map(
        (t) =>
          `${t.type}: ${t.amount >= 0 ? "+" : ""}₹${t.amount.toFixed(2)} ${t.description ?? ""} (${t.createdAt ?? ""})`
      )
      .join(" | ");
    lines.push(`Recent transactions: ${recent}.`);
  }

  if (role === "admin") {
    try {
      const payRes = await fetch(`${API_BASE}/api/payments`, { headers });
      if (payRes.ok) {
        const payments = (await payRes.json()) as { status?: string }[];
        const pending = payments.filter((p) => p.status === "pending_verification").length;
        lines.push(`Admin: ${pending} payment(s) pending verification.`);
      }
    } catch {
      /* ignore */
    }
  }

  return lines.join(" ");
}

/** Check if AgroGuide backend is reachable and configured (DEEPSEEK_API_KEY). */
export async function getAgroGuideStatus(): Promise<{ configured: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/price-negotiation/agro-guide-status`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    return {
      configured: !!(data as { configured?: boolean }).configured,
      message: (data as { message?: string }).message ?? (res.ok ? "OK" : "Server error"),
    };
  } catch {
    return { configured: false, message: "Cannot reach server. Is the backend running on port 5000?" };
  }
}

export async function getAgroGuideResponse(
  userMessage: string,
  history: AgroGuideMessage[],
  languageCode: string,
  languageName: string,
  languageNative: string,
  pageContext: string,
  userContext?: string | null
): Promise<string> {
  const messagesToSend = history.slice(-12).map((m) => ({ role: m.role, content: (m.content || "").trim() || " " }));
  const body = {
    mode: "agro_guide",
    messages: messagesToSend,
    systemPrompt: AGROGUIDE_SYSTEM_PROMPT,
    pageContext,
    userContext: userContext ?? undefined,
    selectedLanguage: {
      code: languageCode,
      name: languageName,
      native: languageNative,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/price-negotiation/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new Error(msg.includes("fetch") || msg.includes("Failed") ? "Cannot reach server. Is the backend running on port 5000?" : msg);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    throw new Error("Server returned streaming response. Restart the backend (npm run dev in server folder) so AgroGuide uses the correct API.");
  }

  const data = await res.json().catch(() => ({}));
  const reply = (data as { reply?: string }).reply;

  if (!res.ok) {
    if (typeof reply === "string" && reply.trim()) return reply;
    const err = (data as { error?: string }).error;
    throw new Error(err || `Server error (${res.status})`);
  }

  return typeof reply === "string" ? reply : "The assistant didn't return text. Please try again.";
}
