import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PAGE_QUICK_CHIPS } from "@/lib/agroGuideKnowledge";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/home": "User is on the Home landing page. Help them understand AgroScope, choose between Farmer and Startup role, find Tools and Insights, or navigate to login.",
  "/input": "User is on the Farmer Input page — where farmers log crop waste. Help with form filling, Waste Type, quantity, quality grade, price negotiation, satellite detection, Weight Estimator (camera + AI using selected waste type for density), AgroCredits, and saving to inventory.",
  "/startup-input": "User is on the Startup Input page. They want to post demand for crop waste. Help them fill in their requirements and find farmer supply at /farmer-inventory or /startup-matches.",
  "/profile": "User is on their Profile page. Help with wallet tabs (Farmer Wallet vs Startup Wallet), balance (INR) and AgroCredits/AgroCoins (1000:1), transfers, links to /wallet/transactions and /wallet/withdraw.",
  "/farmer-inventory": "User is on the Farmer Inventory page. Farmers manage their listed supply; startups see all provisions (prices include 30% platform fee). Help with filters, statuses, and requesting provisions.",
  "/startup-matches": "User is on Startup Matches. AI-matched farmers for their demand. Help with compatibility scores, requesting provisions, and filters.",
  "/notifications": "User is checking Notifications. Explain notification types and how to act on order requests or price alerts.",
  "/forecast": "User is on the 30-Day Supply Forecast page. Help them read the chart, understand confidence bands, use the AI forecast option, and find the best sell window.",
  "/carbon": "User is on the Carbon Simulator. Help them understand the CO₂ formulas (quantity×1.5), tree equivalents, carbon credits, and rupee value.",
  "/recommendations": "User is on Recommendations. They want to know what products they can make from their specific waste type.",
  "/agro-news-live": "User is on Agro News Live. Help with categories, search, bookmarks, and understanding how Tavily powers the news feed.",
  "/weather-forecast": "User is on Weather Forecast. Help them understand Open-Meteo data, how it differs from supply forecast, and how to use advisories.",
  "/loyalty": "User is on the Loyalty Program page. Explain the static company trust tiers (A Elite, B Established, C Emerging), the 10 bioenergy companies, and that no login is needed.",
  "/dashboard": "User is on the Startup Dashboard. Provisions shown with 30% platform fee. Help them request provisions, pay (screenshot flow), and understand that admin verifies and credits the farmer wallet.",
  "/payments": "User is on the Admin Payments page. List payments (startup screenshots), verify payment to credit farmer wallet with original listing total (farmer price per kg × quantity in kg). Admin only.",
  "/wallet/transactions": "User is on Transaction History. Listing credits, withdrawals, transfers. Help them understand each type and link to /wallet/withdraw or /profile.",
  "/wallet/withdraw": "User is on Withdrawal Request. Farmers request withdrawal; admin approves. Help with bank/UPI details and amount.",
  "/verification": "User is on Crop Waste Verification. Farmers upload photos of waste; stored permanently per account. Help with upload and where photos are stored.",
  "/results": "User is on Results page. Help them interpret results and next steps.",
  "/live-prices": "User is on Live Prices. Help them understand market price source and how it relates to listing.",
};

const PAGE_LABELS: Record<string, string> = {
  "/home": "Home Page",
  "/input": "Farmer Input",
  "/startup-input": "Startup Input",
  "/profile": "Profile & Wallet",
  "/farmer-inventory": "Farmer Inventory",
  "/startup-matches": "Startup Matches",
  "/notifications": "Notifications",
  "/forecast": "30-Day Supply Forecast",
  "/carbon": "Carbon Simulator",
  "/recommendations": "Recommendations",
  "/agro-news-live": "Agro News Live",
  "/weather-forecast": "Weather Forecast",
  "/loyalty": "Loyalty Program",
  "/dashboard": "Dashboard",
  "/payments": "Verify Payments (Admin)",
  "/wallet/transactions": "Transaction History",
  "/wallet/withdraw": "Withdraw",
  "/verification": "Crop Waste Verification",
  "/results": "Results",
  "/live-prices": "Live Prices",
};

export function useAgroGuideContext() {
  const { pathname } = useLocation();
  return useMemo(
    () => ({
      context: PAGE_DESCRIPTIONS[pathname] ?? "User is somewhere on AgroScope. Help them find the right feature.",
      label: PAGE_LABELS[pathname] ?? "AgroScope",
      chips: PAGE_QUICK_CHIPS[pathname] ?? PAGE_QUICK_CHIPS["/home"],
    }),
    [pathname]
  );
}
