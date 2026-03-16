/**
 * DTOs for Market Price module.
 * No entity exposure. Clear request/response contracts.
 */

/** @typedef {{ wasteType: string, state: string, avgPricePerKg: number, source: string }} MarketPriceRequest */

/** @typedef {{ wasteType: string, state: string, marketPrice: number, source: string, lastUpdated: string }} MarketPriceResponse */

/**
 * @typedef {{
 *   wasteType?: string,
 *   state?: string,
 *   marketPrice?: number,
 *   userPrice?: number,
 *   status: 'ABOVE_MARKET'|'BELOW_MARKET'|'FAIR_PRICE'|'NOT_CONFIGURED',
 *   source?: string,
 *   lastUpdated?: string
 * }} PriceComparisonResponse
 */

/**
 * Build MarketPriceResponse from document.
 * @param {Object} doc - Repository document (wasteType, state, avgPricePerKg, source, lastUpdated)
 * @returns {MarketPriceResponse}
 */
export function toMarketPriceResponse(doc) {
  if (!doc) return null;
  return {
    wasteType: doc.wasteType,
    state: doc.state,
    marketPrice: Number(doc.avgPricePerKg),
    source: doc.source || 'Admin',
    lastUpdated: doc.lastUpdated ? new Date(doc.lastUpdated).toISOString() : null,
  };
}

/**
 * Build PriceComparisonResponse when configured.
 */
export function toPriceComparisonResponse(doc, userPrice, status) {
  return {
    wasteType: doc.wasteType,
    state: doc.state,
    marketPrice: Number(doc.avgPricePerKg),
    userPrice: Number(userPrice),
    status,
    source: doc.source || 'Admin',
    lastUpdated: doc.lastUpdated ? new Date(doc.lastUpdated).toISOString() : null,
  };
}

/**
 * NOT_CONFIGURED response (no market price in DB).
 * @returns {PriceComparisonResponse}
 */
export function notConfiguredResponse() {
  return { status: 'NOT_CONFIGURED' };
}
