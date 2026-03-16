/**
 * Weight Estimation (AgroScope): Gemini API primary, Vision + scale-aware math fallback.
 * Uses GEMINI_API_KEY for AI weight/volume estimate from image + context.
 * Vision OBJECT_LOCALIZATION detects Hand for scale anchor; if Gemini unavailable, uses semi-ellipsoid (handheld) or macro volume.
 */

import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDensityKgM3, WASTE_TYPE_ID_TO_LABEL } from '../data/wasteDensities.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GOOGLE_CLOUD_SCOPE = ['https://www.googleapis.com/auth/cloud-platform'];
const MAX_IMAGE_SIZE_BYTES = (process.env.VISION_MAX_IMAGE_SIZE_MB || 10) * 1024 * 1024;
const CARBON_FACTOR_KG_PER_TONNE = 1.5;
const CERTIFICATION_STANDARD = 'AgroScope Visual Estimate v1';
const GEMINI_MODEL_PRIMARY = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
// Fallback models to try (Google Cloud keys may have access to different models)
const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

const ANCHOR_WIDTH_CM = {
  hand: 9.0,
  finger: 2.0,
  person: 100.0,
  macro_pile: 100.0,
};

const HANDHELD_WEIGHT_CAP_KG = 2.0;
const HANDHELD_SANITY_CAP_KG = 0.5;

// Lazy-load sharp so server starts even if optional sharp is missing (e.g. on Render)
let _sharp; // undefined = not loaded, null = failed, object = loaded
async function getSharp() {
  if (_sharp !== undefined) return _sharp;
  try {
    _sharp = (await import('sharp')).default;
  } catch {
    _sharp = null;
  }
  return _sharp;
}

function imageHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function callVisionApi(imageBase64, apiKey, getToken) {
  const body = {
    requests: [{
      image: { content: imageBase64 },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 20 },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'TEXT_DETECTION' },
      ],
    }],
  };
  const url = apiKey
    ? `${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`
    : VISION_ENDPOINT;
  const headers = { 'Content-Type': 'application/json' };
  if (!apiKey && getToken) headers.Authorization = `Bearer ${await getToken()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Vision API ${res.status}`);
  return json?.responses?.[0] || {};
}

function normalizedBoxWidth(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 2) return 0;
  const xs = vertices.map((v) => v.x ?? 0);
  return Math.max(0, Math.max(...xs) - Math.min(...xs));
}

function normalizedBoxHeight(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 2) return 0;
  const ys = vertices.map((v) => v.y ?? 0);
  return Math.max(0, Math.max(...ys) - Math.min(...ys));
}

/**
 * Detect scale anchor from Vision localizedObjectAnnotations.
 * Returns { anchorType: 'hand'|'finger'|'macro_pile', handWidthPx, handHeightPx, vertices, name } or null for macro.
 */
function detectScaleAnchor(visionResponse, imageWidth, imageHeight) {
  const objects = visionResponse?.localizedObjectAnnotations || [];
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);
  for (const obj of objects) {
    const name = (obj.name || '').toLowerCase();
    const verts = obj.boundingPoly?.normalizedVertices;
    if (!verts || verts.length < 2) continue;
    const nw = normalizedBoxWidth(verts);
    const nh = normalizedBoxHeight(verts);
    const widthPx = nw * w;
    const heightPx = nh * h;
    if (name === 'hand') {
      return { anchorType: 'hand', handWidthPx: widthPx, handHeightPx: heightPx, vertices: verts, name: 'Hand' };
    }
    if (name === 'finger') {
      return { anchorType: 'finger', handWidthPx: widthPx, handHeightPx: heightPx, vertices: verts, name: 'Finger' };
    }
  }
  return null;
}

/**
 * Semi-ellipsoid volume: V = (2/3) * π * a * b * c (a,b base semi-axes, c height).
 * Here we use r_width for both base radii and height = real_h_cm.
 * Volume in cm³ → weight via density in kg/m³ (1 m³ = 1,000,000 cm³).
 */
