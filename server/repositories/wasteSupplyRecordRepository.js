import WasteSupplyRecord from '../models/WasteSupplyRecord.js';

export async function create(record) {
  const doc = await WasteSupplyRecord.create(record);
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Get records for wasteType in the last 3 months, for moving average.
 */
export async function findLastThreeMonthsByWasteType(wasteType) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return WasteSupplyRecord.find({
    wasteType: { $regex: new RegExp(`^${escapeRegex(String(wasteType).trim())}$`, 'i') },
    dateRecorded: { $gte: threeMonthsAgo },
  })
    .sort({ dateRecorded: 1 })
    .lean();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
