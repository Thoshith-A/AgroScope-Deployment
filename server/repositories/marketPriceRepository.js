/**
 * Repository: MarketPriceRepository
 * Data access only. No business logic.
 */
import MarketPrice from '../models/MarketPrice.js';

/**
 * Find by wasteType and state (case-insensitive).
 * @param {string} wasteType
 * @param {string} state
 * @returns {Promise<import('mongoose').Document|null>}
 */
export async function findByWasteTypeIgnoreCaseAndStateIgnoreCase(wasteType, state) {
  if (!wasteType?.trim() || !state?.trim()) return null;
  return MarketPrice.findOne({
    wasteType: { $regex: new RegExp(`^${escapeRegex(wasteType.trim())}$`, 'i') },
    state: { $regex: new RegExp(`^${escapeRegex(state.trim())}$`, 'i') },
  }).lean();
}

/**
 * Find by wasteType only (case-insensitive), any state. For fallback when state not provided.
 */
export async function findByWasteTypeIgnoreCase(wasteType) {
  if (!wasteType?.trim()) return null;
  return MarketPrice.findOne({
    wasteType: { $regex: new RegExp(`^${escapeRegex(wasteType.trim())}$`, 'i') },
  })
    .sort({ lastUpdated: -1 })
    .lean();
}

/**
 * Save or update by wasteType + state. Upsert.
 */
export async function save(entity) {
  const doc = await MarketPrice.findOneAndUpdate(
    {
      wasteType: { $regex: new RegExp(`^${escapeRegex(entity.wasteType.trim())}$`, 'i') },
      state: { $regex: new RegExp(`^${escapeRegex(entity.state.trim())}$`, 'i') },
    },
    {
      $set: {
        wasteType: entity.wasteType.trim(),
        state: entity.state.trim(),
        avgPricePerKg: Number(entity.avgPricePerKg),
        source: (entity.source || '').trim() || 'Admin',
        lastUpdated: new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Count documents (for seed check).
 */
export async function count() {
  return MarketPrice.countDocuments();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