function calculateWeightHandheld(handWidthPx, pileWidthPx, pileHeightPx, imageWidth, imageHeight, densityKgM3, anchorType) {
  const anchorCm = ANCHOR_WIDTH_CM[anchorType] ?? ANCHOR_WIDTH_CM.hand;
  if (!(handWidthPx > 0)) {
    const fallbackVolumeCm3 = 200;
    const volumeM3 = fallbackVolumeCm3 / 1_000_000;
    return { weightKg: volumeM3 * densityKgM3, volumeM3, volumeCm3: fallbackVolumeCm3 };
  }
  const pixelsToCm = anchorCm / handWidthPx;
  const realWidthCm = pileWidthPx * pixelsToCm;
  const realHeightCm = pileHeightPx * pixelsToCm;
  const rWidth = realWidthCm / 2;
  const volumeCm3 = (2 / 3) * Math.PI * (rWidth * rWidth) * Math.max(0.5, realHeightCm);
  const volumeM3 = volumeCm3 / 1_000_000;
  let weightKg = volumeM3 * densityKgM3;
  if (anchorType === 'hand' || anchorType === 'finger') {
    if (weightKg > HANDHELD_SANITY_CAP_KG) {
      weightKg = Math.min(weightKg, 0.025);
    }
    weightKg = Math.min(weightKg, HANDHELD_WEIGHT_CAP_KG);
  }
  return { weightKg, volumeM3, volumeCm3 };
}

/**
 * Macro mode: no hand anchor. Use frame coverage to estimate volume in m³.
 * Adjusted for "Demo/Tabletop" context to avoid 114kg values for small unanchored shots.
 */
function calculateWeightMacro(frameCoveragePercent, densityKgM3) {
  const coverage = Math.min(95, Math.max(5, frameCoveragePercent || 25)) / 100;
  // Previously assumed massive 2.5m³ fallback:
  // const volumeM3 = coverage * 2.5; 
  // For LIVE DEMOS, typically taking place on a table, 0.05m³ (50 Liters max volume) is more reasonable when scaling without explicit anchor. 
  const assumedMaxVolume = 0.05; 
  const volumeM3 = coverage * assumedMaxVolume;
  const fillFactor = 0.4;
  const weightKg = volumeM3 * densityKgM3 * fillFactor;
  return { weightKg, volumeM3, volumeCm3: volumeM3 * 1_000_000 };
}

/** Frame coverage from Vision bounding boxes (sum of areas, normalized 0–1). */
function frameCoverageFromVision(visionResponse) {
  const objects = visionResponse?.localizedObjectAnnotations || [];
  if (objects.length === 0) return null;
  let total = 0;
  for (const obj of objects) {
    const verts = obj.boundingPoly?.normalizedVertices;
    if (!Array.isArray(verts) || verts.length < 3) continue;
    const w = normalizedBoxWidth(verts);
    const h = normalizedBoxHeight(verts);
    total += w * h;
  }
  const percent = Math.min(100, Math.round(total * 100));
  return percent > 0 ? percent : null;
}

const GEMINI_MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const GEMINI_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

async function resizeForGemini(buffer, mimeType) {
  const sharp = await getSharp();
  const mt = (mimeType || 'image/jpeg').toLowerCase();
  const needsConvert = !GEMINI_IMAGE_TYPES.includes(mt);
  const needsResize = sharp && buffer.length > GEMINI_MAX_IMAGE_BYTES;
  if (!sharp || (!needsConvert && !needsResize)) {
    return { buffer, mimeType: GEMINI_IMAGE_TYPES.includes(mt) ? mt : 'image/jpeg' };
  }
  try {
    let pipeline = sharp(buffer);
    if (needsResize) pipeline = pipeline.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
    const out = await pipeline.jpeg({ quality: 85 }).toBuffer();
    return { buffer: out, mimeType: 'image/jpeg' };
  } catch (_) {
    return { buffer, mimeType: mt };
  }
}

async function sharpAnalysis(buffer) {
  const sharp = await getSharp();
  if (!sharp) {
    return { width: 0, height: 0, channels: 0, aspectRatio: 1, imageAngle: 'unknown' };
  }
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const aspectRatio = width && height ? width / height : 1;
  let imageAngle = 'unknown';
  if (aspectRatio >= 1.2) imageAngle = 'top-down';
  else if (aspectRatio <= 0.85) imageAngle = 'side';
  else if (aspectRatio > 0.9 && aspectRatio < 1.15) imageAngle = 'angled';
  return {
    width,
    height,
    channels: meta.channels || 0,
    aspectRatio,
    imageAngle,
  };
}

