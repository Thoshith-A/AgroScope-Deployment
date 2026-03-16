/**
 * Legacy: GET /api/farmer/:id/rating
 * Delegates to new Farmer Rating service. Id = FarmerRating document id.
 */
import express from 'express';
import { getRating } from '../services/farmerRatingService.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

router.get(
  '/:id/rating',
  asyncHandler(async (req, res) => {
    const result = await getRating(req.params.id);
    res.status(200).json(result);
  })
);

export default router;
