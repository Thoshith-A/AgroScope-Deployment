/**
 * POST /api/vision/estimate-weight — Scale-aware weight estimation (Hand anchor 9 cm, semi-ellipsoid).
 * Optional: optionalReferenceObject, optionalMeasurement (never required).
 */

import express from 'express';
import multer from 'multer';
import { estimateWeightFromBuffer, testGeminiConnection } from '../services/visionWeightEstimatorService.js';

const router = express.Router();

router.get('/gemini-status', async (_req, res) => {
  try {
    const result = await testGeminiConnection();
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Check failed' });
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mt = (file.mimetype || '').toLowerCase();
    if (mt.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image (JPEG, PNG, WebP, GIF, BMP, etc.)'));
  },
});

router.post(
  '/estimate-weight',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, error: 'No image uploaded' });
      }
      const wasteTypeId = (req.body.wasteTypeId || '').trim();
      if (!wasteTypeId) {
        return res.status(400).json({ success: false, error: 'wasteTypeId is required' });
      }
      const optionalReferenceObject = (req.body.optionalReferenceObject || '').trim() || null;
      const optionalMeasurement = (req.body.optionalMeasurement || '').trim() || null;
      const unit = (req.body.unit === 'tonne' ? 'tonne' : 'kg');
      const userId = req.body.userId || req.user?.id || null;
      const listingId = req.body.listingId || null;

      const result = await estimateWeightFromBuffer({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        wasteTypeId,
        optionalReferenceObject,
        optionalMeasurement,
        unit,
        userId,
        listingId,
      });

      let response = {
        success: result.success,
        estimation: result.estimation,
        imageAnalysis: result.imageAnalysis,
        processingTimeMs: result.processingTimeMs,
      };
      if (unit === 'tonne') {
        response.estimation.estimatedWeightTonnes = result.estimation.estimatedWeightKg / 1000;
      }
      return res.json(response);
    } catch (err) {
      const msg = err.message || 'Estimation failed';
      if (msg.includes('Invalid image content')) {
        return res.status(400).json({ success: false, error: 'Invalid image content' });
      }
      if (msg.includes('10MB') || msg.includes('too large')) {
        return res.status(413).json({ success: false, error: 'Image file too large — please compress below 10MB' });
      }
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return res.status(503).json({ success: false, error: 'Google Vision API quota exceeded — please try again shortly' });
      }
      console.error('visionWeightEstimator error:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  }
);

export default router;
