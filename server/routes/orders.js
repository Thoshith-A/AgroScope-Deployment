import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Provision from '../models/Provision.js';

const router = express.Router();

// POST /api/orders - startup requests a provision -> creates pending order and notifies farmer
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'startup') {
      return res.status(403).json({ message: 'Only startups can request provisions' });
    }
    const { provisionId, message } = req.body;
    if (!provisionId) return res.status(400).json({ message: 'provisionId is required' });
    const provision = await Provision.findById(provisionId);
    if (!provision) return res.status(404).json({ message: 'Provision not found' });

    const order = await Order.create({
      provisionId: provision._id,
      farmerId: provision.userId,
      startupId: req.user.userId,
      status: 'pending',
      message: message || null,
    });
    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create request' });
  }
});

// POST /api/orders/:id/accept - farmer accepts a pending order -> lock the deal
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can accept orders' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.farmerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is not pending' });
    }
    order.status = 'accepted';
    await order.save();
    res.json({ message: 'Order accepted', order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept order' });
  }
});

// PATCH /api/orders/:id/fulfill - mark order fulfilled with optional rating data (payment/delivery/quality)
router.patch('/:id/fulfill', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'accepted') return res.status(400).json({ message: 'Order must be accepted first' });
    const isFarmer = String(order.farmerId) === String(req.user.userId);
    const isStartup = String(order.startupId) === String(req.user.userId);
    if (!isFarmer && !isStartup) return res.status(403).json({ message: 'Not allowed' });

    if (req.body.paymentCompletedAt) order.paymentCompletedAt = new Date(req.body.paymentCompletedAt);
    if (req.body.deliveryCompletedAt) order.deliveryCompletedAt = new Date(req.body.deliveryCompletedAt);
    if (typeof req.body.qualityGrade === 'number') order.qualityGrade = req.body.qualityGrade;
    if (typeof req.body.moisturePercent === 'number') order.moisturePercent = req.body.moisturePercent;
    if (typeof req.body.rejected === 'boolean') order.rejected = req.body.rejected;

    order.status = 'fulfilled';
    await order.save();
    res.json({ message: 'Order fulfilled', order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order' });
  }
});

export default router;


