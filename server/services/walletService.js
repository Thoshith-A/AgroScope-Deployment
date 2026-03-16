/**
 * AgroScope balance wallet service: get/create wallet, listing prices, credit farmer, withdrawals.
 * Uses MongoDB when connected, else file-based store. All amounts rounded to 2 decimals.
 */

import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import * as walletStore from '../data/walletStore.js';
import {
  sendWithdrawalReceiptEmail,
  sendWithdrawalReceiptWhatsApp,
  sendPaymentCreditNotification,
  getPlatformFeePercent,
} from './notificationService.js';

const FEE_PERCENT = getPlatformFeePercent() / 100;

function roundMoney(value) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function useMongo() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Get or create balance wallet for user. Returns { _id, userId, role, balance, totalEarned, totalWithdrawn, ... }.
 */
export async function getOrCreateWallet(userId, role) {
  const uid = String(userId).trim();
  const r = role === 'startup' ? 'startup' : 'farmer';
  if (useMongo()) {
    let w = await Wallet.findOne({ userId: uid });
    if (!w) {
      w = await Wallet.create({
        userId: uid,
        role: r,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalSpent: r === 'startup' ? 0 : undefined,
      });
    }
    return w.toObject ? w.toObject() : w;
  }
  let w = await walletStore.getWalletByUserId(uid);
  if (!w) {
    w = await walletStore.createOrUpdateWallet(uid, r);
  }
  return w;
}

/**
 * Calculate listing prices: platform fee 30% of farmer price, display = farmer + fee.
 * Returns { farmerPrice, platformFee, displayPrice }.
 */
export function calculateListingPrices(farmerPrice) {
  const fp = roundMoney(Number(farmerPrice));
  const platformFee = roundMoney(fp * FEE_PERCENT);
  const displayPrice = roundMoney(fp + platformFee);
  return { farmerPrice: fp, platformFee, displayPrice };
}

/**
 * Credit farmer wallet after admin verifies startup payment.
 * Credits the original listing total: farmer_price (per kg) × quantity (kg).
 * @param {object} listing - { userId/farmerId, farmer_price (per kg), quantityTons, _id, wasteType }
 * @param {object} farmer - { email, mobileNumber } for notifications
 */
