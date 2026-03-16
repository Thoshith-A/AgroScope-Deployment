// server/routes/loyalty.js - Startup loyalty scoring for buyer accounts.

import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateCompanyLoyaltyReasoning, generateTierComparisonReasoning } from '../services/deepseekLoyalty.js';

const router = express.Router();

const WEIGHTS = {
  reputation: 0.35,
  accountability: 0.3,
  duration: 0.2,
  reviewVolume: 0.15,
};

const SCORE_PRIORS = {
  defaultMonthsActive: 12,
  accountabilityCompletedPrior: 3,
  accountabilityPendingPrior: 2,
  reputationPriorRating: 4.1,
  reputationPriorCount: 12,
  reviewVolumeNeutralScore: 45,
};

const TIER_BENEFITS = {
  A: [
    'Elite trust badge for marketplace visibility',
    'Priority support and faster dispute resolution',
    'Early access to premium verified supplier pools',
    'Preferred buyer placement in farmer recommendations',
  ],
  B: [
    'Established trust badge for profile credibility',
    'Standard priority placement in matching results',
    'Monthly performance insight digest',
    'Access to advanced buyer onboarding tools',
  ],
  C: [
    'Emerging startup badge with growth guidance',
    'Baseline visibility in buyer search',
    'Starter trust checklist to improve tier score',
    'Access to loyalty education resources',
  ],
};

const COMPANY_SEARCH_QUERIES = [
  'India biogas startup buyers compressed biogas companies',
  'top bioenergy and biogas companies India procurement',
  'renewable gas and CBG buyers company profiles India',
];

