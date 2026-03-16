/**
 * Wallet store for AgroScope dual-wallet system.
 * Separate wallets per role: farmers and startups each have their own wallet.
 * Key = (userEmail)_(role) e.g. east@argo_startup, f1@gmail.com_farmer.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLETS_FILE = path.join(__dirname, 'wallets.json');

const wallets = {};

const DEFAULT_WALLET = {
  userId: '',
  userEmail: '',
  role: '',
  agroCredits: 0,
  agroCoins: 0,
  pendingCredits: 0,
  totalEarned: 0,
  transferredInCoins: 0,
  transferredOutCoins: 0,
  transactions: [],
  lastUpdated: null,
};

/** Build wallet key: one wallet per (user, role) so farmer and startup are separate. */
function walletKey(userEmailOrId, role) {
  const base = (userEmailOrId || '').toString().trim().toLowerCase();
  const r = role === 'startup' ? 'startup' : 'farmer';
  return base ? `${base}_${r}` : '';
}

function loadWallets() {
  try {
    if (!existsSync(WALLETS_FILE)) return;
    const raw = readFileSync(WALLETS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed !== 'object') return;
    for (const key of Object.keys(parsed)) {
      wallets[key] = { ...DEFAULT_WALLET, ...parsed[key], transactions: Array.isArray(parsed[key].transactions) ? parsed[key].transactions : [] };
    }
    // Migrate legacy keys (no _farmer/_startup suffix) to role-scoped keys
    const legacyKeys = Object.keys(wallets).filter((k) => !k.endsWith('_farmer') && !k.endsWith('_startup'));
    for (const key of legacyKeys) {
      const w = wallets[key];
      const role = (w && w.role) === 'startup' ? 'startup' : 'farmer';
      const newKey = `${key}_${role}`;
      if (newKey !== key && !wallets[newKey]) {
        wallets[newKey] = { ...w, role };
      }
      delete wallets[key];
    }
    if (legacyKeys.length > 0) saveWallets();
  } catch (err) {
    console.warn('Wallet load skipped:', err.message);
  }
}

function saveWallets() {
  try {
    writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2), 'utf8');
  } catch (err) {
    console.warn('Wallet save failed:', err.message);
  }
}

loadWallets();

/**
 * Get (or create) the wallet for this user and role. Farmer and startup have separate wallets.
 * @param {string} userEmail
 * @param {string} userId
 * @param {string} role - 'farmer' | 'startup'
 */
export function getWallet(userEmail, userId, role) {
  const base = (userEmail || userId || '').toString().trim().toLowerCase();
  const r = role === 'startup' ? 'startup' : 'farmer';
  const key = walletKey(base, r);
  if (!key) return null;
  const logicalId = (userId || userEmail || base).toString();
  if (!wallets[key]) {
    wallets[key] = {
      ...DEFAULT_WALLET,
      userId: logicalId,
      userEmail: (userEmail || userId || base).toString(),
      role: r,
    };
    saveWallets();
  }
  return wallets[key];
}

/**
 * Add credits for an action. Auto-converts 1000 credits = 1 Agro Coin.
 * @returns {{ wallet, creditsAdded, coinsEarned, newTotal, newCoins, pendingCredits, creditsToNextCoin }}
 */
export function addCredits(userEmail, userId, role, amount, description, source) {
  const wallet = getWallet(userEmail, userId, role);
  if (!wallet) throw new Error('Wallet not found');

  const oldCoinsFromCredits = Math.floor((wallet.agroCredits || 0) / 1000);
  wallet.agroCredits += amount;
  wallet.totalEarned += amount;

  const newCoinsFromCredits = Math.floor(wallet.agroCredits / 1000);
  const coinsEarned = newCoinsFromCredits - oldCoinsFromCredits;
  wallet.pendingCredits = wallet.agroCredits % 1000;
  wallet.lastUpdated = new Date().toISOString();

  wallet.transactions.unshift({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'CREDIT_EARN',
    amount,
    description,
    source,
    agroCreditsAfter: wallet.agroCredits,
    agroCoinsAfter: getSpendableCoins(wallet),
    timestamp: new Date().toISOString(),
  });

  if (coinsEarned > 0) {
    wallet.transactions.unshift({
      id: `${Date.now()}_coin_${Math.random().toString(36).slice(2, 7)}`,
      type: 'COIN_CONVERT',
      amount: coinsEarned,
      description: `🪙 ${coinsEarned} Agro Coin${coinsEarned > 1 ? 's' : ''} earned! (${coinsEarned * 1000} credits converted)`,
      source: 'auto_conversion',
      agroCreditsAfter: wallet.agroCredits,
      agroCoinsAfter: getSpendableCoins(wallet),
      timestamp: new Date().toISOString(),
    });
  }

  wallet.transactions = wallet.transactions.slice(0, 50);

  saveWallets();
  return {
    wallet,
    creditsAdded: amount,
    coinsEarned,
    newTotal: wallet.agroCredits,
    newCoins: getSpendableCoins(wallet),
    pendingCredits: wallet.pendingCredits,
    creditsToNextCoin: 1000 - wallet.pendingCredits,
  };
}

