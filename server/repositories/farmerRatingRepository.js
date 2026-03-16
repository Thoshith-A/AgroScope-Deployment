import FarmerRating from '../models/FarmerRating.js';
import mongoose from 'mongoose';

export async function findById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return FarmerRating.findById(id).lean();
}

export async function save(doc) {
  const created = await FarmerRating.create(doc);
  return created.toObject ? created.toObject() : created;
}

export async function updateQuality(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const updated = await FarmerRating.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return updated;
}

export async function findByFarmerId(farmerId) {
  if (!farmerId) return null;
  return FarmerRating.findOne({ farmerId: String(farmerId) }).lean();
}

export async function upsertByFarmer(farmerId, name, data) {
  const doc = {
    farmerId: String(farmerId),
    name: String(name || farmerId).trim(),
    wasteQualityGrade: ['A', 'B', 'C'].includes(String(data.wasteQualityGrade || 'B').toUpperCase()) ? String(data.wasteQualityGrade).toUpperCase() : 'B',
    moisturePercentage: Number(data.moisturePercentage) ?? 0,
  };
  const existing = await FarmerRating.findOne({ farmerId: doc.farmerId });
  if (existing) {
    const updated = await FarmerRating.findByIdAndUpdate(
      existing._id,
      { $set: { wasteQualityGrade: doc.wasteQualityGrade, moisturePercentage: doc.moisturePercentage } },
      { new: true, runValidators: true }
    ).lean();
    const qualityScore = { A: 100, B: 80, C: 60 }[updated.wasteQualityGrade] ?? 60;
    const m = Number(updated.moisturePercentage) ?? 0;
    const moistureScore = m <= 10 ? 100 : m <= 15 ? 80 : m <= 20 ? 60 : 40;
    const finalScore = qualityScore * 0.7 + moistureScore * 0.3;
    const ratingScore = Math.round(finalScore * 100) / 100;
    await FarmerRating.findByIdAndUpdate(existing._id, { $set: { ratingScore } });
    return { ...updated, ratingScore };
  }
  const qualityScore = { A: 100, B: 80, C: 60 }[doc.wasteQualityGrade] ?? 60;
  const m = Number(doc.moisturePercentage) ?? 0;
  const moistureScore = m <= 10 ? 100 : m <= 15 ? 80 : m <= 20 ? 60 : 40;
  doc.ratingScore = Math.round((qualityScore * 0.7 + moistureScore * 0.3) * 100) / 100;
  const created = await FarmerRating.create(doc);
  return created.toObject ? created.toObject() : created;
}
