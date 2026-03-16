import express from 'express';
import { simulateCarbon } from '../services/carbonCalculatorService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireNumber, requireString } from '../utils/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/carbon/simulate:
 *   post:
 *     summary: Carbon credit simulator - CO2 saved by converting waste
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [wasteType, quantityTons]
 *             properties:
 *               wasteType: { type: string }
 *               quantityTons: { type: number }
 *     responses:
 *       200:
 *         description: CO2 saved, equivalent trees, carbon credits
 */
router.post(
  '/simulate',
  asyncHandler(async (req, res) => {
    const wasteType = requireString(req.body.wasteType, 'wasteType', 1);
    const quantityTons = requireNumber(req.body.quantityTons, 'quantityTons', 0.001);
    const result = simulateCarbon(wasteType, quantityTons);
    res.json(result);
  })
);

export default router;
