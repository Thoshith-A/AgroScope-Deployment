/**
 * File-based store for farmer provisions when MongoDB is not used.
 * Persists to server/data/provisions.json so listings survive backend restarts.
 * Linked to farmer by userId.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'provisions.json');

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

/** Get all provisions (newest first). */
export async function getAll() {
  const list = await readAll();
  return list.sort((a, b) => (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0));
}

/** Add a provision. Caller provides full document with _id. */
export async function add(provision) {
  const records = await readAll();
  records.unshift(provision);
  await writeAll(records);
  return provision;
}

/** Update a provision by _id (e.g. payment_status after admin verify). */
export async function updateById(id, updates) {
  const records = await readAll();
  const idx = records.findIndex((r) => String(r._id) === String(id));
  if (idx === -1) return null;
  Object.assign(records[idx], updates);
  await writeAll(records);
  return records[idx];
}

/** Find one by _id. */
export async function findById(id) {
  const records = await readAll();
  return records.find((r) => String(r._id) === String(id)) || null;
}
