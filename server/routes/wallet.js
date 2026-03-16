import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWallet, addCredits, getSpendableCoins, transferCoins, wallets } from '../data/wallets.js';
import {
  getOrCreateWallet,
  createWithdrawalRequest,
  getWalletTransactions,
} from '../services/walletService.js';

const router = express.Router();

function getCurrentUserId(req) {
  return req.user?.userId ?? req.user?.id ?? req.user?.email ?? '';
}

const CREDIT_RULES = {
  LIST_WASTE: 250,
  COMPLETE_DEAL: 500,
  QUALITY_A_DELIVERY: 150,
  NEGOTIATE_SUCCESS: 100,
  SATELLITE_SCAN: 50,
  WEIGHT_ESTIMATE: 50,
  CARBON_SIMULATE: 75,
  DAILY_LOGIN: 25,
  PROFILE_COMPLETE: 200,
  REFER_FARMER: 1000,
  FIRST_PURCHASE: 500,
  BULK_PURCHASE: 300,
  REPEAT_BUYER: 200,
  FORECAST_VIEW: 50,
  MATCH_ACCEPTED: 150,
  REVIEW_SUBMITTED: 100,
};

const DESCRIPTIONS = {
  LIST_WASTE: (m) => `Listed ${m?.wasteType || 'crop waste'} — ${m?.quantity != null ? m.quantity : '?'} tons`,
  COMPLETE_DEAL: (m) => `Deal completed with ${m?.buyer || 'buyer'}`,
  QUALITY_A_DELIVERY: () => 'Grade A quality verified',
  NEGOTIATE_SUCCESS: (m) => `Negotiation accepted at ₹${m?.price ?? '?'}/kg`,
  SATELLITE_SCAN: () => 'Satellite crop scan completed',
  WEIGHT_ESTIMATE: () => 'AI weight estimation used',
  CARBON_SIMULATE: () => 'Carbon impact simulated',
  DAILY_LOGIN: () => 'Daily login bonus',
  PROFILE_COMPLETE: () => 'Profile completed',
  REFER_FARMER: (m) => `Referred ${m?.referredEmail || 'a farmer'}`,
  FIRST_PURCHASE: () => 'First crop waste purchase completed',
  BULK_PURCHASE: (m) => `Bulk purchase: ${m?.quantity ?? '?'} tons`,
  REPEAT_BUYER: () => 'Loyalty bonus — repeat purchase',
  FORECAST_VIEW: () => 'Supply forecast viewed',
  MATCH_ACCEPTED: () => 'Startup match accepted',
  REVIEW_SUBMITTED: () => 'Farmer review submitted',
};

// ─── Balance wallet (AgroScope Wallet: INR balance, withdrawals) ─────────────────
router.get('/me', requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  const role = req.user?.role || 'farmer';
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const wallet = await getOrCreateWallet(userId, role);
    res.json({
      success: true,
      wallet: {
        _id: wallet._id,
        userId: wallet.userId,
        role: wallet.role,
        balance: Number(wallet.balance ?? 0),
        totalEarned: Number(wallet.totalEarned ?? 0),
        totalWithdrawn: Number(wallet.totalWithdrawn ?? 0),
        totalSpent: Number(wallet.totalSpent ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get wallet' });
  }
});

router.get('/me/transactions', requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, transactions: [], total: 0, page: 1, hasMore: false });
  }
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const role = req.user?.role || 'farmer';
  try {
    const { transactions, total, hasMore } = await getWalletTransactions(userId, role, page, limit);
    res.json({ success: true, transactions, total, page, hasMore });
  } catch (err) {
    res.status(500).json({ success: false, transactions: [], total: 0, page: 1, hasMore: false });
  }
});

