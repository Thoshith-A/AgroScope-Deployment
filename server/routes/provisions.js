import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import fetch from 'node-fetch';
import { upsertByFarmer } from '../services/farmerRatingService.js';
import { syncProvisionFromApi } from '../socket.js';
import { calculateListingPrices } from '../services/walletService.js';
import * as provisionsStore from '../data/provisionsStore.js';

const ML_URL = process.env.ML_URL || 'http://127.0.0.1:8000';

const router = express.Router();

// In-memory cache; persisted to server/data/provisions.json so data survives backend restarts
const DEMO_PROVISIONS = [];

export function getDemoProvisions() {
  return DEMO_PROVISIONS;
}

/** Load provisions from file store into memory (call once at server startup). */
export async function initProvisionsFromStore() {
  const list = await provisionsStore.getAll();
  DEMO_PROVISIONS.length = 0;
  DEMO_PROVISIONS.push(...list);
  return list;
}

// Create a new provision (farmer only, demo mode)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can create provisions' });
    }
    let { wasteType, quantityTons, location, latitude, longitude, price, wasteQualityGrade, moisturePercentage } = req.body;
    wasteType = typeof wasteType === 'string' ? wasteType.trim() : '';
    quantityTons = Number(quantityTons);
    location = typeof location === 'string' ? location.trim() : '';
    if (!wasteType) wasteType = 'Other';
    if (Number.isNaN(quantityTons) || quantityTons < 0) quantityTons = 0;
    if (!location) location = 'Not specified';

    // Optionally enhance with ML classification + avg price (best-effort)
    let wasteTypeFinal = wasteType;
    let priceFinal = typeof price === 'number' ? price : undefined;
    try {
      if (wasteType === 'auto' || (!wasteType && quantityTons)) {
        const { state, season } = req.body;
        if (state && season) {
          const clsResp = await fetch(`${ML_URL}/predict_category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state, season, quantity_kg: Number(quantityTons) * 1000 })
          });
          if (clsResp.ok) {
            const cls = await clsResp.json();
            if (cls?.category) wasteTypeFinal = cls.category;
            if (typeof cls?.average_price_per_quintal === 'number') priceFinal = cls.average_price_per_quintal;
          }
        }
      }
    } catch {
      // Ignore ML errors in demo mode
    }

    const farmerPriceInput = priceFinal != null ? priceFinal : (req.body.price != null ? Number(req.body.price) : 0);
    const { farmerPrice, platformFee, displayPrice } = calculateListingPrices(farmerPriceInput);
    const created = {
      _id: Date.now().toString(),
      userId: req.user.userId,
      farmerName: req.user.name || req.user.email || req.user.userId || 'Farmer',
      farmerUpiId: (req.body.farmerUpiId && String(req.body.farmerUpiId).trim()) || null,
      wasteType: wasteTypeFinal || wasteType,
      quantityTons: Number(quantityTons),
      location,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      price: priceFinal || null,
      farmer_price: farmerPrice,
      platform_fee: platformFee,
      display_price: displayPrice,
      payment_status: 'pending',
      wasteQualityGrade: wasteQualityGrade || null,
      moisturePercentage: moisturePercentage != null ? Number(moisturePercentage) : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    DEMO_PROVISIONS.unshift(created);
    await provisionsStore.add(created);

    const io = req.app.get('io');
    if (io) {
      syncProvisionFromApi(io, {
        ...created,
        farmerName: req.user.name || req.user.email || req.user.userId,
      });
    }

    let farmerRating = null;
    const grade = wasteQualityGrade && ['A', 'B', 'C'].includes(String(wasteQualityGrade).toUpperCase());
    const moisture = typeof moisturePercentage === 'number' || (typeof moisturePercentage === 'string' && moisturePercentage !== '');
    if (grade && (typeof moisturePercentage === 'number' || (typeof moisturePercentage === 'string' && !Number.isNaN(Number(moisturePercentage))))) {
      try {
        const ratingRes = await upsertByFarmer(req.user.userId, req.user.name || req.user.email || req.user.userId, {
          wasteQualityGrade: String(wasteQualityGrade).toUpperCase(),
          moisturePercentage: Number(moisturePercentage),
        });
        farmerRating = ratingRes.ratingOutOfFive;
      } catch {
        // ignore rating errors
      }
    }

    res.status(201).json({
      message: 'Provision created (demo mode)',
      provision: created,
      ...(farmerRating != null && { farmerRating }),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create provision' });
  }
});

// List ALL provisions (for startups / demo) — no filter by user. Startups must NOT see farmer_price or platform_fee.
// Startup always sees price with 30% platform markup (display_price = farmer_price * 1.30).
router.get('/', requireAuth, (req, res) => {
  try {
    const raw = Array.isArray(DEMO_PROVISIONS) ? DEMO_PROVISIONS : [];
    const role = req.user?.role || 'farmer';
    const list = raw.map((p) => {
      const out = { ...p };
      if (role === 'startup') {
        const farmerPrice = out.farmer_price;
        const displayPrice = out.display_price ?? (farmerPrice != null && Number.isFinite(Number(farmerPrice))
          ? Math.round(Number(farmerPrice) * 1.30 * 100) / 100
          : null);
        if (displayPrice != null) out.price = displayPrice;
        delete out.farmer_price;
        delete out.platform_fee;
      }
      return out;
    });
    return res.json({ provisions: list, total: list.length });
  } catch (err) {
    return res.json({ provisions: [], total: 0 });
  }
});

// List current user's provisions (farmer only, demo mode)
router.get('/my', requireAuth, (req, res) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ message: 'Only farmers can view provisions' });
  }
  try {
    const userId = req.user.userId;
    const items = Array.isArray(DEMO_PROVISIONS)
      ? DEMO_PROVISIONS.filter((p) => String(p.userId) === String(userId))
      : [];
    return res.json({ provisions: items });
  } catch (err) {
    return res.json({ provisions: [] });
  }
});

export default router;
