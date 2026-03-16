import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Provision from '../models/Provision.js';
import fetch from 'node-fetch';

const router = express.Router();
const ML_URL = process.env.ML_URL || 'http://127.0.0.1:8000';

// GET /api/waste/matches?needType=...&quantityTons=...&latitude=...&longitude=...&r_price=...
router.get('/matches', requireAuth, async (req, res) => {
  if (req.user.role !== 'startup') {
    return res.status(403).json({ message: 'Only startups can search for matches' });
  }
  const needType = String(req.query.needType || '').trim();
  const quantityTons = Number(req.query.quantityTons || 0);
  const latitude = req.query.latitude !== undefined ? Number(req.query.latitude) : undefined;
  const longitude = req.query.longitude !== undefined ? Number(req.query.longitude) : undefined;
  const r_price = req.query.r_price !== undefined ? Number(req.query.r_price) : undefined;

  if (!needType || !quantityTons) {
    return res.status(400).json({ message: 'needType and quantityTons are required' });
  }

  let provisions = [];
  try {
    provisions = await Provision.find({ wasteType: needType, status: 'active' }).sort({ createdAt: -1 }).limit(500).lean();
  } catch (err) {
    console.warn('Matches: Provision.find failed (e.g. DB not connected), returning empty list:', err?.message);
    return res.status(200).json({ matches: [] });
  }

  const payload = {
    needType,
    quantityTons,
    latitude,
    longitude,
    r_price,
    provisions: provisions.map((p) => ({
      _id: String(p._id),
      wasteType: p.wasteType,
      quantityTons: p.quantityTons,
      location: p.location,
      latitude: p.latitude,
      longitude: p.longitude,
      price: p.price,
      createdAt: p.createdAt,
    })),
  };

  let rankedIds = [];
  try {
    const resp = await fetch(`${ML_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const data = await resp.json();
      rankedIds = Array.isArray(data.ranked_ids) ? data.ranked_ids : [];
    }
  } catch {
    // ML service unavailable; use DB order
  }

  let results = provisions;
  if (rankedIds.length) {
    const map = new Map(provisions.map((p) => [String(p._id), p]));
    results = rankedIds.map((id) => map.get(String(id))).filter(Boolean);
  }

  try {
    res.json({ matches: results });
  } catch (err) {
    console.warn('Matches: send failed', err?.message);
    res.status(200).json({ matches: [] });
  }
});

export default router;