export async function creditFarmerWallet(listing, farmer = {}) {
  const farmerId = String(listing.userId || listing.farmerId || '').trim();
  const pricePerKg = Number(listing.farmer_price ?? listing.farmerPrice ?? 0);
  const quantityTons = Number(listing.quantityTons ?? listing.quantity ?? 0);
  const quantityKg = quantityTons * 1000;
  const amount = roundMoney(pricePerKg * quantityKg);
  if (!farmerId || amount <= 0) {
    throw new Error('Invalid listing: missing farmer or farmer_price/quantity');
  }
  const wallet = await getOrCreateWallet(farmerId, 'farmer');
  const walletId = wallet._id;

  if (useMongo()) {
    const updated = await Wallet.findOneAndUpdate(
      { _id: walletId },
      {
        $inc: { balance: amount, totalEarned: amount },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
    if (!updated) throw new Error('Wallet update failed');
    await WalletTransaction.create({
      walletId: updated._id,
      type: 'listing_credit',
      amount,
      description: `Payment received for ${listing.wasteType || 'listing'}`,
      referenceId: listing._id,
      status: 'completed',
    });
    await sendPaymentCreditNotification(
      farmer,
      amount,
      listing.wasteType ? `${listing.wasteType} listing` : 'listing'
    );
    return { wallet: updated.toObject ? updated.toObject() : updated, amount };
  }

  const newBalance = roundMoney((wallet.balance || 0) + amount);
  const newTotalEarned = roundMoney((wallet.totalEarned || 0) + amount);
  const updated = await walletStore.createOrUpdateWallet(farmerId, 'farmer', {
    balance: newBalance,
    totalEarned: newTotalEarned,
  });
  await walletStore.createTransaction({
    walletId: updated._id,
    type: 'listing_credit',
    amount,
    description: `Payment received for ${listing.wasteType || 'listing'}`,
    referenceId: listing._id,
    status: 'completed',
  });
  await sendPaymentCreditNotification(
    farmer,
    amount,
    listing.wasteType ? `${listing.wasteType} listing` : 'listing'
  );
  return { wallet: updated, amount };
}

/**
 * Create withdrawal request: deduct from balance, create withdrawal record and tx.
 */
export async function createWithdrawalRequest(farmerId, formData) {
  const amount = roundMoney(Number(formData.amount));
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  const wallet = await getOrCreateWallet(farmerId, 'farmer');
  const balance = roundMoney(wallet.balance ?? 0);
  if (balance < amount) throw new Error('Insufficient balance');
  const walletId = wallet._id;

  if (useMongo()) {
    const updated = await Wallet.findOneAndUpdate(
      { _id: walletId },
      { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!updated) throw new Error('Wallet update failed');
    const wr = await WithdrawalRequest.create({
      walletId: updated._id,
      farmerId: String(farmerId),
      amount,
      accountNumber: formData.accountNumber,
      ifscCode: formData.ifscCode,
      upiId: formData.upiId || null,
      mobileNumber: formData.mobileNumber,
      email: formData.email,
      status: 'pending',
    });
    await WalletTransaction.create({
      walletId: updated._id,
      type: 'withdrawal_requested',
      amount: -amount,
      description: 'Withdrawal requested',
      referenceId: wr._id.toString(),
      status: 'completed',
    });
    return { withdrawal: wr.toObject ? wr.toObject() : wr, wallet: updated.toObject ? updated.toObject() : updated };
  }

  const newBalance = roundMoney(balance - amount);
  await walletStore.createOrUpdateWallet(farmerId, 'farmer', { balance: newBalance });
  const wr = await walletStore.createWithdrawalRequest({
    walletId: wallet._id,
    farmerId: String(farmerId),
    amount,
    accountNumber: formData.accountNumber,
    ifscCode: formData.ifscCode,
    upiId: formData.upiId || null,
    mobileNumber: formData.mobileNumber,
    email: formData.email,
  });
  await walletStore.createTransaction({
    walletId: wallet._id,
    type: 'withdrawal_requested',
    amount: -amount,
    description: 'Withdrawal requested',
    referenceId: wr._id,
    status: 'completed',
  });
  const updated = await walletStore.getWalletByUserId(farmerId);
  return { withdrawal: wr, wallet: updated };
}

/**
 * Complete withdrawal: set status, update totalWithdrawn, create withdrawal_completed tx, send receipt.
 */
export async function completeWithdrawal(withdrawalId, adminNote, receiptUrl) {
  if (useMongo()) {
    const wr = await WithdrawalRequest.findById(withdrawalId);
    if (!wr) throw new Error('Withdrawal request not found');
    if (wr.status === 'completed') throw new Error('Already completed');
    wr.status = 'completed';
    wr.adminNote = adminNote;
    wr.receiptUrl = receiptUrl;
    wr.processedAt = new Date();
    await wr.save();
    const wallet = await Wallet.findById(wr.walletId);
    if (wallet) {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: { totalWithdrawn: wr.amount },
        $set: { updatedAt: new Date() },
      });
      await WalletTransaction.create({
        walletId: wallet._id,
        type: 'withdrawal_completed',
        amount: -wr.amount,
        description: 'Withdrawal completed',
        referenceId: wr._id.toString(),
        status: 'completed',
      });
    }
    const accountLast4 = (wr.accountNumber || '').slice(-4);
    const receiptData = {
      amount: wr.amount,
      date: (wr.processedAt || new Date()).toISOString().split('T')[0],
      reference: adminNote || 'N/A',
      accountLast4,
    };
    await sendWithdrawalReceiptEmail(wr.email, receiptData);
    await sendWithdrawalReceiptWhatsApp(wr.mobileNumber, receiptData);
    return wr.toObject ? wr.toObject() : wr;
  }

  const wr = await walletStore.findWithdrawalById(withdrawalId);
  if (!wr) throw new Error('Withdrawal request not found');
  if (wr.status === 'completed') throw new Error('Already completed');
  await walletStore.updateWithdrawal(withdrawalId, {
    status: 'completed',
    adminNote,
    receiptUrl,
    processedAt: new Date().toISOString(),
  });
  const wallet = await walletStore.getWalletByUserId(wr.farmerId);
  if (wallet) {
    const newTotalWithdrawn = roundMoney((wallet.totalWithdrawn || 0) + wr.amount);
    await walletStore.createOrUpdateWallet(wr.farmerId, 'farmer', { totalWithdrawn: newTotalWithdrawn });
    await walletStore.createTransaction({
      walletId: wallet._id,
      type: 'withdrawal_completed',
      amount: -wr.amount,
      description: 'Withdrawal completed',
      referenceId: withdrawalId,
      status: 'completed',
    });
  }
  const accountLast4 = (wr.accountNumber || '').slice(-4);
  const receiptData = {
    amount: wr.amount,
    date: new Date().toISOString().split('T')[0],
    reference: adminNote || 'N/A',
    accountLast4,
  };
  await sendWithdrawalReceiptEmail(wr.email, receiptData);
  await sendWithdrawalReceiptWhatsApp(wr.mobileNumber, receiptData);
  return { ...wr, status: 'completed', adminNote, receiptUrl };
}

/**
 * Get paginated transactions for a wallet (by wallet _id or userId for file store).
 */
export async function getWalletTransactions(userId, role = 'farmer', page = 1, limit = 20) {
  const wallet = await getOrCreateWallet(userId, role);
  const walletId = wallet._id;
  const skip = (Math.max(1, page) - 1) * limit;
  const lim = Math.min(Math.max(1, limit), 50);
  if (useMongo()) {
    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
    const total = await WalletTransaction.countDocuments({ walletId });
    const list = await WalletTransaction.find({ walletId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean();
    return { transactions: list, total, page, hasMore: skip + list.length < total };
  }
  const list = await walletStore.findTransactionsByWalletId(walletId, lim, skip);
  const total = await walletStore.countTransactionsByWalletId(walletId);
  return { transactions: list, total, page, hasMore: skip + list.length < total };
}

/**
 * Reject withdrawal: refund balance, update status.
 */
export async function rejectWithdrawal(withdrawalId, adminNote) {
  if (useMongo()) {
    const wr = await WithdrawalRequest.findById(withdrawalId);
    if (!wr) throw new Error('Withdrawal request not found');
    if (wr.status !== 'pending' && wr.status !== 'processing') throw new Error('Cannot reject');
    wr.status = 'rejected';
    wr.adminNote = adminNote;
    wr.processedAt = new Date();
    await wr.save();
    const wallet = await Wallet.findById(wr.walletId);
    if (wallet) {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: { balance: wr.amount },
        $set: { updatedAt: new Date() },
      });
      await WalletTransaction.create({
        walletId: wallet._id,
        type: 'withdrawal_requested',
        amount: wr.amount,
        description: 'Withdrawal rejected – refund',
        referenceId: wr._id.toString(),
        status: 'completed',
      });
    }
    return wr.toObject ? wr.toObject() : wr;
  }

  const wr = await walletStore.findWithdrawalById(withdrawalId);
  if (!wr) throw new Error('Withdrawal request not found');
  if (wr.status !== 'pending' && wr.status !== 'processing') throw new Error('Cannot reject');
  await walletStore.updateWithdrawal(withdrawalId, {
    status: 'rejected',
    adminNote,
    processedAt: new Date().toISOString(),
  });
  const wallet = await walletStore.getWalletByUserId(wr.farmerId);
  if (wallet) {
    const newBalance = roundMoney((wallet.balance || 0) + wr.amount);
    await walletStore.createOrUpdateWallet(wr.farmerId, 'farmer', { balance: newBalance });
    await walletStore.createTransaction({
      walletId: wallet._id,
      type: 'withdrawal_requested',
      amount: wr.amount,
      description: 'Withdrawal rejected – refund',
      referenceId: withdrawalId,
      status: 'completed',
    });
  }
  return { ...wr, status: 'rejected', adminNote };
}
