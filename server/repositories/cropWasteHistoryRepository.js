/**
 * Repository: CropWasteHistory – training dataset for forecast.
 */
import CropWasteHistory from '../models/CropWasteHistory.js';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fetch all records for wasteType in the last 90 days, sorted by date ascending.
 */
export async function findLast90DaysByWasteType(wasteType) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return CropWasteHistory.find({
    wasteType: { $regex: new RegExp(`^${escapeRegex(String(wasteType).trim())}$`, 'i') },
    dateCollected: { $gte: ninetyDaysAgo },
  })
    .sort({ dateCollected: 1 })
    .lean();
}

export async function create(doc) {
  const created = await CropWasteHistory.create(doc);
  return created.toObject ? created.toObject() : created;
}

export async function count() {
  return CropWasteHistory.countDocuments();
}
