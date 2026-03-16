import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDemoProvisions } from './provisions.js';
import { getPayments } from './payments.js';
import {
  completeWithdrawal,
  rejectWithdrawal,
  creditFarmerWallet,
  getOrCreateWallet,
} from '../services/walletService.js';
import mongoose from 'mongoose';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import * as walletStore from '../data/walletStore.js';
import * as provisionsStore from '../data/provisionsStore.js';
import * as paymentsStore from '../data/paymentsStore.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// GET /api/admin/withdrawals — list all withdrawal requests
router.get('/withdrawals', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const list = await WithdrawalRequest.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, withdrawals: list });
    }
    const list = await walletStore.listWithdrawals();
    return res.json({ success: true, withdrawals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, withdrawals: [] });
  }
});

// PATCH /api/admin/withdrawals/:id — mark completed or rejected
router.patch('/withdrawals/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = (req.params.id || '').trim();
  const { status, adminNote, receiptUrl } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Withdrawal ID required' });
  }
  try {
    if (status === 'completed') {
      const updated = await completeWithdrawal(id, adminNote || '', receiptUrl || '');
      return res.json({ success: true, withdrawal: updated });
    }
    if (status === 'rejected') {
      const updated = await rejectWithdrawal(id, adminNote || '');
      return res.json({ success: true, withdrawal: updated });
    }
    if (status === 'processing') {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const wr = await WithdrawalRequest.findByIdAndUpdate(
          id,
          { status: 'processing', adminNote: adminNote || null },
          { new: true }
        );
        if (!wr) return res.status(404).json({ error: 'Withdrawal not found' });
        return res.json({ success: true, withdrawal: wr });
      }
      const updated = await walletStore.updateWithdrawal(id, { status: 'processing', adminNote: adminNote || null });
      if (!updated) return res.status(404).json({ error: 'Withdrawal not found' });
      return res.json({ success: true, withdrawal: updated });
    }
    return res.status(400).json({ error: 'Invalid status. Use completed, rejected, or processing' });
  } catch (err) {
    const msg = err?.message || 'Update failed';
    if (msg.includes('not found') || msg.includes('Already')) {
      return res.status(404).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

// GET /api/admin/listings/payments — listings (payments) with status pending_verification (paid by startup, farmer not yet credited)
router.get('/listings/payments', requireAuth, requireAdmin, (req, res) => {
  const payments = getPayments();
  const pending = payments.filter((p) => p.status === 'pending_verification');
  const provisions = getDemoProvisions();
  const withListing = pending.map((p) => {
    const provision = provisions.find((pr) => String(pr._id) === String(p.provisionId));
    return {
      ...p,
      farmer_price: provision?.farmer_price,
      farmerId: provision?.userId,
      wasteType: provision?.wasteType,
    };
  });
  res.json({ success: true, payments: withListing });
});

// PATCH /api/admin/listings/:id/verify-payment — verify startup payment and credit farmer wallet
router.patch('/listings/:id/verify-payment', requireAuth, requireAdmin, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Listing or payment ID required' });
  const payments = getPayments();
  const provisions = getDemoProvisions();
  const payment = payments.find((p) => p.id === id || p.provisionId === id);
  const provisionId = payment ? payment.provisionId : id;
  const provision = provisions.find((p) => String(p._id) === String(provisionId));
  if (!provision) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  const farmerPrice = provision.farmer_price ?? provision.farmerPrice ?? 0;
  if (farmerPrice <= 0) {
    return res.status(400).json({ error: 'Listing has no farmer price' });
  }
  try {
    const listing = {
      _id: provision._id,
      userId: provision.userId,
      farmerId: provision.userId,
      farmer_price: farmerPrice,
      quantityTons: provision.quantityTons ?? 0,
      wasteType: provision.wasteType,
    };
    const farmer = { email: provision.email, mobileNumber: provision.mobile };
    const result = await creditFarmerWallet(listing, farmer);
    if (provision.payment_status !== 'credited') {
      provision.payment_status = 'credited';
      await provisionsStore.updateById(provision._id, { payment_status: 'credited' });
    }
    if (payment) {
      payment.status = 'verified';
      payment.verifiedAt = new Date().toISOString();
      payment.verifiedBy = req.user?.email || 'admin';
      await paymentsStore.updateById(payment.id, {
        status: 'verified',
        verifiedAt: payment.verifiedAt,
        verifiedBy: payment.verifiedBy,
      });
    }
    res.json({
      success: true,
      message: 'Farmer wallet credited',
      amount: result.amount,
      wallet: result.wallet,
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Credit failed' });
  }
});

export default router;