const SCALE_ANCHOR_HINTS = {
  AGR_002: 'Identify individual sugarcane stalks or fibrous pieces. Typical stalk diameter is 2–5 cm; use this as your visual ruler. Do NOT guess pile volume directly.',
  AGR_001: 'Identify stalks, straw strands, or a hand if visible. Straw diameter ~0.3–0.5 cm; hand width ~9 cm. Use one as your visual ruler.',
  AGR_003: 'Identify corn stalks or cobs. Stalk diameter ~2–3 cm, cob length ~15–20 cm. Use as visual ruler.',
  COCO_SHL: 'Identify coconut shell fragments. Typical piece ~5–10 cm. Use as visual ruler.',
  DEFAULT: 'Identify the smallest visible repeated unit (stalks, pieces, or a hand ~9 cm) and state its real-world size in cm. Use it as your visual ruler.',
};

function getScaleAnchorHint(wasteTypeId) {
  return SCALE_ANCHOR_HINTS[wasteTypeId] || SCALE_ANCHOR_HINTS.DEFAULT;
}

const GEMINI_SYSTEM_PROMPT = `You are an expert at estimating the weight of agricultural waste from a photo using strict scale-anchored measurement. Context includes wasteTypeLabel, densityKgM3, and scaleAnchorHint — use scaleAnchorHint for the waste type when provided.

CRITICAL RULE: Never estimate total volume without first anchoring scale to the diameter (or size) of visible materials. You must follow these steps in order:

STEP 1 — ESTABLISH SCALE
Identify individual visible units in the image (e.g. sugarcane stalks, straw strands, hand, shells). State their typical real-world size in centimeters (e.g. sugarcane stalk diameter 2–5 cm, hand width ~9 cm, tabletop elements). If this appears to be an indoor or tabletop 'Live Demo', assume small scales such as a few hundred grams to a couple kilograms max.

STEP 2 — RELATIVE MEASUREMENT
Using the thickness/size of one unit as a ruler, count or estimate how many units span the pile in width, length, and depth. Report dimensions in centimeters (width_cm, length_cm, depth_cm). If the pile is irregular, estimate an approximate box or cylinder that would contain it. Avoid assuming huge depths for tabletop samples.

STEP 3 — CALCULATE VOLUME
Convert dimensions to meters (divide cm by 100). Compute volume in cubic meters using geometry (e.g. box: L×W×H; cylinder: π×r²×h; cone: (1/3)×π×r²×h). You MUST derive volume from the dimensions in Step 2. Do NOT guess or invent a total volume.

STEP 4 — APPLY DENSITY
Weight (kg) = volume (m³) × density (kg/m³). Use the density provided in Context. Wait! Sanity Check: If this looks like a handful or a small bowl (tabletop demo), cap weight at 0.5kg to 3kg maximum.

STEP 5 — OUTPUT JSON
Return ONLY a single JSON object, no markdown. Use these exact keys:
estimatedWeightKg (number), confidencePercent (0–100), weightRangeKg (object with min, max), estimatedVolumeCubicMetres (number), densityUsedKgM3 (number), geometryAssumed (string, e.g. "box" or "cone"), estimationMethod (string, e.g. "scale-anchored to stalk diameter"), reasoning (string: detailed ai_reasoning explaining Steps 1–4, the exact math, and visual anchors used), warningFlags (array of strings), improvementSuggestions (array of strings).

Example reasoning format: "Scale: single stalk ~3 cm. Indoor tabletop demo assumed. Pile spans ~20 stalks width, ~15 length, ~5 depth → 60×45×15 cm = 0.0405 m³. Weight = 0.0405 × 150 = 6.07 kg. (Capped to 2.5kg based on visual sanity check)."`;

