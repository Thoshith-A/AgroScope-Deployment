/**
 * File-based store for crop waste verifications when MongoDB is not available.
 * Persists to server/data/crop-waste-verifications.json so uploads work without a database.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'crop-waste-verifications.json');

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

/**
 * Find a record by image_hash (for deduplication).
 */
export async function findByImageHash(imageHash) {
  const records = await readAll();
  return records.find((r) => r.image_hash === imageHash) || null;
}

/**
 * Create a new verification record. Returns the created record with _id and createdAt.
 */
export async function create(doc) {
  const records = await readAll();
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const record = {
    _id: id,
    ...doc,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  records.push(record);
  await writeAll(records);
  return record;
}

/**
 * List records by userId, sorted by captured_at descending.
 */
export async function findByUserId(userId) {
  const records = await readAll();
  return records
    .filter((r) => r.userId === userId)
    .sort((a, b) => (b.captured_at || 0) - (a.captured_at || 0));
}

/**
 * Find a record by _id (for delete).
 */
export async function findById(id) {
  const records = await readAll();
  return records.find((r) => r._id === id) || null;
}

/**
 * Delete a record by _id. Returns the deleted record (with imagePath) or null if not found.
 */
export async function deleteById(id) {
  const records = await readAll();
  const idx = records.findIndex((r) => r._id === id);
  if (idx === -1) return null;
  const [deleted] = records.splice(idx, 1);
  await writeAll(records);
  return deleted;
}
