/**
 * API client for AgroScope new modules (price, ratings, forecast, carbon, recommendations).
 * Uses relative /api so Vite proxy forwards to backend.
 */

const base = import.meta.env.VITE_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PriceEvaluateResult {
  status: string;
  label: string;
  color: string;
  marketPrice: number | null;
  market_status?: string;
  source: string | null;
  lastUpdated: string | null;
  userPricePerKg: number;
  differencePercent: number | null;
  isDemoPrice?: boolean;
}

/** Response from GET /api/market-price/compare */
export interface PriceCompareResult {
  status: "ABOVE_MARKET" | "BELOW_MARKET" | "FAIR_PRICE" | "NOT_CONFIGURED";
  wasteType?: string;
  state?: string;
  marketPrice?: number;
  userPrice?: number;
  source?: string;
  lastUpdated?: string;
}

/** Call GET /api/market-price/compare (canonical endpoint). */
export async function getMarketPriceCompare(
  wasteType: string,
  userPrice: number,
  stateOrLocation?: string | null
): Promise<PriceCompareResult> {
  const params = new URLSearchParams({ wasteType, userPrice: String(userPrice) });
  if (stateOrLocation && stateOrLocation.trim()) params.set("location", stateOrLocation.trim());
  const res = await fetch(`${base}/api/market-price/compare?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || res.statusText || "Price check failed";
    throw new Error(msg);
  }
  return res.json();
}

/** POST /api/price/evaluate – optional qualityGrade for demo market price (A: ₹7–9, B: ₹5–7, C: ₹3–5). */
export async function evaluatePrice(
  wasteType: string,
  pricePerKg: number,
  stateOrLocation?: string | null,
  qualityGrade?: string | null
): Promise<PriceEvaluateResult> {
  const body: Record<string, unknown> = {
    wasteType,
    pricePerKg,
    ...(stateOrLocation && stateOrLocation.trim() ? { stateOrLocation: stateOrLocation.trim() } : {}),
  };
  if (qualityGrade && ["A", "B", "C"].includes(qualityGrade.toUpperCase())) body.qualityGrade = qualityGrade.toUpperCase();
  const res = await fetch(`${base}/api/price/evaluate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Price evaluation failed");
  }
  return res.json();
}