router.post('/withdraw', requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  const role = req.user?.role || 'farmer';
  if (role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can request withdrawals' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const {
    amount,
    accountNumber,
    confirmAccountNumber,
    ifscCode,
    upiId,
    mobileNumber,
    email,
  } = req.body || {};
  if (
    amount == null ||
    !accountNumber ||
    !confirmAccountNumber ||
    !ifscCode ||
    !mobileNumber ||
    !email
  ) {
    return res.status(400).json({
      error:
        'Missing required fields: amount, accountNumber, confirmAccountNumber, ifscCode, mobileNumber, email',
    });
  }
  if (String(accountNumber).trim() !== String(confirmAccountNumber).trim()) {
    return res.status(400).json({ error: 'Account number and confirm account number do not match' });
  }
  if (String(ifscCode).trim().length !== 11) {
    return res.status(400).json({ error: 'IFSC code must be exactly 11 characters' });
  }
  const mobile = String(mobileNumber).replace(/\D/g, '');
  if (mobile.length !== 10) {
    return res.status(400).json({ error: 'Mobile number must be 10 digits' });
  }
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(String(email).trim())) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  try {
    const result = await createWithdrawalRequest(userId, {
      amount: Number(amount),
      accountNumber: String(accountNumber).trim(),
      ifscCode: String(ifscCode).trim(),
      upiId: upiId ? String(upiId).trim() : undefined,
      mobileNumber: String(mobileNumber).trim(),
      email: String(email).trim(),
    });
    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. You will receive a confirmation once processed.',
      withdrawal: result.withdrawal,
      wallet: result.wallet,
    });
  } catch (err) {
    const msg = err?.message || 'Withdrawal request failed';
    if (msg.includes('Insufficient')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

// ─── Loyalty wallet (AgroCredits / Agro Coins) ────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const userEmail = req.user?.email;
  const userId = req.user?.userId;
  const role = req.user?.role || 'farmer';
  if (!userEmail && !userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const wallet = getWallet(userEmail, userId, role);
  if (!wallet) {
    return res.status(401).json({ error: 'Wallet not found' });
  }
  const walletResponse = { ...wallet, agroCoins: getSpendableCoins(wallet) };
  res.json({
    success: true,
    wallet: walletResponse,
    creditsToNextCoin: 1000 - wallet.pendingCredits,
    progressPercent: (wallet.pendingCredits / 1000) * 100,
  });
});

router.post('/earn', requireAuth, (req, res) => {
  const userEmail = req.user?.email;
  const userId = req.user?.userId;
  const role = req.user?.role || 'farmer';
  const { action, metadata } = req.body || {};
  if (!userEmail && !userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!CREDIT_RULES[action]) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }
  // LIST_WASTE: use trees equivalent from Carbon Impact when provided (1 tree = 1 AgroCredit)
  const useTreesForListWaste = action === 'LIST_WASTE' && metadata?.equivalentTrees != null;
  const amount = useTreesForListWaste
    ? Math.max(0, Math.round(Number(metadata.equivalentTrees)))
    : CREDIT_RULES[action];
  const descFn = DESCRIPTIONS[action];
  const description = typeof descFn === 'function' ? descFn(metadata) : String(amount);
  try {
    const result = addCredits(userEmail, userId, role, amount, description, action);
const walletResponse = { ...result.wallet, agroCoins: getSpendableCoins(result.wallet) };
  res.json({
    success: true,
    creditsEarned: amount,
    coinsEarned: result.coinsEarned,
    newTotal: result.newTotal,
    newCoins: walletResponse.agroCoins,
    pendingCredits: result.pendingCredits,
    creditsToNextCoin: result.creditsToNextCoin,
    wallet: walletResponse,
      message: result.coinsEarned > 0
        ? `+${amount} AgroCredits → 🪙 ${result.coinsEarned} Agro Coin earned!`
        : `+${amount} AgroCredits earned`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/transactions', requireAuth, (req, res) => {
  const userEmail = req.user?.email;
  const userId = req.user?.userId;
  const role = req.user?.role || 'farmer';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const wallet = getWallet(userEmail, userId, role);
  if (!wallet) {
    return res.status(401).json({ success: false, transactions: [], total: 0, page, hasMore: false });
  }
  const start = (page - 1) * limit;
  const transactions = wallet.transactions.slice(start, start + limit);
  res.json({
    success: true,
    transactions,
    total: wallet.transactions.length,
    page,
    hasMore: start + limit < wallet.transactions.length,
  });
});

router.post('/transfer', requireAuth, (req, res) => {
  const userEmail = req.user?.email;
  const userId = req.user?.userId;
  const role = req.user?.role || 'farmer';
  const { toEmail, toUserId, amountCoins, recipientRole } = req.body || {};
  const toKey = (toEmail || toUserId || '').trim().toLowerCase();
  if (!toKey) {
    return res.status(400).json({ success: false, error: 'Recipient (toEmail or toUserId) required' });
  }
  const recipientRoleVal = recipientRole === 'startup' ? 'startup' : 'farmer';
  try {
    const result = transferCoins(userEmail, userId, role, toKey, Number(amountCoins), recipientRoleVal);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const senderWallet = { ...result.senderWallet, agroCoins: getSpendableCoins(result.senderWallet) };
    const receiverWallet = { ...result.receiverWallet, agroCoins: getSpendableCoins(result.receiverWallet) };
    res.json({
      success: true,
      amount: result.amount,
      message: `Sent ${result.amount} Agro Coin${result.amount > 1 ? 's' : ''} successfully`,
      senderWallet,
      receiverWallet,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/users', requireAuth, (req, res) => {
  const role = req.user?.role || 'farmer';
  const entries = Object.values(wallets).filter((w) => w.role !== role);
  const users = entries.map((w) => ({
    email: w.userEmail,
    userId: w.userId,
    role: w.role,
    agroCoins: getSpendableCoins(w),
  }));
  res.json({ success: true, users });
});

router.get('/leaderboard', (req, res) => {
  const role = req.query.role;
  let entries = Object.values(wallets);
  if (role) entries = entries.filter((w) => w.role === role);
  const top = entries
    .sort((a, b) => getSpendableCoins(b) - getSpendableCoins(a) || b.agroCredits - a.agroCredits)
    .slice(0, 10)
    .map((w) => ({
      email: String(w.userEmail || '').replace(/(.{2}).*(@.*)/, '$1***$2'),
      role: w.role,
      agroCoins: getSpendableCoins(w),
      agroCredits: w.agroCredits,
    }));
  res.json({ success: true, leaderboard: top });
});

export default router;
