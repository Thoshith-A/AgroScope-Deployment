/**
 * Nearest cold storage hub – uses Nominatim + Haversine.
 * GET /api/cold-storage/nearest?location=<city/state>
 */
import express from 'express';
import { getNearestHub } from '../services/coldStorageService.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

router.get(
  '/nearest',
  asyncHandler(async (req, res) => {
    const location = (req.query.location && String(req.query.location).trim()) || '';
    const result = await getNearestHub(location);
    res.status(200).json(result);
  })
);

export default router;
