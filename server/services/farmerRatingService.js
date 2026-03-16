/**
 * Farmer Rating Service.
 * Quality: A=100, B=80, C=60. Moisture: <=10→100, 11-15→80, 16-20→60, >20→40.
 * Final = (Quality*0.7) + (Moisture*0.3). 5-star = (finalScore/100)*5.
 */
import * as repo from '../repositories/farmerRatingRepository.js';
import { toRatingResponse } from '../dtos/farmerDtos.js';
import { NotFoundException } from '../exceptions/NotFoundException.js';

const QUALITY_SCORE = { A: 100, B: 80, C: 60 };

function getMoistureScore(moisture) {
  if (moisture <= 10) return 100;
  if (moisture <= 15) return 80;
  if (moisture <= 20) return 60;
  return 40;
}

function recalcRatingScore(doc) {
  const qualityScore = QUALITY_SCORE[doc.wasteQualityGrade] ?? 60;
  const moistureScore = getMoistureScore(Number(doc.moisturePercentage) ?? 0);
  return Math.round((qualityScore * 0.7 + moistureScore * 0.3) * 100) / 100;
}

export async function createFarmer(request) {
  const doc = {
    name: String(request.name).trim(),
    wasteQualityGrade: ['A', 'B', 'C'].includes(String(request.wasteQualityGrade).toUpperCase()) ? String(request.wasteQualityGrade).toUpperCase() : 'B',
    moisturePercentage: Number(request.moisturePercentage) ?? 0,
  };
  doc.ratingScore = recalcRatingScore(doc);
  const saved = await repo.save(doc);
  return { id: saved._id.toString(), name: saved.name, ratingScore: saved.ratingScore };
}

export async function updateQuality(id, request) {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundException('Farmer', id);
  const updated = {
    wasteQualityGrade: request.wasteQualityGrade !== undefined ? String(request.wasteQualityGrade).toUpperCase() : existing.wasteQualityGrade,
    moisturePercentage: request.moisturePercentage !== undefined ? Number(request.moisturePercentage) : existing.moisturePercentage,
  };
  if (!['A', 'B', 'C'].includes(updated.wasteQualityGrade)) updated.wasteQualityGrade = existing.wasteQualityGrade;
  updated.ratingScore = recalcRatingScore({ ...existing, ...updated });
  const doc = await repo.updateQuality(id, updated);
  if (!doc) throw new NotFoundException('Farmer', id);
  return toRatingResponse(doc);
}

export async function getRating(id) {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundException('Farmer', id);
  return toRatingResponse(doc);
}

/** Upsert farmer rating by auth farmerId; returns { ratingOutOfFive } for API. */
export async function upsertByFarmer(farmerId, name, request) {
  const doc = await repo.upsertByFarmer(farmerId, name || farmerId, {
    wasteQualityGrade: request.wasteQualityGrade,
    moisturePercentage: request.moisturePercentage,
  });
  const out = toRatingResponse(doc);
  return { ratingOutOfFive: out.ratingOutOfFive };
}
