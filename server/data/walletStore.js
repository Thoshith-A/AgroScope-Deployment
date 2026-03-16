/**
 * File-based store for balance Wallet, WalletTransaction, and WithdrawalRequest
 * when MongoDB is not available. Persists to server/data/.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLETS_FILE = path.join(__dirname, 'wallets-balance.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'wallet-transactions.json');
const WITHDRAWALS_FILE = path.join(__dirname, 'withdrawal-requests.json');

async function readJson(filePath, defaultVal = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return data != null ? data : defaultVal;
  } catch (err) {
    if (err.code === 'ENOENT') return defaultVal;
    throw err;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// --- Wallets (balance wallet, keyed by userId)
export async function getWalletByUserId(userId) {
  const wallets = await readJson(WALLETS_FILE, []);
  return wallets.find((w) => String(w.userId) === String(userId)) || null;
}

export async function createOrUpdateWallet(userId, role, updates = {}) {
  const wallets = await readJson(WALLETS_FILE, []);
  let w = wallets.find((x) => String(x.userId) === String(userId));
  if (!w) {
    w = {
      _id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: String(userId),
      role: role === 'startup' ? 'startup' : 'farmer',
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    wallets.push(w);
  }
  if (updates.balance != null) w.balance = Number(updates.balance);
  if (updates.totalEarned != null) w.totalEarned = Number(updates.totalEarned);
  if (updates.totalWithdrawn != null) w.totalWithdrawn = Number(updates.totalWithdrawn);
  if (updates.totalSpent != null) w.totalSpent = Number(updates.totalSpent);
  w.updatedAt = new Date().toISOString();
  await writeJson(WALLETS_FILE, wallets);
  return w;
}

// --- Wallet transactions
export async function createTransaction(doc) {
  const list = await readJson(TRANSACTIONS_FILE, []);
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const tx = {
    _id: id,
    walletId: doc.walletId,
    type: doc.type,
    amount: Number(doc.amount),
    description: doc.description || null,
    referenceId: doc.referenceId || null,
    status: doc.status || 'completed',
    createdAt: new Date().toISOString(),
  };
  list.push(tx);
  await writeJson(TRANSACTIONS_FILE, list);
  return tx;
}

export async function findTransactionsByWalletId(walletId, limit = 50, skip = 0) {
  const list = await readJson(TRANSACTIONS_FILE, []);
  return list
    .filter((t) => String(t.walletId) === String(walletId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(skip, skip + limit);
}

export async function countTransactionsByWalletId(walletId) {
  const list = await readJson(TRANSACTIONS_FILE, []);
  return list.filter((t) => String(t.walletId) === String(walletId)).length;
}

// --- Withdrawal requests
export async function createWithdrawalRequest(doc) {
  const list = await readJson(WITHDRAWALS_FILE, []);
  const id = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const req = {
    _id: id,
    walletId: doc.walletId,
    farmerId: doc.farmerId,
    amount: Number(doc.amount),
    accountNumber: doc.accountNumber,
    ifscCode: doc.ifscCode,
    upiId: doc.upiId || null,
    mobileNumber: doc.mobileNumber,
    email: doc.email,
    status: 'pending',
    adminNote: null,
    receiptUrl: null,
    requestedAt: new Date().toISOString(),
    processedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(req);
  await writeJson(WITHDRAWALS_FILE, list);
  return req;
}

export async function findWithdrawalById(id) {
  const list = await readJson(WITHDRAWALS_FILE, []);
  return list.find((r) => r._id === id) || null;
}

export async function updateWithdrawal(id, updates) {
  const list = await readJson(WITHDRAWALS_FILE, []);
  const idx = list.findIndex((r) => r._id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeJson(WITHDRAWALS_FILE, list);
  return list[idx];
}

export async function listWithdrawals(status = null) {
  const list = await readJson(WITHDRAWALS_FILE, []);
  let out = list.sort((a, b) => new Date(b.requestedAt || b.createdAt) - new Date(a.requestedAt || a.createdAt));
  if (status) out = out.filter((r) => r.status === status);
  return out;
}