function tryParseGeminiJson(text) {
  if (!text || typeof text !== 'string') return null;
  let clean = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/\r\n/g, '\n')
    .trim();
  const candidates = [];
  let i = 0;
  while (i < clean.length) {
    const start = clean.indexOf('{', i);
    if (start < 0) break;
    let depth = 0;
    let end = -1;
    for (let j = start; j < clean.length; j++) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') {
        depth--;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    if (end > start) {
      candidates.push(clean.slice(start, end));
      i = end;
    } else {
      i = start + 1;
    }
  }
  const normalizeParsed = (parsed) => {
    if (!parsed || typeof parsed !== 'object') return null;
    const rawWeight = parsed.estimatedWeightKg ?? parsed.estimated_weight_kg ?? parsed.weight_kg;
    const weight = typeof rawWeight === 'string' ? Number(rawWeight.replace(/,/g, '')) : Number(rawWeight);
    if (!Number.isFinite(weight) || weight < 0) return null;
    const volume = Number(parsed.estimatedVolumeCubicMetres ?? parsed.calculated_volume_m3 ?? parsed.estimated_volume_m3);
    const density = Number(parsed.densityUsedKgM3 ?? parsed.density_kg_m3) || 120;
    const reasoning = String(parsed.reasoning ?? parsed.ai_reasoning ?? '');
    return {
      estimatedWeightKg: weight,
      confidencePercent: Math.min(100, Math.max(0, Number(parsed.confidencePercent ?? parsed.confidence_percent) || 70)),
      weightRangeKg: parsed.weightRangeKg && typeof parsed.weightRangeKg === 'object'
        ? { min: Number(parsed.weightRangeKg.min) || weight * 0.6, max: Number(parsed.weightRangeKg.max) || weight * 1.5 }
        : { min: weight * 0.6, max: weight * 1.5 },
      estimatedVolumeCubicMetres: Number.isFinite(volume) ? volume : weight / density,
      densityUsedKgM3: density,
      geometryAssumed: String(parsed.geometryAssumed ?? parsed.geometry_assumed ?? 'unknown').slice(0, 100),
      estimationMethod: String(parsed.estimationMethod ?? parsed.estimation_method ?? 'Gemini AI').slice(0, 200),
      reasoning,
      warningFlags: Array.isArray(parsed.warningFlags) ? parsed.warningFlags : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
    };
  };

  const tryParse = (str) => {
    const fixed = str
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    try {
      const parsed = JSON.parse(fixed);
      return normalizeParsed(parsed);
    } catch (_) {
      try {
        const parsed = JSON.parse(str.replace(/,(\s*[}\]])/g, '$1').trim());
        return normalizeParsed(parsed);
      } catch (__) {
        return null;
      }
    }
  };

  for (const raw of candidates) {
    const out = tryParse(raw);
    if (out) return out;
  }
  const extracted = extractWeightFromText(clean);
  if (extracted) return extracted;
  const keyVal = extractJsonKeyValues(clean);
  if (keyVal) return keyVal;
  return null;
}

