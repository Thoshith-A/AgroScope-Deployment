/**
 * POST /api/translate/website — batch translate entire site to a language.
 * Body: { langCode: "ta", langName: "Tamil" }
 * Returns: { success: true, langCode, translations: {...} } or { success: false, error: "..." }
 */
import express from 'express';
import { getTranslations } from '../services/translationService.js';

const router = express.Router();

const VALID_LANG_CODES = new Set([
  'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'pa', 'bn', 'or', 'as', 'ur', 'sa', 'mai', 'en',
  'zh', 'ja', 'ko', 'ar', 'fr', 'de', 'es', 'pt', 'ru', 'it', 'tr', 'vi', 'th', 'id', 'ms',
  'nl', 'pl', 'sv', 'no', 'da', 'fi', 'el', 'he', 'ro', 'hu', 'cs', 'sk', 'uk', 'ca', 'hr',
  'sr', 'bg', 'lt', 'lv', 'sw',
]);

router.post('/website', async (req, res) => {
  try {
    const { langCode, langName } = req.body || {};
    const code = typeof langCode === 'string' ? langCode.trim().toLowerCase() : '';
    const name = typeof langName === 'string' ? langName.trim() : (code || 'Unknown');

    if (!code) {
      return res.status(400).json({ success: false, error: 'langCode is required' });
    }
    if (!VALID_LANG_CODES.has(code)) {
      return res.status(400).json({ success: false, error: `Unsupported language: ${code}` });
    }

    if (code === 'en') {
      return res.status(200).json({ success: true, langCode: 'en', translations: null });
    }

    const translations = await getTranslations(code, name);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.status(200).json({ success: true, langCode: code, translations });
  } catch (err) {
    console.error('Translation route error:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Translation service failed. Please retry.',
    });
  }
});

export default router;
