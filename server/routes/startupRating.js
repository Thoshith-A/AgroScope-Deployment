/**
 * Legacy: GET /api/startup/:id/rating
 * Delegates to new Startup Rating service. Id = StartupRating document id.
 */
import express from 'express';
import { getRating } from '../services/startupRatingService.js';
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
