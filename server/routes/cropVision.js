// server/routes/cropVision.js
// Detect crop type from an image using Google Cloud Vision

import express from 'express';
import { detectCropFromBase64 } from '../services/cropVisionService.js';

const router = express.Router();

function toClientMessage(rawMessage) {
  const msg = String(rawMessage || '');
  if (/request entity too large|payload too large/i.test(msg)) {
    return 'Image is too large. Please upload/capture a smaller image and try again.';
  }
  if (/billing/i.test(msg)) {
    return 'Google Vision billing is not enabled for this project. Enable billing, then retry.';
  }
  if (/has not been used|is disabled|vision.googleapis.com/i.test(msg)) {
    return 'Google Vision API is not enabled for this project. Enable Vision API in Google Cloud Console, then retry.';
  }
  if (/GOOGLE_VISION_API_KEY|GOOGLE_APPLICATION_CREDENTIALS|GEMINI_API_KEY/i.test(msg)) {
    return 'Set GEMINI_API_KEY (same as weight estimation) or GOOGLE_VISION_API_KEY in server/.env, then retry.';
  }
  return msg || 'Crop detection failed';
}

router.post('/detect-crop', async (req, res) => {
  try {
    const { imageBase64, filenameHint } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'imageBase64 is required',
      });
    }

    const result = await detectCropFromBase64(imageBase64, filenameHint || null);

    if (!result.cropType) {
      return res.json({
        success: false,
        cropType: null,
        labels: result.labels,
        message: 'No supported crop type detected in image.',
      });
    }

    return res.json({
      success: true,
      cropType: result.cropType,
      labels: result.labels,
    });
  } catch (error) {
    const raw = error?.message || 'Vision detection failed';
    console.error('cropVision detect-crop error:', raw);
    return res.status(500).json({
      success: false,
      error: toClientMessage(raw),
    });
  }
});

export default router;
