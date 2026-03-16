import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Provision from '../models/Provision.js';

const router = express.Router();

// GET /api/notifications - accepted orders related to current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    let criteria = {};
    if (role === 'farmer') criteria = { farmerId: userId, status: { $in: ['pending', 'accepted'] } };
    else if (role === 'startup') criteria = { startupId: userId, status: { $in: ['accepted'] } };
    else return res.json({ notifications: [] });

    const items = await Order.find(criteria)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Attach minimal provision info for context
    const provIds = [...new Set(items.map(i => i.provisionId))];
    const provMap = new Map(
      (await Provision.find({ _id: { $in: provIds } }).lean()).map(p => [String(p._id), p])
    );
    const notifications = items.map(i => ({
      _id: String(i._id),
      provision: provMap.get(String(i.provisionId)) || null,
      status: i.status,
      message: i.message || null,
      createdAt: i.createdAt,
    }));
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

export default router;


