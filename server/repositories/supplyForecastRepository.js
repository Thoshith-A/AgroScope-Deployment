/**
 * Supply forecast dataset repository.
 */
import SupplyForecastDataset from '../models/SupplyForecastDataset.js';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get up to 30 daily supply records for crop_type (any 30-day window).
 */
export async function find30DaysByCropType(cropType) {
  return SupplyForecastDataset.find({
    crop_type: { $regex: new RegExp(`^${escapeRegex(String(cropType).trim())}$`, 'i') },
  })
    .sort({ date: 1 })
    .limit(30)
    .lean();
}

export async function count() {
  return SupplyForecastDataset.countDocuments();
}