export async function getStartupRating(startupId: string) {
  const res = await fetch(`${base}/api/startup/${encodeURIComponent(startupId)}/rating`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load startup rating");
  return res.json();
}

export async function getFarmerRating(farmerId: string) {
  const res = await fetch(`${base}/api/farmer/${encodeURIComponent(farmerId)}/rating`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load farmer rating");
  return res.json();
}

export interface LocationForecastParams {
  wasteType: string;
  city: string;
}

export interface LocationForecastResult {
  city: string;
  state: string;
  hubName: string;
  wasteTypeKey: string;
  wasteTypeLabel: string;
  predictedQuantityKg: number;
  confidenceLevel: number;
  trend: string;
  dataPoints: number;
  pricePerKg: number;
  peakMonth: string;
  marketDemandScore: number;
  dailyBreakdown: Array<{ day: number; predictedKg: number; lowerBound?: number; upperBound?: number }>;
  message?: string;
}

export async function getForecastNext30Days(params: LocationForecastParams): Promise<LocationForecastResult> {
  const search = new URLSearchParams({
    wasteType: params.wasteType,
    city: params.city,
  });
  const res = await fetch(`${base}/api/forecast/next-30-days?${search.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load forecast");
  return res.json();
}

/** GET /api/forecast/:wasteType - 30-day supply prediction for a waste type. */
export interface ForecastResult {
  wasteType: string;
  lastThreeMonthAverage: number;
  predictedNext30Days: number;
  predictedTonsNext30Days?: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  confidencePercent?: number;
  isDemo?: boolean;
}

export async function getForecastByWasteType(wasteType: string): Promise<ForecastResult> {
  const res = await fetch(`${base}/api/forecast/${encodeURIComponent(wasteType)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load forecast");
  const data = await res.json();
  const tons = data.predictedTonsNext30Days ?? data.predictedNext30Days ?? 0;
  return {
    ...data,
    predictedNext30Days: tons,
    predictedTonsNext30Days: tons,
  };
}

export async function simulateCarbon(wasteType: string, quantityTons: number) {
  const res = await fetch(`${base}/api/carbon/simulate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ wasteType, quantityTons }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Carbon simulation failed");
  }
  return res.json();
}

export async function getRecommendations(wasteType: string) {
  const res = await fetch(
    `${base}/api/recommendations/${encodeURIComponent(wasteType)}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error("Failed to load recommendations");
  return res.json();
}

/** GET /api/cold-storage/nearest?location= – nearest hub and distance (km). Fallback: Chennai, 40 km. */
export interface NearestColdStorageResult {
  hubName: string;
  distanceKm: number;
}

export async function getNearestColdStorage(location: string): Promise<NearestColdStorageResult> {
  const params = new URLSearchParams({ location: location.trim() });
  const res = await fetch(`${base}/api/cold-storage/nearest?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Cold storage lookup failed");
  return res.json();
}

/** GET /api/forecast/ai-30days — DeepSeek 30-day supply forecast */
export interface AIForecastResult {
  success: boolean;
  fromCache: boolean;
  generatedAt: string;
  wasteType: string;
  city: string;
  quantityTons: number;
  predictedTotalKg: number;
  confidencePercent: number;
  trend: string;
  trendReason: string;
  peakDay: number;
  peakReason: string;
  bestSellWindow: string;
  insight: string;
  priceImpact: string;
  source: "deepseek" | "fallback";
  dailyForecast: Array<{
    day: number;
    date: string;
    forecastKg: number;
    upperBoundKg: number;
    lowerBoundKg: number;
    note?: string;
  }>;
}

export async function fetchAIForecast(
  wasteType: string,
  city: string,
  quantity: number
): Promise<AIForecastResult> {
  const params = new URLSearchParams({
    wasteType: wasteType.trim() || "paddy_husk",
    city: (city || "Chennai").trim(),
    quantity: String(Math.max(0.1, quantity) || 1),
  });
  const res = await fetch(`${base}/api/forecast/ai-30days?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load forecast");
  return res.json();
}

// ─── Wallet (dual farmer/startup AgroCredits & Agro Coins) ─────────────────

export interface WalletResponse {
  success: boolean;
  wallet: {
    userId: string;
    userEmail: string;
    role: string;
    agroCredits: number;
    agroCoins: number;
    pendingCredits: number;
    totalEarned: number;
    transactions: WalletTransaction[];
    lastUpdated: string | null;
  };
  creditsToNextCoin: number;
  progressPercent: number;
}

export interface WalletTransaction {
  id: string;
  type: "CREDIT_EARN" | "COIN_CONVERT" | "CREDIT_SPEND" | "TRANSFER_OUT" | "TRANSFER_IN";
  amount: number;
  description: string;
  source: string;
  agroCreditsAfter: number;
  agroCoinsAfter: number;
  timestamp: string;
}

export interface EarnCreditsResponse {
  success: boolean;
  creditsEarned: number;
  coinsEarned: number;
  newTotal: number;
  newCoins: number;
  pendingCredits: number;
  creditsToNextCoin: number;
  wallet: WalletResponse["wallet"];
  message: string;
}

export async function getWallet(): Promise<WalletResponse> {
  const res = await fetch(`${base}/api/wallet`, { method: "GET", headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to load wallet");
  }
  return res.json();
}

export async function earnCredits(
  action: string,
  metadata?: Record<string, string | number>
): Promise<EarnCreditsResponse> {
  const res = await fetch(`${base}/api/wallet/earn`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, metadata }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to earn credits");
  }
  return res.json();
}

export async function getWalletTransactions(page = 1): Promise<{
  success: boolean;
  transactions: WalletTransaction[];
  total: number;
  page: number;
  hasMore: boolean;
}> {
  const res = await fetch(`${base}/api/wallet/transactions?page=${page}&limit=20`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

export interface WalletUser {
  email: string;
  userId: string;
  role: string;
  agroCoins: number;
}

export async function getWalletUsers(): Promise<{ success: boolean; users: WalletUser[] }> {
  const res = await fetch(`${base}/api/wallet/users`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export interface TransferResponse {
  success: boolean;
  amount: number;
  message: string;
  senderWallet: WalletResponse["wallet"];
  receiverWallet: WalletResponse["wallet"];
}

export async function postWalletTransfer(
  toEmail: string,
  amountCoins: number,
  recipientRole: "farmer" | "startup"
): Promise<TransferResponse> {
  const res = await fetch(`${base}/api/wallet/transfer`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ toEmail: toEmail.trim().toLowerCase(), amountCoins, recipientRole }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Transfer failed");
  return data as TransferResponse;
}

// ─── Balance wallet (INR wallet: balance, withdrawals) ───────────────────────────
export interface BalanceWallet {
  _id: string;
  userId: string;
  role: "farmer" | "startup";
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalSpent: number;
}

export async function getBalanceWallet(): Promise<{ success: boolean; wallet: BalanceWallet }> {
  const res = await fetch(`${base}/api/wallet/me`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to load wallet");
  return data as { success: boolean; wallet: BalanceWallet };
}

export interface BalanceWalletTransaction {
  _id: string;
  type: string;
  amount: number;
  description?: string;
  referenceId?: string;
  status: string;
  createdAt: string;
}

export async function getBalanceWalletTransactions(
  page = 1,
  limit = 20
): Promise<{
  success: boolean;
  transactions: BalanceWalletTransaction[];
  total: number;
  page: number;
  hasMore: boolean;
}> {
  const res = await fetch(
    `${base}/api/wallet/me/transactions?page=${page}&limit=${limit}`,
    { headers: getAuthHeaders() }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, transactions: [], total: 0, page: 1, hasMore: false };
  return data as {
    success: boolean;
    transactions: BalanceWalletTransaction[];
    total: number;
    page: number;
    hasMore: boolean;
  };
}

export async function postWithdrawRequest(body: {
  amount: number;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  upiId?: string;
  mobileNumber: string;
  email: string;
}): Promise<{ success: boolean; message: string; withdrawal: unknown; wallet: BalanceWallet }> {
  const res = await fetch(`${base}/api/wallet/withdraw`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Withdrawal request failed");
  return data as { success: boolean; message: string; withdrawal: unknown; wallet: BalanceWallet };
}

