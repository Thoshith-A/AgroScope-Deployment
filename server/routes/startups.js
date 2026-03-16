/**
 * Controller: Startups (rating system).
 * POST /api/startups, PUT /api/startups/:id/update-performance, GET /api/startups/:id/rating
 */
import express from 'express';
import * as startupRatingService from '../services/startupRatingService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireString, requireNumber } from '../utils/validation.js';

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = requireString(req.body.name, 'name', 1);
    const totalTransactions = requireNumber(req.body.totalTransactions ?? 0, 'totalTransactions', 0);
    const onTimePayments = requireNumber(req.body.onTimePayments ?? 0, 'onTimePayments', 0);
    const delayedPayments = requireNumber(req.body.delayedPayments ?? 0, 'delayedPayments', 0);
    const logisticsUpdatesSent = requireNumber(req.body.logisticsUpdatesSent ?? 0, 'logisticsUpdatesSent', 0);
    const totalLogisticsRequired = requireNumber(req.body.totalLogisticsRequired ?? 0, 'totalLogisticsRequired', 0);
    const result = await startupRatingService.createStartup({
      name,
      totalTransactions,
      onTimePayments,
      delayedPayments,
      logisticsUpdatesSent,
      totalLogisticsRequired,
    });
    res.status(201).json(result);
  })
);

router.put(
  '/:id/update-performance',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    const result = await startupRatingService.updatePerformance(id, {
      totalTransactions: body.totalTransactions !== undefined ? Number(body.totalTransactions) : undefined,
      onTimePayments: body.onTimePayments !== undefined ? Number(body.onTimePayments) : undefined,
      delayedPayments: body.delayedPayments !== undefined ? Number(body.delayedPayments) : undefined,
      logisticsUpdatesSent: body.logisticsUpdatesSent !== undefined ? Number(body.logisticsUpdatesSent) : undefined,
      totalLogisticsRequired: body.totalLogisticsRequired !== undefined ? Number(body.totalLogisticsRequired) : undefined,
    });
    res.status(200).json(result);
  })
);

router.get(
  '/:id/rating',
  asyncHandler(async (req, res) => {
    const result = await startupRatingService.getRating(req.params.id);
    res.status(200).json(result);
  })
);

export default router;
