/**
 * Service: MarketPriceService
 * Fixed business rules for price classification (hackathon demo).
 * DEMO_MODE: always show market price; when missing, auto-generate 45–110.
 */
import * as repo from '../repositories/marketPriceRepository.js';
import {
  toMarketPriceResponse,
  toPriceComparisonResponse,
  notConfiguredResponse,
} from '../dtos/marketPriceDtos.js';
import { MarketPriceNotFoundException } from '../exceptions/MarketPriceNotFoundException.js';
import { DEMO_MODE } from '../config/demoMode.js';

/** Fixed price classification from user input: < 50 Below, 50–100 Current, > 100 Above. */
export function getMarketStatus(pricePerKg) {
  const p = Number(pricePerKg);
  if (p < 50) return 'Below Market Price';
  if (p > 100) return 'Above Market Price';
  return 'Current Market Price'; // 50 to 100 inclusive
}

/** Map market_status to internal status and color for UI. */
export function marketStatusToInternal(marketStatus) {
  if (marketStatus === 'Above Market Price') return { status: 'ABOVE_MARKET', color: 'red' };
  if (marketStatus === 'Below Market Price') return { status: 'BELOW_MARKET', color: 'blue' };
  return { status: 'FAIR_PRICE', color: 'green' }; // Current Market Price
}

/**
 * Resolve location string to state (e.g. Chennai → Tamil Nadu).
 */
const LOCATION_TO_STATE = {
  chennai: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  madurai: 'Tamil Nadu',
  trichy: 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  bangalore: 'Karnataka',
  bengaluru: 'Karnataka',
  mysore: 'Karnataka',
  karnataka: 'Karnataka',
  mumbai: 'Maharashtra',
  pune: 'Maharashtra',
  nagpur: 'Maharashtra',
  maharashtra: 'Maharashtra',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  hyderabad: 'Telangana',
  telangana: 'Telangana',
  kolkata: 'West Bengal',
  'west bengal': 'West Bengal',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  gujarat: 'Gujarat',
  chandigarh: 'Punjab',
  ludhiana: 'Punjab',
  punjab: 'Punjab',
};

function resolveState(stateOrLocation) {
  if (!stateOrLocation || typeof stateOrLocation !== 'string') return '';
  const key = stateOrLocation.trim().toLowerCase();
  return LOCATION_TO_STATE[key] || stateOrLocation.trim();
}

/**
 * 1) Save or update price. If exists → update avgPricePerKg, source, lastUpdated; else create.
 * @param {import('../dtos/marketPriceDtos.js').MarketPriceRequest} request
 * @returns {Promise<import('../dtos/marketPriceDtos.js').MarketPriceResponse>}
 */
export async function saveOrUpdatePrice(request) {
  const entity = {
    wasteType: String(request.wasteType).trim(),
    state: String(request.state).trim(),
    avgPricePerKg: Number(request.avgPricePerKg),
    source: String(request.source || '').trim() || 'Admin',
  };
  const doc = await repo.save(entity);
  return toMarketPriceResponse(doc);
}

/**
 * 2) Get market price by wasteType and state. Throws if not found.
 * @param {string} wasteType
 * @param {string} stateOrLocation - state or city (e.g. Chennai)
 * @returns {Promise<import('../dtos/marketPriceDtos.js').MarketPriceResponse>}
 */
export async function getMarketPrice(wasteType, stateOrLocation) {
  const state = resolveState(stateOrLocation) || stateOrLocation?.trim();
  let doc = null;
  if (state) {
    doc = await repo.findByWasteTypeIgnoreCaseAndStateIgnoreCase(wasteType, state);
  }
  if (!doc) {
    doc = await repo.findByWasteTypeIgnoreCase(wasteType);
  }
  if (!doc) {
    throw new MarketPriceNotFoundException(wasteType, state || stateOrLocation || '');
  }
  return toMarketPriceResponse(doc);
}

/** Demo: generate market price in 45–110 range (realistic for hackathon). */
function getDemoMarketPrice(wasteType) {
  let h = 0;
  const s = String(wasteType || '').trim();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const price = Math.round((45 + (h % 6600) / 100) * 100) / 100; // 45–110
  return Math.min(110, Math.max(45, price));
}

/**
 * 3) Compare: fixed business rules for market_status from user price_per_kg.
 * Market price is ALWAYS returned (from DB or generated 45–110 in DEMO_MODE).
 * Status: < 50 Below, 60–80 Current, > 100 Above.
 */
export async function comparePrice(wasteType, stateOrLocation, userPrice) {
  const state = resolveState(stateOrLocation) || stateOrLocation?.trim();
  let doc = null;
  if (state) {
    doc = await repo.findByWasteTypeIgnoreCaseAndStateIgnoreCase(wasteType, state);
  }
  if (!doc) {
    doc = await repo.findByWasteTypeIgnoreCase(wasteType);
  }

  const marketStatus = getMarketStatus(userPrice);
  const { status, color } = marketStatusToInternal(marketStatus);

  if (!doc) {
    if (DEMO_MODE) {
      const marketPrice = getDemoMarketPrice(wasteType);
      return {
        wasteType: String(wasteType).trim(),
        state: state || 'India',
        marketPrice,
        userPrice: Number(userPrice),
        status,
        market_status: marketStatus,
        source: 'AI-generated market estimate',
        lastUpdated: new Date().toISOString(),
      };
    }
    return notConfiguredResponse();
  }

  const marketPrice = Number(doc.avgPricePerKg);
  const res = toPriceComparisonResponse(doc, userPrice, status);
  res.market_status = marketStatus;
  return res;
}

/**
 * Seed default market prices when collection is empty. No duplicates (upsert by wasteType+state).
 */
export async function seedMarketPricesIfEmpty() {
  try {
    const n = await repo.count();
    if (n > 0) return;
    const defaults = [
      { wasteType: 'Paddy Husk', state: 'Tamil Nadu', avgPricePerKg: 5.5, source: 'Admin - Jan 2026' },
      { wasteType: 'Wheat Straw', state: 'Tamil Nadu', avgPricePerKg: 1.8, source: 'Admin - Jan 2026' },
      { wasteType: 'Corn Stalks', state: 'Tamil Nadu', avgPricePerKg: 0.8, source: 'Admin - Jan 2026' },
      { wasteType: 'Sugarcane Bagasse', state: 'Tamil Nadu', avgPricePerKg: 5.5, source: 'Admin - Jan 2026' },
      { wasteType: 'Coconut Shells', state: 'Tamil Nadu', avgPricePerKg: 30.0, source: 'Admin - Jan 2026' },
    ];
    for (const row of defaults) {
      await repo.save(row);
    }
    console.log('📦 Market prices: seeded. Check price will now work.');
  } catch (err) {
    console.warn('⚠️ Market price seed skipped:', err.message);
  }
}