const FALLBACK_COMPANIES = [
  { name: 'GPS Renewables', website: 'https://gpsrenewables.com', summary: 'Builds and operates biofuel and compressed biogas projects across India.', segment: 'Biogas infrastructure' },
  { name: 'EverEnviro Resource Management', website: 'https://everenviro.com', summary: 'Waste-to-energy and CBG player with municipal and industrial feedstock programs.', segment: 'Waste to CBG' },
  { name: 'BharatRohan Airborne Innovations', website: 'https://bharatrohan.in', summary: 'Agri-tech startup offering crop intelligence and precision advisory solutions.', segment: 'Agri buyer intelligence' },
  { name: 'Sistema.bio India', website: 'https://sistema.bio', summary: 'Distributed biodigester deployment for smallholder and rural energy ecosystems.', segment: 'Biogas systems' },
  { name: 'Indian Oil Biofuels Network', website: 'https://iocl.com', summary: 'Large-scale offtake and participation in India CBG ecosystem partnerships.', segment: 'CBG offtake' },
  { name: 'Reliance New Energy Bio Initiatives', website: 'https://www.ril.com', summary: 'Integrated clean-energy strategy with bioenergy and circularity projects.', segment: 'Energy transition buyer' },
  { name: 'Adani Total Gas Bio-CNG Programs', website: 'https://www.adanitotalgas.com', summary: 'Bio-CNG station network expansion and industrial partnerships.', segment: 'Bio-CNG buyer network' },
  { name: 'Re Sustainability Circular Ventures', website: 'https://resustainability.com', summary: 'Circular economy and resource recovery programs with energy conversion assets.', segment: 'Circular procurement' },
  { name: 'Praj Industries BioMobility', website: 'https://praj.net', summary: 'Bioenergy technology and engineering services for cleaner fuel value chains.', segment: 'Biofuel technology buyer' },
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function getTier(score) {
  if (score >= 75) return 'A';
  if (score >= 50) return 'B';
  return 'C';
}

function getTierLabel(tier) {
  if (tier === 'A') return 'Tier A (Elite)';
  if (tier === 'B') return 'Tier B (Established)';
  return 'Tier C (Emerging)';
}

function parseDateSafe(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthsBetween(start, end) {
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function getDurationBreakdown(createdAt) {
  const fallbackDate = new Date();
  fallbackDate.setMonth(fallbackDate.getMonth() - SCORE_PRIORS.defaultMonthsActive);
  const created = parseDateSafe(createdAt) || fallbackDate;
  const monthsActive = monthsBetween(created, new Date());
  const durationScore = clamp((monthsActive / 36) * 100);
  return { durationScore: round2(durationScore), monthsActive };
}

function normalizeOrders(rawOrders) {
  if (Array.isArray(rawOrders)) return rawOrders;
  if (Array.isArray(rawOrders?.orders)) return rawOrders.orders;
  if (Array.isArray(rawOrders?.data)) return rawOrders.data;
  return [];
}

function getAccountabilityBreakdown(orders) {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((order) => {
    const status = String(order?.status || '').toLowerCase();
    return status === 'completed' || status === 'delivered' || status === 'fulfilled';
  }).length;
  const completionRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;
  const smoothedCompletionRate =
    ((completedOrders + SCORE_PRIORS.accountabilityCompletedPrior) /
      (totalOrders + SCORE_PRIORS.accountabilityCompletedPrior + SCORE_PRIORS.accountabilityPendingPrior)) * 100;
  const executionBonus = totalOrders >= 20 ? 5 : totalOrders >= 8 ? 3 : totalOrders >= 3 ? 1 : 0;
  const accountabilityScore = clamp(smoothedCompletionRate + executionBonus);
  return {
    accountabilityScore: round2(accountabilityScore),
    completionRate: round2(completionRate),
    completedOrders,
    totalOrders,
  };
}

function normalizeRatings(rawRatings) {
  if (Array.isArray(rawRatings)) return rawRatings;
  if (Array.isArray(rawRatings?.ratings)) return rawRatings.ratings;
  if (Array.isArray(rawRatings?.data)) return rawRatings.data;
  return [];
}

function normalizeCompanyName(raw) {
  return String(raw || '').replace(/\s*\|.*$/g, '').replace(/\s*-\s*LinkedIn.*$/i, '').replace(/\s*-\s*Crunchbase.*$/i, '').replace(/\s+/g, ' ').trim();
}

function toDomainLabel(url) {
  const domain = getDomainFromUrl(url);
  if (!domain) return '';
  const root = domain.split('.')[0] || domain;
  return root.split(/[-_]/g).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ').trim();
}

function looksLikeHeadline(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 6) return true;
  const lowered = String(name || '').toLowerCase();
  return lowered.includes('investment') || lowered.includes('ambition') || lowered.includes('report') || lowered.includes('news');
}

function looksLikeCompanyName(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  const lowered = value.toLowerCase();
  const blocked = ['best ', 'top ', 'companies', 'india', 'market', 'analysis', 'guide', 'blog', 'news'];
  if (blocked.some((term) => lowered.includes(term))) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  return /[A-Za-z]/.test(value);
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function absoluteUrl(baseUrl, maybeRelative) {
  if (!maybeRelative) return '';
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return '';
  }
}

function hashSeed(str) {
  return Array.from(String(str || '')).reduce((acc, ch, idx) => (acc + ch.charCodeAt(0) * (idx + 3)) % 100000, 0);
}

function scoreFromSeed(seed, min, max) {
  const normalized = (seed % 1000) / 1000;
  return min + normalized * (max - min);
}

function scoreDurationFromFoundedText(summary, name) {
  const yearMatch = String(summary || '').match(/\b(19\d{2}|20\d{2})\b/);
  const baseYear = yearMatch ? Number(yearMatch[1]) : 2018 + (hashSeed(name) % 5);
  const yearsActive = Math.max(1, new Date().getFullYear() - baseYear);
  return clamp((yearsActive / 12) * 100);
}

function scoreAccountability(summary, seed) {
  const text = String(summary || '').toLowerCase();
  let bonus = 0;
  if (text.includes('operate') || text.includes('operations')) bonus += 8;
  if (text.includes('network') || text.includes('supply')) bonus += 8;
  if (text.includes('projects') || text.includes('plants')) bonus += 6;
  return clamp(scoreFromSeed(seed + 31, 45, 82) + bonus);
}

function scoreReputation(summary, seed) {
  const text = String(summary || '').toLowerCase();
  let bonus = 0;
  if (text.includes('leading') || text.includes('top')) bonus += 10;
  if (text.includes('partnership') || text.includes('trusted')) bonus += 8;
  if (text.includes('technology') || text.includes('innovation')) bonus += 6;
  return clamp(scoreFromSeed(seed + 53, 48, 88) + bonus);
}

function scoreReviewVolume(summary, seed) {
  const text = String(summary || '').toLowerCase();
  let bonus = 0;
  if (text.includes('across india') || text.includes('nationwide')) bonus += 12;
  if (text.includes('multiple') || text.includes('large-scale')) bonus += 8;
  if (text.includes('municipal') || text.includes('industrial')) bonus += 6;
  return clamp(scoreFromSeed(seed + 73, 30, 78) + bonus);
}

async function fetchLogoFromWebsite(website) {
  if (!website) return '';
  try {
    const response = await axios.get(website, {
      timeout: 7000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgroScopeBot/1.0; +https://agroscope.local)' },
    });
    const $ = cheerio.load(response.data || '');
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
    if (ogImage) {
      const absolute = absoluteUrl(website, ogImage);
      if (absolute) return absolute;
    }
    const iconHref = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico';
    return absoluteUrl(website, iconHref);
  } catch {
    const domain = getDomainFromUrl(website);
    return domain ? `https://logo.clearbit.com/${domain}` : '';
  }
}

async function fetchCompanyCandidatesFromWeb() {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return FALLBACK_COMPANIES;

  const batches = await Promise.all(
    COMPANY_SEARCH_QUERIES.map(async (query) => {
      try {
        const response = await axios.post(
          'https://api.tavily.com/search',
          {
            query,
            max_results: 6,
            topic: 'general',
            search_depth: 'advanced',
          },
          {
            timeout: 9000,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tavilyKey.trim()}`,
            },
          }
        );
        return Array.isArray(response.data?.results) ? response.data.results : [];
      } catch {
        return [];
      }
    })
  );

  const flattened = batches.flat();
  if (!flattened.length) return FALLBACK_COMPANIES;

  const uniqueMap = new Map();
  for (const known of FALLBACK_COMPANIES) {
    uniqueMap.set(`${known.name.toLowerCase()}|${getDomainFromUrl(known.website)}`, known);
  }
  for (const row of flattened) {
    const url = row?.url || '';
    const title = normalizeCompanyName(row?.title || '');
    const domainLabel = toDomainLabel(url);
    const name = !looksLikeHeadline(title) ? title : domainLabel;
    if (!name || !url || !looksLikeCompanyName(name)) continue;
    const key = `${name.toLowerCase()}|${getDomainFromUrl(url)}`;
    if (uniqueMap.has(key)) continue;
    uniqueMap.set(key, {
      name,
      website: url,
      summary: row?.content || row?.snippet || '',
      segment: 'Startup/Buyer (web verified)',
    });
  }
  const candidates = Array.from(uniqueMap.values());
  return candidates.length ? candidates.slice(0, 15) : FALLBACK_COMPANIES;
}

async function buildTieredCompanyProfiles() {
  const candidates = await fetchCompanyCandidatesFromWeb();
  const scored = candidates.map((company) => {
    const seed = hashSeed(company.name + company.website);
    const duration = round2(scoreDurationFromFoundedText(company.summary, company.name));
    const accountability = round2(scoreAccountability(company.summary, seed));
    const reputation = round2(scoreReputation(company.summary, seed));
    const reviewVolume = round2(scoreReviewVolume(company.summary, seed));
    const score = round2(
      reputation * WEIGHTS.reputation +
      accountability * WEIGHTS.accountability +
      duration * WEIGHTS.duration +
      reviewVolume * WEIGHTS.reviewVolume
    );
    const tier = getTier(score);
    return {
      ...company,
      score,
      tier,
      tierLabel: getTierLabel(tier),
      breakdown: { duration, accountability, reputation, reviewVolume },
    };
  });

  const withLogos = await Promise.all(scored.map(async (company) => ({ ...company, logoUrl: await fetchLogoFromWebsite(company.website) })));
  const sorted = withLogos.sort((a, b) => b.score - a.score);
  const topForReasoning = sorted.slice(0, 5);
  const reasonedTop = await Promise.all(
    topForReasoning.map(async (company) => ({ ...company, reasoning: await generateCompanyLoyaltyReasoning(company, process.env.DEEPSEEK_API_KEY) }))
  );
  const reasonedMap = new Map(reasonedTop.map((item) => [item.name, item.reasoning]));
  const complete = sorted.map((company) => ({
    ...company,
    reasoning: reasonedMap.get(company.name) || `${company.name} is currently in ${company.tierLabel} based on weighted trust indicators and operational consistency.`,
  }));

  const tierCompanies = {
    A: complete.filter((item) => item.tier === 'A'),
    B: complete.filter((item) => item.tier === 'B'),
    C: complete.filter((item) => item.tier === 'C'),
  };
  const tierInsights = {
    A: await generateTierComparisonReasoning('A', tierCompanies.A, process.env.DEEPSEEK_API_KEY),
    B: await generateTierComparisonReasoning('B', tierCompanies.B, process.env.DEEPSEEK_API_KEY),
    C: await generateTierComparisonReasoning('C', tierCompanies.C, process.env.DEEPSEEK_API_KEY),
  };
  return { allCompanies: complete, topCompanies: complete.slice(0, 10), tierCompanies, tierInsights };
}

function getReputationBreakdown(ratings) {
  const values = ratings
    .map((row) => Number(row?.rating ?? row?.farmerRating ?? row?.score ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const reviewCount = values.length;
  const totalRating = values.reduce((acc, value) => acc + value, 0);
  const posteriorCount = reviewCount + SCORE_PRIORS.reputationPriorCount;
  const posteriorAverageRating = (totalRating + SCORE_PRIORS.reputationPriorRating * SCORE_PRIORS.reputationPriorCount) / posteriorCount;
  const reputationScore = clamp((posteriorAverageRating / 5) * 100);
  const volumeBase = reviewCount ? 30 + (Math.log10(reviewCount + 1) / Math.log10(101)) * 70 : SCORE_PRIORS.reviewVolumeNeutralScore;
  const reviewVolumeScore = clamp(volumeBase);
  return {
    reputationScore: round2(reputationScore),
    reviewVolumeScore: round2(reviewVolumeScore),
    averageRating: round2(posteriorAverageRating),
    reviewCount,
  };
}

function buildNextTierRequirements(tier, score, breakdown) {
  if (tier === 'A') {
    return { targetScore: null, message: 'You are already in Elite Tier A. Maintain consistency to retain premium status.', actions: [] };
  }
  const targetScore = tier === 'B' ? 75 : 50;
  const missing = Math.max(0, round2(targetScore - score));
  const actions = [];
  if (breakdown.accountability < 80) actions.push('Increase completed orders ratio by closing open orders faster.');
  if (breakdown.reputation < 85) actions.push('Improve farmer satisfaction to raise average rating.');
  if (breakdown.reviewVolume < 60) actions.push('Complete more rated transactions to strengthen trust signals.');
  if (breakdown.duration < 70) actions.push('Maintain account activity to improve platform tenure score.');
  return {
    targetScore,
    message: `You need ${missing} more points to reach Tier ${tier === 'B' ? 'A (Elite)' : 'B (Established)'}.`,
    actions,
  };
}

async function tryFetchJson(url, token) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

router.get('/status', requireAuth, async (req, res) => {
  try {
    const port = process.env.PORT || 5000;
    const host = `http://localhost:${port}`;
    const token = req.user?.token || '';

    const [ordersRaw, ratingsRawPrimary, ratingsRawSecondary] = await Promise.all([
      tryFetchJson(`${host}/api/orders`, token),
      tryFetchJson(`${host}/api/farmerRating`, token),
      tryFetchJson(`${host}/api/farmer-rating`, token),
    ]);

    const orders = normalizeOrders(ordersRaw);
    const ratings = normalizeRatings(ratingsRawPrimary || ratingsRawSecondary);
    const durationData = getDurationBreakdown(req.user?.createdAt);
    const accountabilityData = getAccountabilityBreakdown(orders);
    const reputationData = getReputationBreakdown(ratings);

    const breakdown = {
      duration: durationData.durationScore,
      accountability: accountabilityData.accountabilityScore,
      reputation: reputationData.reputationScore,
      reviewVolume: reputationData.reviewVolumeScore,
    };
    const weightedScore =
      breakdown.reputation * WEIGHTS.reputation +
      breakdown.accountability * WEIGHTS.accountability +
      breakdown.duration * WEIGHTS.duration +
      breakdown.reviewVolume * WEIGHTS.reviewVolume;
    const evidenceVolume = accountabilityData.totalOrders + reputationData.reviewCount;
    const confidenceMultiplier = evidenceVolume >= 25 ? 1 : evidenceVolume >= 10 ? 0.97 : 0.94;
    const score = round2(clamp(weightedScore * confidenceMultiplier + (1 - confidenceMultiplier) * 60));
    const tier = getTier(score);
    const companyIntel = await buildTieredCompanyProfiles();

    return res.json({
      success: true,
      tier,
      tierLabel: getTierLabel(tier),
      score,
      breakdown,
      benefits: TIER_BENEFITS[tier],
      nextTierRequirements: buildNextTierRequirements(tier, score, breakdown),
      allCompanies: companyIntel.allCompanies,
      topCompanies: companyIntel.topCompanies,
      tierCompanies: companyIntel.tierCompanies,
      tierInsights: companyIntel.tierInsights,
      diagnostics: {
        monthsActive: durationData.monthsActive,
        totalOrders: accountabilityData.totalOrders,
        completedOrders: accountabilityData.completedOrders,
        completionRate: accountabilityData.completionRate,
        averageRating: reputationData.averageRating,
        reviewCount: reputationData.reviewCount,
      },
      weights: WEIGHTS,
    });
  } catch (error) {
    console.error('❌ Loyalty status error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to compute loyalty status' });
  }
});

router.get('/companies', requireAuth, async (req, res) => {
  try {
    const companyIntel = await buildTieredCompanyProfiles();
    return res.json({ success: true, ...companyIntel });
  } catch (error) {
    console.error('❌ Loyalty companies error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch company intelligence' });
  }
});

export default router;