function extractJsonKeyValues(text) {
  if (!text || typeof text !== 'string') return null;
  const num = (key) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*([0-9]+\\.[0-9]*|[0-9]+)`, 'i'));
    return m ? Number(m[1]) : null;
  };
  const weight = num('estimatedWeightKg') ?? num('estimated_weight_kg') ?? num('weight_kg');
  if (weight == null || !Number.isFinite(weight) || weight < 0) return null;
  const volume = num('estimatedVolumeCubicMetres') ?? num('calculated_volume_m3') ?? num('estimated_volume_m3');
  const density = num('densityUsedKgM3') ?? num('density_kg_m3') ?? 120;
  const conf = num('confidencePercent') ?? num('confidence_percent');
  return {
    estimatedWeightKg: weight,
    confidencePercent: Math.min(100, Math.max(0, conf ?? 70)),
    weightRangeKg: { min: weight * 0.6, max: weight * 1.5 },
    estimatedVolumeCubicMetres: Number.isFinite(volume) ? volume : weight / density,
    densityUsedKgM3: density,
    geometryAssumed: 'unknown',
    estimationMethod: 'Gemini AI',
    reasoning: '',
    warningFlags: [],
    improvementSuggestions: [],
  };
}

function extractWeightFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const weightMatch = text.match(/"estimatedWeightKg"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/"estimated_weight_kg"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/estimatedWeightKg["\s:]+([0-9]+\.?[0-9]*)/i)
    || text.match(/estimated_weight_kg["\s:]+([0-9]+\.?[0-9]*)/i)
    || text.match(/"weight_kg"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/weight[_\s]*(?:in)?\s*kg["\s:]+([0-9]+\.?[0-9]*)/i)
    || text.match(/([0-9]+\.?[0-9]*)\s*kg\s*(?:weight|estimate)/i)
    || text.match(/(?:weight|estimate)[^\d]*([0-9]+\.?[0-9]*)\s*kg/i)
    || text.match(/(?:~|approx\.?|approximately)\s*([0-9]+\.?[0-9]*)\s*kg/i)
    || text.match(/\b([0-9]+\.?[0-9]*)\s*kg\b/i)
    || text.match(/([0-9]+\.?[0-9]*)\s*tonnes?\b/i);
  let weight = weightMatch ? Number(weightMatch[1]) : NaN;
  if (weightMatch && /tonnes?\b/i.test(weightMatch[0])) weight *= 1000;
  if (!Number.isFinite(weight) || weight < 0 || weight > 1e6) return null;
  const confMatch = text.match(/"confidencePercent"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/"confidence"\s*:\s*([0-9]+\.?[0-9]*)/i);
  const confidence = confMatch ? Math.min(100, Math.max(0, Number(confMatch[1]))) : 70;
  const reasoningMatch = text.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    || text.match(/"ai_reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const reasoning = reasoningMatch ? reasoningMatch[1].replace(/\\"/g, '"') : '';
  const densityMatch = text.match(/"densityUsedKgM3"\s*:\s*([0-9]+\.?[0-9]*)/i);
  const density = densityMatch ? Number(densityMatch[1]) || 120 : 120;
  const volMatch = text.match(/"estimatedVolumeCubicMetres"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/"calculated_volume_m3"\s*:\s*([0-9]+\.?[0-9]*)/i)
    || text.match(/"estimatedVolumeCubicMetres"\s*:\s*([0-9]*\.[0-9]+)/i)
    || text.match(/"calculated_volume_m3"\s*:\s*([0-9]*\.[0-9]+)/i);
  const volume = volMatch ? Number(volMatch[1]) : weight / density;
  const geomMatch = text.match(/"geometryAssumed"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  const geometry = geomMatch ? geomMatch[1].slice(0, 100) : 'unknown';
  const methodMatch = text.match(/"estimationMethod"\s*:\s*"((?:[^"\\]|\\.)*)"/i)
    || text.match(/"estimation_method"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  const method = methodMatch ? methodMatch[1].slice(0, 200) : 'Scale-anchored (Gemini AI)';
  return {
    estimatedWeightKg: weight,
    confidencePercent: confidence,
    weightRangeKg: { min: weight * 0.6, max: weight * 1.5 },
    estimatedVolumeCubicMetres: volume,
    densityUsedKgM3: density,
    geometryAssumed: geometry,
    estimationMethod: method,
    reasoning: reasoning || `Estimated ${weight} kg from image.`,
    warningFlags: [],
    improvementSuggestions: [],
  };
}

async function callGeminiWithModel(apiKey, model, imageBase64, mimeType, contextStr) {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
        { text: `Context:\n${contextStr}\n\n${GEMINI_SYSTEM_PROMPT}` },
      ],
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  let data = await res.json().catch(() => ({}));
  if (!res.ok && res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error || res.statusText;
    return { ok: false, error: `${res.status}: ${errMsg}`, model };
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  let text = null;
  let parsed = null;
  const allText = parts.map((p) => (p?.text || '').trim()).filter(Boolean).join('\n');
  for (let i = parts.length - 1; i >= 0; i--) {
    const t = (parts[i]?.text || '').trim();
    if (!t) continue;
    parsed = tryParseGeminiJson(t);
    if (parsed) {
      text = t;
      break;
    }
    if (!text) text = t;
  }
  if (!parsed && allText) parsed = tryParseGeminiJson(allText);
  if (!text && !allText) {
    const blockReason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    return { ok: false, error: blockReason || 'No text in response', model };
  }
  if (!parsed) parsed = tryParseGeminiJson(text || allText);
  if (!parsed) return { ok: false, error: 'Invalid JSON from model', model };
  return { ok: true, result: parsed, model };
}

async function callGemini(imageBase64, mimeType, context) {
  const apiKey = (
    (process.env.GEMINI_API_KEY || '').trim() ||
    (process.env.GOOGLE_VISION_API_KEY || '').trim() ||
    (process.env.GOOGLE_CLOUD_VISION_API_KEY || '').trim()
  );
  if (!apiKey) {
    console.warn('Gemini: GEMINI_API_KEY (or GOOGLE_VISION_API_KEY) is not set in environment');
    return { result: null, noKey: true, errorMessage: null };
  }
  const contextStr = JSON.stringify(context, null, 2);
  const modelsToTry = [GEMINI_MODEL_PRIMARY, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== GEMINI_MODEL_PRIMARY)];
  let lastError = 'Gemini request failed';
  for (const model of modelsToTry) {
    try {
      const out = await callGeminiWithModel(apiKey, model, imageBase64, mimeType, contextStr);
      if (out.ok) {
        return { result: out.result, noKey: false, errorMessage: null };
      }
      lastError = out.error || lastError;
      if (out.error && !String(out.error).includes('not found') && !String(out.error).includes('404')) {
        break;
      }
    } catch (e) {
      lastError = (e && (e.message || e.reason)) || String(e) || lastError;
    }
  }
  console.warn('Gemini API error (all models tried):', lastError);
  return { result: null, noKey: false, errorMessage: lastError };
}

export async function testGeminiConnection() {
  const apiKey = (
    (process.env.GEMINI_API_KEY || '').trim() ||
    (process.env.GOOGLE_VISION_API_KEY || '').trim() ||
    (process.env.GOOGLE_CLOUD_VISION_API_KEY || '').trim()
  );
  if (!apiKey) {
    return { ok: false, error: 'No API key set. Set GEMINI_API_KEY or GOOGLE_VISION_API_KEY in server/.env' };
  }
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with OK' }] }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.error?.code || res.statusText;
      return { ok: false, error: `${res.status}: ${msg}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && (e.message || e.reason)) || String(e) };
  }
}

