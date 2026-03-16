// API client for Loyalty Program - same-origin in prod (Railway), Vite proxy in dev
const base = (import.meta.env.VITE_API_URL as string) ?? "";

export interface LoyaltyBreakdown {
  duration: number;
  accountability: number;
  reputation: number;
  reviewVolume: number;
}

export interface NextTierRequirements {
  targetScore: number | null;
  message: string;
  actions: string[];
}

export interface LoyaltyStatusResponse {
  success: boolean;
  tier: "A" | "B" | "C";
  tierLabel?: string;
  score: number;
  breakdown: LoyaltyBreakdown;
  benefits: string[];
  nextTierRequirements: NextTierRequirements;
  allCompanies?: LoyaltyCompanyProfile[];
  topCompanies?: LoyaltyCompanyProfile[];
  tierCompanies?: Record<"A" | "B" | "C", LoyaltyCompanyProfile[]>;
  tierInsights?: Record<"A" | "B" | "C", string>;
  diagnostics?: {
    monthsActive: number;
    totalOrders: number;
    completedOrders: number;
    completionRate: number;
    averageRating: number;
    reviewCount: number;
  };
  weights?: {
    reputation: number;
    accountability: number;
    duration: number;
    reviewVolume: number;
  };
}

export interface LoyaltyCompanyProfile {
  name: string;
  website: string;
  summary: string;
  segment?: string;
  logoUrl?: string;
  tier: "A" | "B" | "C";
  tierLabel: string;
  score: number;
  breakdown: LoyaltyBreakdown;
  reasoning: string;
}

export interface LoyaltyCompaniesResponse {
  success: boolean;
  allCompanies?: LoyaltyCompanyProfile[];
  topCompanies: LoyaltyCompanyProfile[];
  tierCompanies: Record<"A" | "B" | "C", LoyaltyCompanyProfile[]>;
  tierInsights?: Record<"A" | "B" | "C", string>;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getLoyaltyStatus(): Promise<LoyaltyStatusResponse> {
  const path = "/api/loyalty/status";
  const url = base ? `${base.replace(/\/$/, "")}${path}` : path;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Failed to fetch loyalty status: ${response.statusText}`);
  return response.json();
}

export async function getLoyaltyCompanies(): Promise<LoyaltyCompaniesResponse> {
  const path = "/api/loyalty/companies";
  const url = base ? `${base.replace(/\/$/, "")}${path}` : path;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Failed to fetch loyalty companies: ${response.statusText}`);
  return response.json();
}

