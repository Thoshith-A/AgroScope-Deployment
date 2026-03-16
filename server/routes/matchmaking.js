import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Provision from '../models/Provision.js';
import fetch from 'node-fetch';

const router = express.Router();
const ML_URL = process.env.ML_URL || 'http://127.0.0.1:8000';

router.post('/search', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'startup') {
      return res.status(403).json({ message: 'Only startups can search for matches' });
    }
    const { needType, quantityTons, location } = req.body;
    if (!needType || !quantityTons || !location) {
      return res.status(400).json({ message: 'needType, quantityTons, and location are required' });
    }

    const qty = Number(quantityTons);

    const provisions = await Provision.find({
      wasteType: needType,
      quantityTons: { $gte: qty },
      status: 'active',
    }).sort({ createdAt: -1 }).limit(200);

    // Try ML ranking if service is available
    let rankedIds = [];
    try {
      const resp = await fetch(`${ML_URL}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needType, quantityTons: qty, location, provisions }),
        timeout: 3000,
      });
      if (resp.ok) {
        const data = await resp.json();
        rankedIds = Array.isArray(data.ranked_ids) ? data.ranked_ids : [];
      }
    } catch (e) {
      // ignore and use fallback order
    }

    // If ML returned order, sort by that; else send as-is
    let results = provisions;
    if (rankedIds.length) {
      const map = new Map(provisions.map((p) => [String(p._id), p]));
      results = rankedIds.map((id) => map.get(String(id))).filter(Boolean);
    }

    return res.json({ matches: results });
  } catch (err) {
    return res.status(500).json({ message: 'Matchmaking failed' });
  }
});

export default router;