const COIN_PRECISION = 8; // Bitcoin-style decimal support (e.g. 0.06, 0.008)

function roundCoins(value) {
  if (!Number.isFinite(value)) return 0;
  const m = 10 ** COIN_PRECISION;
  return Math.round(value * m) / m;
}

/**
 * Spendable Agro Coins = from conversion (floor(credits/1000)) + received - sent.
 * Supports decimal amounts (e.g. 0.06, 0.008).
 */
export function getSpendableCoins(wallet) {
  if (!wallet) return 0;
  const fromCredits = Math.floor((wallet.agroCredits || 0) / 1000);
  const inCoins = roundCoins(Number(wallet.transferredInCoins) || 0);
  const outCoins = roundCoins(Number(wallet.transferredOutCoins) || 0);
  return Math.max(0, roundCoins(fromCredits + inCoins - outCoins));
}

/**
 * Transfer Agro Coins from sender to recipient.
 * Sender and recipient identified by email or userId (must exist in wallets or be createable).
 * @param {string} senderEmail
 * @param {string} senderUserId
 * @param {string} senderRole
 * @param {string} toEmailOrUserId - recipient email or userId
 * @param {number} amountCoins
 * @param {string} recipientRole - 'farmer' | 'startup' (recipient role for wallet creation)
 * @returns {{ success: boolean, senderWallet: object, receiverWallet: object, error?: string }}
 */
export function transferCoins(senderEmail, senderUserId, senderRole, toEmailOrUserId, amountCoins, recipientRole) {
  const senderKey = senderEmail || senderUserId || '';
  const receiverKey = String(toEmailOrUserId || '').trim().toLowerCase();
  if (!senderKey || !receiverKey) return { success: false, error: 'Missing sender or recipient' };
  if (receiverKey === senderKey.toLowerCase()) return { success: false, error: 'Cannot transfer to yourself' };

  const amount = roundCoins(Number(amountCoins));
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Invalid amount' };

  const senderWallet = getWallet(senderEmail, senderUserId, senderRole);
  if (!senderWallet) return { success: false, error: 'Sender wallet not found' };

  const spendable = getSpendableCoins(senderWallet);
  if (spendable < amount) return { success: false, error: `Insufficient Agro Coins (have ${spendable})` };

  const receiverWallet = getWallet(receiverKey, receiverKey, recipientRole);
  if (!receiverWallet) return { success: false, error: 'Recipient wallet not found' };

  senderWallet.transferredOutCoins = roundCoins((Number(senderWallet.transferredOutCoins) || 0) + amount);
  receiverWallet.transferredInCoins = roundCoins((Number(receiverWallet.transferredInCoins) || 0) + amount);
  senderWallet.lastUpdated = new Date().toISOString();
  receiverWallet.lastUpdated = new Date().toISOString();

  const txId = `${Date.now()}_tx_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const amountLabel = amount % 1 === 0 ? String(amount) : amount.toFixed(8).replace(/\.?0+$/, '');
  senderWallet.transactions.unshift({
    id: txId,
    type: 'TRANSFER_OUT',
    amount,
    description: `Sent ${amountLabel} 🪙 Agro Coin${amount !== 1 ? 's' : ''} to ${receiverKey.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
    source: 'transfer',
    agroCreditsAfter: senderWallet.agroCredits,
    agroCoinsAfter: getSpendableCoins(senderWallet),
    timestamp: now,
    metadata: { to: receiverKey, role: recipientRole },
  });

  receiverWallet.transactions.unshift({
    id: `${txId}_recv`,
    type: 'TRANSFER_IN',
    amount,
    description: `Received ${amountLabel} 🪙 Agro Coin${amount !== 1 ? 's' : ''} from ${senderKey.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
    source: 'transfer',
    agroCreditsAfter: receiverWallet.agroCredits,
    agroCoinsAfter: getSpendableCoins(receiverWallet),
    timestamp: now,
    metadata: { from: senderKey, role: senderRole },
  });

  senderWallet.transactions = senderWallet.transactions.slice(0, 50);
  receiverWallet.transactions = receiverWallet.transactions.slice(0, 50);

  saveWallets();
  return {
    success: true,
    senderWallet,
    receiverWallet,
    amount,
  };
}

export { wallets };