export async function estimateWeightFromBuffer({
  buffer,
  mimeType,
  wasteTypeId,
  optionalReferenceObject,
  optionalMeasurement,
  unit = 'kg',
  userId = null,
  listingId = null,
}) {
  const start = Date.now();
  if (!buffer || buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(buffer?.length > MAX_IMAGE_SIZE_BYTES ? 'Image exceeds 10MB' : 'No image provided');
  }
  const visionBase64 = buffer.toString('base64');
  const { buffer: geminiBuffer, mimeType: geminiMime } = await resizeForGemini(buffer, mimeType);
  const geminiBase64 = geminiBuffer.toString('base64');
  const apiKey = (
    (process.env.GOOGLE_VISION_API_KEY || '').trim() ||
    (process.env.GOOGLE_CLOUD_VISION_API_KEY || '').trim() ||
    (process.env.GEMINI_API_KEY || '').trim()
  );
  let getToken;
  if (!apiKey && (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()) {
    const auth = new GoogleAuth({ scopes: GOOGLE_CLOUD_SCOPE });
    getToken = async () => {
      const client = await auth.getClient();
      const creds = await client.authorize();
      return creds.access_token;
    };
  }

  let visionResponse = {};
  let sharpResult = { width: 0, height: 0, channels: 0, aspectRatio: 1, imageAngle: 'unknown' };

  try {
    [visionResponse, sharpResult] = await Promise.all([
      callVisionApi(visionBase64, apiKey, getToken),
      sharpAnalysis(buffer),
    ]);
  } catch (e) {
    console.warn('Vision or Sharp error:', e.message);
  }

  const safeSearch = visionResponse.safeSearchAnnotation || {};
  const adult = String(safeSearch.adult || '').toUpperCase();
  const violence = String(safeSearch.violence || '').toUpperCase();
  if (adult === 'LIKELY' || adult === 'VERY_LIKELY' || violence === 'LIKELY' || violence === 'VERY_LIKELY') {
    throw new Error('Invalid image content');
  }

  const imageWidth = sharpResult.width || 1;
  const imageHeight = sharpResult.height || 1;
  const densityKgM3 = getDensityKgM3(wasteTypeId);
  const anchor = detectScaleAnchor(visionResponse, imageWidth, imageHeight);
  const hasWasteType = wasteTypeId && wasteTypeId !== 'DEFAULT';
  const userSelectedLabel = WASTE_TYPE_ID_TO_LABEL[wasteTypeId] || (wasteTypeId ? `Waste type ${wasteTypeId}` : null);
  const scaleAnchorLabel = anchor && (anchor.anchorType === 'hand' || anchor.anchorType === 'finger')
    ? (anchor.name === 'Hand' ? 'Human Hand' : anchor.name)
    : 'None';
  const isHandheld = scaleAnchorLabel !== 'None';

  const geminiContext = {
    wasteTypeId,
    wasteTypeLabel: userSelectedLabel,
    densityKgM3,
    scaleAnchorDetected: scaleAnchorLabel,
    isHandheld,
    scaleAnchorHint: getScaleAnchorHint(wasteTypeId),
    detectedLabels: (visionResponse.labelAnnotations || []).map((l) => l.description),
    detectedObjects: (visionResponse.localizedObjectAnnotations || []).map((o) => o.name),
    imageDimensions: { width: imageWidth, height: imageHeight },
    frameCoveragePercent: frameCoverageFromVision(visionResponse) ?? null,
  };

  let weightKg;
  let volumeM3;
  let volumeCm3;
  let geometryAssumed;
  let estimationMethod;
  let confidencePercent;
  let reasoning;
  let warningFlags = [];
  let improvementSuggestions = [];

  const { result: geminiResult, noKey: geminiNoKey, errorMessage: geminiError } = await callGemini(geminiBase64, geminiMime || mimeType || 'image/jpeg', geminiContext);

  if (geminiResult && Number.isFinite(geminiResult.estimatedWeightKg)) {
    weightKg = Number(geminiResult.estimatedWeightKg);
    volumeM3 = Number(geminiResult.estimatedVolumeCubicMetres) || weightKg / densityKgM3;
    volumeCm3 = volumeM3 * 1_000_000;
    if (isHandheld && weightKg > HANDHELD_WEIGHT_CAP_KG) weightKg = Math.min(weightKg, HANDHELD_WEIGHT_CAP_KG);
    if (isHandheld && weightKg > HANDHELD_SANITY_CAP_KG) weightKg = Math.min(weightKg, 0.025);
    geometryAssumed = String(geminiResult.geometryAssumed || 'unknown');
    estimationMethod = String(geminiResult.estimationMethod || 'Gemini AI').slice(0, 200);
    confidencePercent = Math.min(100, Math.max(0, Number(geminiResult.confidencePercent) || 70));
    reasoning = String(geminiResult.reasoning || '');
    warningFlags = Array.isArray(geminiResult.warningFlags) ? geminiResult.warningFlags : [];
    improvementSuggestions = Array.isArray(geminiResult.improvementSuggestions) ? geminiResult.improvementSuggestions : [];
  } else {
    if (anchor && (anchor.anchorType === 'hand' || anchor.anchorType === 'finger')) {
      const pileWidthPx = anchor.handWidthPx * 1.0;
      const pileHeightPx = Math.max(anchor.handHeightPx * 0.6, anchor.handWidthPx * 0.4);
      const result = calculateWeightHandheld(
        anchor.handWidthPx,
        pileWidthPx,
        pileHeightPx,
        imageWidth,
        imageHeight,
        densityKgM3,
        anchor.anchorType,
      );
      weightKg = result.weightKg;
      volumeM3 = result.volumeM3;
      volumeCm3 = result.volumeCm3;
      geometryAssumed = 'semi-ellipsoid (handheld)';
      estimationMethod = `Scale anchor: ${scaleAnchorLabel} (9 cm). Semi-ellipsoid volume, density ${densityKgM3} kg/m³. (Gemini unavailable, fallback.)`;
      confidencePercent = 75;
      reasoning = `Hand detected. Fallback: reference width ${ANCHOR_WIDTH_CM[anchor.anchorType]} cm, volume ${(volumeCm3 / 1000).toFixed(2)} L. Weight = volume × ${densityKgM3} kg/m³.`;
      improvementSuggestions = geminiNoKey ? ['Add GEMINI_API_KEY to server .env for AI-powered estimates.'] : (geminiError ? [`Gemini: ${geminiError}`] : ['Gemini AI was unavailable; check API key and quota.']);
    } else {
      const coverage = frameCoverageFromVision(visionResponse) ?? 25;
      const result = calculateWeightMacro(coverage, densityKgM3);
      weightKg = result.weightKg;
      volumeM3 = result.volumeM3;
      volumeCm3 = result.volumeCm3;
      geometryAssumed = 'irregular heap';
      estimationMethod = `Macro mode (no hand). Frame coverage ${coverage}%, density ${densityKgM3} kg/m³. (Gemini unavailable, fallback.)`;
      confidencePercent = 45;
      reasoning = geminiNoKey
        ? 'No hand detected. Fallback from frame coverage and density. Add GEMINI_API_KEY to server .env for AI estimates.'
        : `No hand detected. Fallback from frame coverage and density. ${geminiError ? `Gemini: ${geminiError}` : 'Gemini AI was unavailable (check API key and quota).'}`;
      warningFlags = ['No scale anchor detected — confidence reduced.'];
      improvementSuggestions = ['Include your hand in the frame for handheld samples.', ...(geminiNoKey ? ['Set GEMINI_API_KEY in server/.env for Gemini AI estimates.'] : (geminiError ? [`Gemini: ${geminiError}`] : ['Check Gemini API key and quota.']))];
    }
  }

  const minKg = weightKg * 0.6;
  const maxKg = weightKg * 1.5;
  const estimatedWeightTonnes = weightKg / 1000;
  const wasteCreditPreview = (weightKg / 1000) * densityKgM3 * 0.001 * CARBON_FACTOR_KG_PER_TONNE * 10;
  const processingTimeMs = Date.now() - start;

  const estimation = {
    estimatedWeightKg: weightKg,
    estimatedWeightTonnes,
    confidencePercent,
    weightRangeKg: { min: minKg, max: maxKg },
    estimatedVolumeCubicMetres: volumeM3,
    volumeLiters: volumeM3 < 0.01 ? volumeM3 * 1000 : null,
    volumeMl: volumeM3 < 0.01 ? volumeM3 * 1_000_000 : null,
    densityUsedKgM3: densityKgM3,
    geometryAssumed,
    estimationMethod,
    anchorsUsed: scaleAnchorLabel !== 'None' ? [`Scale Anchor: ${scaleAnchorLabel}`] : [],
    materialConfidence: hasWasteType ? 'high' : 'medium',
    wasteTypeConfirmed: Boolean(hasWasteType),
    wasteTypeDetected: userSelectedLabel || 'Unknown',
    dimensionEstimatesMetres: { estimatedLength: null, estimatedWidth: null, estimatedHeight: null },
    reasoning,
    warningFlags: warningFlags.length ? warningFlags : (scaleAnchorLabel === 'None' ? ['No scale anchor detected — confidence reduced.'] : []),
    improvementSuggestions: improvementSuggestions.length ? improvementSuggestions : (scaleAnchorLabel === 'None' ? ['Include your hand in the frame for handheld samples.'] : []),
    wasteCreditPreview: Math.round(wasteCreditPreview * 100) / 100,
    certificationStandard: CERTIFICATION_STANDARD,
    scaleAnchor: scaleAnchorLabel,
    isHandheld,
    imageAngle: sharpResult.imageAngle || 'unknown',
  };

  const imageAnalysis = {
    dominantColors: (visionResponse.imagePropertiesAnnotation?.dominantColors?.colors || []).slice(0, 5).map((c) => {
      const rgb = c.color || {};
      return `rgb(${rgb.red ?? 0},${rgb.green ?? 0},${rgb.blue ?? 0})`;
    }),
    detectedLabels: (visionResponse.labelAnnotations || []).map((l) => l.description),
    detectedObjects: (visionResponse.localizedObjectAnnotations || []).map((o) => o.name),
    frameCoveragePercent: frameCoverageFromVision(visionResponse) ?? 0,
    imageAngle: sharpResult.imageAngle || 'unknown',
    textFoundInImage: (visionResponse.textAnnotations || []).slice(0, 5).map((t) => t.description).filter(Boolean),
  };

  return {
    success: true,
    estimation,
    imageAnalysis,
    processingTimeMs,
    imageHash: imageHash(buffer),
  };
}
