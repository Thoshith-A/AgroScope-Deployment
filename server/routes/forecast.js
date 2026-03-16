/**
 * Controller: Predictive Supply Forecast (30-day).
 * GET /api/forecast/ai-30days (DeepSeek), GET /api/forecast/:wasteType, POST /api/forecast/records
 */
import express from 'express';
import { get30DayForecast, createSupplyRecord, defaultTonsForNoData } from '../services/forecastService.js';
import { DEMO_MODE } from '../config/demoMode.js';
import { calculateForecast } from '../data/locationForecastData.js';
import { getCachedForecast, validateForecastParams } from '../services/deepseekForecast.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireString, requireNumber } from '../utils/validation.js';

const router = express.Router();

// Must be before /:wasteType
router.get('/ai-30days', async (req, res) => {
  const wasteType = (req.query.wasteType && String(req.query.wasteType).trim()) || 'paddy_husk';
  const city = (req.query.city && String(req.query.city).trim()) || 'Chennai';
  const quantity = req.query.quantity != null ? req.query.quantity : '1';
  const validated = validateForecastParams(wasteType, city, quantity);
  try {
    const result = await getCachedForecast(validated.wasteType, validated.city, validated.quantityTons);
    const hasDaily = Array.isArray(result.dailyForecast) && result.dailyForecast.length >= 30;
    const dailyForecast = hasDaily ? result.dailyForecast : [];
    let predictedTotalKg = result.predictedTotalKg;
    let bestSellWindow = result.bestSellWindow;
    let insight = result.insight;
    let finalDaily = dailyForecast;

    if (dailyForecast.length > 0 && (!predictedTotalKg || predictedTotalKg <= 0)) {
      predictedTotalKg = dailyForecast.reduce((s, d) => s + (d.forecastKg || 0), 0);
    }
    if (!hasDaily || !bestSellWindow?.trim() || !insight?.trim() || !predictedTotalKg) {
      const { getFallbackForecast } = await import('../services/forecastFallback.js');
      const fb = getFallbackForecast(validated.wasteType, validated.city, validated.quantityTons);
      if (!finalDaily.length) finalDaily = fb.dailyForecast;
      if (!predictedTotalKg) predictedTotalKg = fb.predictedTotalKg;
      if (!bestSellWindow?.trim()) bestSellWindow = fb.bestSellWindow;
      if (!insight?.trim()) insight = fb.insight;
    }

    return res.status(200).json({
      success: true,
      fromCache: result.fromCache || false,
      generatedAt: result.generatedAt || new Date().toISOString(),
      wasteType: validated.wasteType,
      city: validated.city,
      quantityTons: validated.quantityTons,
      predictedTotalKg: predictedTotalKg || 0,
      confidencePercent: result.confidencePercent ?? 75,
      trend: result.trend || 'STABLE',
      trendReason: result.trendReason || 'Based on seasonal patterns.',
      peakDay: result.peakDay ?? 11,
      peakReason: result.peakReason || 'Mid-period demand cycle.',
      bestSellWindow: bestSellWindow || 'Days 8–14',
      insight: insight || 'Sell within the best window for optimal price. Consider local mill demand.',
      priceImpact: result.priceImpact || 'neutral',
      source: result.source || 'deepseek',
      dailyForecast: finalDaily,
    });
  } catch (err) {
    console.warn('GET /api/forecast/ai-30days error:', err.message);
    const { getFallbackForecast } = await import('../services/forecastFallback.js');
    const fallback = getFallbackForecast(validated.wasteType, validated.city, validated.quantityTons);
    return res.status(200).json({
      success: true,
      fromCache: false,
      generatedAt: new Date().toISOString(),
      wasteType: validated.wasteType,
      city: validated.city,
      quantityTons: validated.quantityTons,
      ...fallback,
      dailyForecast: fallback.dailyForecast,
    });
  }
});

router.post(
  '/records',
  asyncHandler(async (req, res) => {
    const farmerId = requireString(req.body.farmerId ?? '', 'farmerId', 0);
    const wasteType = requireString(req.body.wasteType, 'wasteType', 1);
    const quantityInTons = requireNumber(req.body.quantityInTons, 'quantityInTons', 0);
    const result = await createSupplyRecord({ farmerId, wasteType, quantityInTons });
    res.status(201).json(result);
  })
);

// Backward compat: must be before /:wasteType
router.get(
  '/next-30-days',
  asyncHandler(async (req, res) => {
    const wasteType =
      (req.query.wasteType && String(req.query.wasteType).trim()) || 'paddy_husk';
    const city =
      (req.query.city && String(req.query.city).trim()) || 'Chennai';

    const result = calculateForecast({ city, wasteType });

    res.status(200).json(result);
  })
);

router.get(
  '/:wasteType',
  asyncHandler(async (req, res) => {
    const wasteType = requireString(req.params.wasteType, 'wasteType', 1);
    try {
      const result = await get30DayForecast(wasteType);
      res.status(200).json({
        ...result,
        predictedTonsNext30Days: result.predictedNext30Days,
      });
    } catch (err) {
      const fallback = defaultTonsForNoData(wasteType);
      res.status(200).json({
        wasteType,
        lastThreeMonthAverage: fallback,
        predictedNext30Days: fallback,
        predictedTonsNext30Days: fallback,
        confidenceLevel: DEMO_MODE ? 'HIGH' : 'LOW',
        confidencePercent: DEMO_MODE ? 85 : undefined,
        isDemo: DEMO_MODE,
      });
    }
  })
);

export default router;
