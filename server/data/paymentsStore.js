/**
 * File-based store for payment records (startup payment screenshots + metadata).
 * Persists to server/data/payments.json so payments survive backend restarts.
 * Screenshot files are already saved under server/uploads/ and linked by screenshotFilename.
 * Linked to startup (buyerId) and provision (provisionId).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'payments.json');

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(records) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/** Get all payments (newest first). */
export async function getAll() {
  const list = await readAll();
  return list.sort((a, b) => (new Date(b.submittedAt) || 0) - (new Date(a.submittedAt) || 0));
}

/** Add a payment. Caller provides full document. */
export async function add(payment) {
  const records = await readAll();
  records.unshift(payment);
  await writeAll(records);
  return payment;
}

/** Update a payment by id (e.g. status, verifiedAt, verifiedBy). */
export async function updateById(id, updates) {
  const records = await readAll();
  const idx = records.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return null;
  Object.assign(records[idx], updates);
  await writeAll(records);
  return records[idx];
}