/** Google favicon API - reliable static logo URLs (fetch once, cached by browser). */
const logo = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/** Static bioenergy companies for Loyalty Program (no backend required). */
export function getStaticLoyaltyData(): LoyaltyStatusResponse {
  const companies: LoyaltyCompanyProfile[] = [
    {
      name: "GPS Renewables",
      website: "https://gpsrenewables.com",
      summary: "Builds and operates biofuel and compressed biogas (CBG) projects across India. Leading in biogas infrastructure and waste-to-energy.",
      segment: "Biogas infrastructure",
      logoUrl: logo("gpsrenewables.com"),
      tier: "A",
      tierLabel: "Tier A (Elite)",
      score: 82.4,
      breakdown: { duration: 78, accountability: 88, reputation: 85, reviewVolume: 79 },
      reasoning: "Strong execution in biogas infrastructure and consistent project delivery support Elite tier placement. Operational scale and partnership track record drive the score.",
    },
    {
      name: "EverEnviro Resource Management",
      website: "https://everenviro.com",
      summary: "Waste-to-energy and CBG player with municipal and industrial feedstock programs. Expanding capacity across multiple states.",
      segment: "Waste to CBG",
      logoUrl: logo("everenviro.com"),
      tier: "A",
      tierLabel: "Tier A (Elite)",
      score: 79.1,
      breakdown: { duration: 72, accountability: 85, reputation: 82, reviewVolume: 77 },
      reasoning: "Elite placement justified by nationwide waste-to-CBG operations and strong accountability metrics. Municipal and industrial partnerships are key proof points.",
    },
    {
      name: "Sistema.bio India",
      website: "https://sistema.bio",
      summary: "Distributed biodigester deployment for smallholder and rural energy ecosystems. Clean cooking and biofertilizer solutions.",
      segment: "Biogas systems",
      logoUrl: logo("sistema.bio"),
      tier: "A",
      tierLabel: "Tier A (Elite)",
      score: 76.8,
      breakdown: { duration: 75, accountability: 80, reputation: 78, reviewVolume: 74 },
      reasoning: "Tier A based on scalable smallholder biogas model and high farmer adoption. Technology and field execution consistently support trust indicators.",
    },
    {
      name: "Praj Industries",
      website: "https://praj.net",
      summary: "Bioenergy technology and engineering services for ethanol, biogas and cleaner fuel value chains. Global presence with strong India footprint.",
      segment: "Biofuel technology",
      logoUrl: logo("praj.net"),
      tier: "B",
      tierLabel: "Tier B (Established)",
      score: 71.2,
      breakdown: { duration: 82, accountability: 72, reputation: 75, reviewVolume: 56 },
      reasoning: "Established tier supported by long tenure and technology leadership. Score reflects strong duration and reputation with room to grow review volume.",
    },
    {
      name: "BharatRohan Airborne Innovations",
      website: "https://bharatrohan.in",
      summary: "Agri-tech startup offering crop intelligence and precision advisory. Integrates biomass and sustainability data for farmers and buyers.",
      segment: "Agri buyer intelligence",
      logoUrl: logo("bharatrohan.in"),
      tier: "B",
      tierLabel: "Tier B (Established)",
      score: 68.5,
      breakdown: { duration: 58, accountability: 74, reputation: 72, reviewVolume: 70 },
      reasoning: "Established tier from strong accountability and reputation in agri-tech. Duration score will rise with continued platform tenure.",
    },
    {
      name: "Indian Oil Biofuels Network",
      website: "https://iocl.com",
      summary: "Large-scale offtake and participation in India CBG ecosystem. Key offtaker for compressed biogas and biofuels.",
      segment: "CBG offtake",
      logoUrl: logo("iocl.com"),
      tier: "B",
      tierLabel: "Tier B (Established)",
      score: 65.3,
      breakdown: { duration: 88, accountability: 62, reputation: 80, reviewVolume: 51 },
      reasoning: "Major offtaker with high reputation and duration. Accountability and review volume reflect B2B nature; established tier is appropriate.",
    },
    {
      name: "Re Sustainability (Recycled Energy)",
      website: "https://resustainability.com",
      summary: "Circular economy and resource recovery with energy conversion assets. Municipal solid waste and industrial biomass to energy.",
      segment: "Circular procurement",
      logoUrl: logo("resustainability.com"),
      tier: "B",
      tierLabel: "Tier B (Established)",
      score: 62.9,
      breakdown: { duration: 68, accountability: 70, reputation: 65, reviewVolume: 58 },
      reasoning: "Established player in circular procurement. Weighted metrics support Tier B; stronger review volume would push toward Elite.",
    },
    {
      name: "Adani Total Gas Bio-CNG",
      website: "https://www.adanitotalgas.com",
      summary: "Bio-CNG station network expansion and industrial partnerships. Scaling green gas distribution.",
      segment: "Bio-CNG buyer network",
      logoUrl: logo("adanitotalgas.com"),
      tier: "C",
      tierLabel: "Tier C (Emerging)",
      score: 54.6,
      breakdown: { duration: 52, accountability: 58, reputation: 68, reviewVolume: 40 },
      reasoning: "Emerging tier with strong reputation from parent brand. Duration and review volume will improve as Bio-CNG programs scale.",
    },
    {
      name: "Reliance New Energy Bio Initiatives",
      website: "https://www.ril.com",
      summary: "Integrated clean-energy strategy with bioenergy and circularity projects. Large-scale investments in biofuels and CBG.",
      segment: "Energy transition buyer",
      logoUrl: logo("ril.com"),
      tier: "C",
      tierLabel: "Tier C (Emerging)",
      score: 51.2,
      breakdown: { duration: 48, accountability: 55, reputation: 72, reviewVolume: 35 },
      reasoning: "Emerging tier as bio initiatives are newer. High reputation from group; accountability and tenure will grow with more completed projects.",
    },
    {
      name: "Green Energy Partners India",
      website: "https://greenenergypartners.in",
      summary: "Focused on biomass aggregation and supply to biogas and power plants. Connecting farmers and industrial offtakers.",
      segment: "Biomass aggregation",
      logoUrl: logo("greenenergypartners.in"),
      tier: "C",
      tierLabel: "Tier C (Emerging)",
      score: 48.8,
      breakdown: { duration: 45, accountability: 52, reputation: 55, reviewVolume: 43 },
      reasoning: "Emerging tier with growth potential. Strong in aggregation segment; duration and review volume will improve with more transactions.",
    },
  ];

  const tierCompanies: Record<"A" | "B" | "C", LoyaltyCompanyProfile[]> = {
    A: companies.filter((c) => c.tier === "A"),
    B: companies.filter((c) => c.tier === "B"),
    C: companies.filter((c) => c.tier === "C"),
  };

  return {
    success: true,
    tier: "B",
    tierLabel: "Tier B (Established)",
    score: 65.0,
    breakdown: { duration: 62, accountability: 70, reputation: 72, reviewVolume: 58 },
    benefits: [
      "Established trust badge for profile credibility",
      "Standard priority placement in matching results",
      "Monthly performance insight digest",
      "Access to advanced buyer onboarding tools",
    ],
    nextTierRequirements: {
      targetScore: 75,
      message: "You need 10.0 more points to reach Tier A (Elite).",
      actions: [
        "Increase completed orders ratio by closing open orders faster.",
        "Complete more rated transactions to strengthen trust signals.",
      ],
    },
    allCompanies: companies,
    topCompanies: companies.slice(0, 10),
    tierCompanies,
    tierInsights: {
      A: "Tier A (Elite) leaders like GPS Renewables and EverEnviro lead on reputation, accountability and operational scale. Strongest proof points are completed projects and partnership track record.",
      B: "Tier B (Established) companies show solid duration and reputation with room to grow review volume. Praj and BharatRohan lead on technology and agri-intelligence.",
      C: "Tier C (Emerging) players have strong potential; duration and review volume will rise as bioenergy programs scale and more transactions are completed.",
    },
    weights: { reputation: 0.35, accountability: 0.3, duration: 0.2, reviewVolume: 0.15 },
  };
}
