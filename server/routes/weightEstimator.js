import express from 'express';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

function getGeminiUrl() {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) return null;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`;
}

function buildPrompt(cropType, pileArea) {
  return `
You are a strict agricultural crop waste 
weight estimation AI.

YOUR FIRST AND MOST IMPORTANT JOB:
Determine if this image shows actual crop waste.

ACCEPTED crop waste types ONLY:
  1. Paddy Husk — pale golden loose husks
  2. Wheat Straw — dry golden stalks or bales
  3. Corn Stalks — green or dry maize plants
  4. Sugarcane Bagasse — fibrous white/beige pulp
  5. Coconut Shells — dark brown hard shells

Crop type hint from farmer form: ${cropType || 'Not specified'}
${pileArea ? `Farmer-provided pile area: ${pileArea} sq meters` : ''}

═══════════════════════════════════════
STRICT REJECTION RULES:
═══════════════════════════════════════

Set is_crop_waste: false if image shows:
  ✗ Humans, faces, body parts
  ✗ Animals (dogs, cats, birds, etc.)
  ✗ Indoor scenes — rooms, ceilings, fans,
    furniture, curtains, walls, floors
  ✗ Vehicles — cars, trucks, bikes
  ✗ Electronics — phones, TVs, computers  
  ✗ Food items or kitchen scenes
  ✗ Buildings, roads, sky, water
  ✗ Random objects NOT in the 5 crop types
  ✗ Empty outdoor fields with no visible pile
  ✗ Any ambiguous image where crop waste
    cannot be clearly identified

ONLY set is_crop_waste: true when you can
CLEARLY see a physical pile, heap, bag,
or collection of one of the 5 crop types above.
If even 1% doubt — reject it.

═══════════════════════════════════════
IF REJECTED respond with ONLY this JSON:
═══════════════════════════════════════
{
  "is_crop_waste": false,
  "rejection_reason": "<specific reason what was seen instead>",
  "estimated_tonnes": 0,
  "confidence": "Low",
  "confidence_percent": 0,
  "crop_type_detected": "None",
  "estimated_dimensions": {
    "length_m": 0, "width_m": 0, "height_m": 0
  },
  "bulk_density_used": 0,
  "volume_m3": 0,
  "reasoning": "Image rejected",
  "scale_references": "N/A",
  "range": { "min_tonnes": 0, "max_tonnes": 0 }
}

═══════════════════════════════════════
IF ACCEPTED — estimate weight accurately:
═══════════════════════════════════════

Bulk density reference values (kg/m³):
  Paddy Husk:        130 kg/m³
  Wheat Straw:        60 kg/m³
  Corn Stalks:        70 kg/m³
  Sugarcane Bagasse: 120 kg/m³
  Coconut Shells:    600 kg/m³

ESTIMATION METHOD:
1. Find scale references in image:
   - Adult person ≈ 1.7m height
   - Gunny sack ≈ 90cm × 50cm, ~50kg
   - Tractor wheel ≈ 1.5m diameter
   - Doorway ≈ 2m × 0.9m
   - If none found: note it, reduce confidence

2. Estimate pile 3D dimensions using:
   - Perspective and shadow angles
   - Ground contact area visible
   - Pile shape (conical/rectangular/stacked)

3. Calculate volume:
   - Conical: V = (1/3) × π × r² × h
   - Rectangular: V = L × W × H
   - Bag count: bags × 0.05 m³ each

4. Mass = Volume × Bulk Density
   Tonnes = Mass ÷ 1000

5. Range: min = result × 0.75, 
          max = result × 1.30

CONFIDENCE:
  High (80-95%): Clear pile + scale reference
  Medium (55-79%): Visible pile, no clear ref
  Low (30-54%): Partial/unclear pile

Respond ONLY with this exact JSON, no other text:
{
  "is_crop_waste": true,
  "rejection_reason": null,
  "estimated_tonnes": <number 2 decimals>,
  "confidence": "<High|Medium|Low>",
  "confidence_percent": <integer>,
  "crop_type_detected": "<exact crop type>",
  "estimated_dimensions": {
    "length_m": <number>,
    "width_m": <number>,
    "height_m": <number>
  },
  "bulk_density_used": <number>,
  "volume_m3": <number>,
  "reasoning": "<specific: scale ref used + geometry + calculation>",
  "scale_references": "<exactly what visual cues used>",
  "range": {
    "min_tonnes": <number>,
    "max_tonnes": <number>
  }
}`.trim();
}

router.post(
  '/estimate-weight',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const cropType = req.body.cropType || '';
      const pileArea = req.body.pileArea || '';

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      const geminiUrl = getGeminiUrl();
      if (!geminiUrl) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      }

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
              {
                text: buildPrompt(cropType, pileArea),
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error('Gemini error:', geminiResponse.status, errText);
        return res.status(502).json({
          error: `Gemini API error: ${geminiResponse.status}`,
        });
      }

      const geminiData = await geminiResponse.json();

      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!rawText) {
        const finishReason = geminiData?.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
          return res.json({
            is_crop_waste: false,
            rejection_reason:
              'Image blocked by safety filter. Please use a clear outdoor photo of actual crop waste.',
            estimated_tonnes: 0,
            confidence: 'Low',
            confidence_percent: 0,
            crop_type_detected: 'None',
            estimated_dimensions: { length_m: 0, width_m: 0, height_m: 0 },
            bulk_density_used: 0,
            volume_m3: 0,
            reasoning: 'Safety filter triggered',
            scale_references: 'N/A',
            range: { min_tonnes: 0, max_tonnes: 0 },
          });
        }
        return res.status(502).json({ error: 'Empty response from Gemini' });
      }

      let jsonStr = rawText;
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      } else {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonStr = rawText.substring(start, end + 1);
        }
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('JSON parse error. Raw:', rawText);
        return res.status(502).json({ error: 'Could not parse Gemini response' });
      }

      return res.json(parsed);
    } catch (err) {
      console.error('Weight estimator error:', err);
      return res.status(500).json({
        error: err.message || 'Internal server error',
      });
    }
  }
);

export default router;
