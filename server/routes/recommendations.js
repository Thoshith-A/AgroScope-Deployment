import express from 'express';
import { getRecommendations } from '../services/recommendationService.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /api/recommendations/{wasteType}:
 *   get:
 *     summary: Waste-to-product recommendations
 *     parameters:
 *       - in: path
 *         name: wasteType
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Suggested products the waste can be converted into
 */
router.get(
  '/:wasteType',
  asyncHandler(async (req, res) => {
    const wasteType = decodeURIComponent(req.params.wasteType || '');
    const result = getRecommendations(wasteType);
    res.json(result);
  })
);

export default router;
