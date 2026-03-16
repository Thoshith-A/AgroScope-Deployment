/**
 * Price evaluation: status from user input only.
 * < 50 = Below Market Price, 50–100 = Current Market Price, > 100 = Above Market Price.
 */
import express from 'express';
import { comparePrice, getMarketStatus, marketStatusToInternal } from '../services/marketPriceService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireNumber, requireString } from '../utils/validation.js';
import { DEMO_MODE } from '../config/demoMode.js';

const router = express.Router();

router.post(
  '/evaluate',
  asyncHandler(async (req, res) => {
    const wasteType = requireString(req.body.wasteType, 'wasteType', 1);
    const pricePerKg = requireNumber(req.body.pricePerKg, 'pricePerKg', 0);
    const stateOrLocation = (req.body.stateOrLocation && String(req.body.stateOrLocation).trim()) || '';

    // Status is always from user's price per kg (direct input)
    const market_status = getMarketStatus(pricePerKg);
    const { status, color } = marketStatusToInternal(market_status);

    let result;
    try {
      result = await comparePrice(wasteType, stateOrLocation, pricePerKg);
    } catch (err) {
      result = { status: 'NOT_CONFIGURED' };
    }

    const marketPrice = result.marketPrice ?? (DEMO_MODE ? 65 : null);
    const diff = marketPrice && marketPrice > 0 ? (pricePerKg - marketPrice) / marketPrice * 100 : 0;
    const isDemoPrice = result.source && String(result.source).includes('AI-generated');

    if (result.status === 'NOT_CONFIGURED' && !DEMO_MODE) {
      return res.json({
        status: status === 'ABOVE_MARKET' ? 'above' : status === 'BELOW_MARKET' ? 'below' : 'fair',
        label: market_status,
        color,
        marketPrice: null,
        market_status,
        source: null,
        lastUpdated: null,
        userPricePerKg: pricePerKg,
        differencePercent: null,
        isDemoPrice: false,
      });
    }

    res.json({
      status: status === 'ABOVE_MARKET' ? 'above' : status === 'BELOW_MARKET' ? 'below' : 'fair',
      label: market_status,
      color,
      marketPrice: marketPrice ?? result.marketPrice,
      market_status,
      source: isDemoPrice ? 'AI-generated market estimate' : (result.source || null),
      lastUpdated: result.lastUpdated || null,
      userPricePerKg: pricePerKg,
      differencePercent: Math.round(diff * 100) / 100,
      isDemoPrice: !!isDemoPrice,
    });
  })
);

export default router;
