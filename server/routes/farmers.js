/**
 * Controller: Farmers (rating system).
 * POST /api/farmers, PUT /api/farmers/:id/update-quality, GET /api/farmers/:id/rating
 */
import express from 'express';
import * as farmerRatingService from '../services/farmerRatingService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireString, requireNumber, ValidationError } from '../utils/validation.js';

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = requireString(req.body.name, 'name', 1);
    const grade = String(req.body.wasteQualityGrade ?? 'B').trim().toUpperCase();
    if (!['A', 'B', 'C'].includes(grade)) throw new ValidationError('wasteQualityGrade must be A, B, or C');
    const moisturePercentage = requireNumber(req.body.moisturePercentage, 'moisturePercentage', 0, 100);
    const result = await farmerRatingService.createFarmer({ name, wasteQualityGrade: grade, moisturePercentage });
    res.status(201).json(result);
  })
);

router.put(
  '/:id/update-quality',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    const grade = body.wasteQualityGrade !== undefined ? String(body.wasteQualityGrade).trim().toUpperCase() : undefined;
    if (grade !== undefined && !['A', 'B', 'C'].includes(grade)) throw new ValidationError('wasteQualityGrade must be A, B, or C');
    const result = await farmerRatingService.updateQuality(id, {
      wasteQualityGrade: grade,
      moisturePercentage: body.moisturePercentage !== undefined ? Number(body.moisturePercentage) : undefined,
    });
    res.status(200).json(result);
  })
);

router.get(
  '/:id/rating',
  asyncHandler(async (req, res) => {
    const result = await farmerRatingService.getRating(req.params.id);
    res.status(200).json(result);
  })
);

export default router;
