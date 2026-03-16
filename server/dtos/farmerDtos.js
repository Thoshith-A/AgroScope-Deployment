/** @typedef {{ name: string, wasteQualityGrade: 'A'|'B'|'C', moisturePercentage: number }} FarmerCreateRequest */

/** @typedef {{ wasteQualityGrade?: 'A'|'B'|'C', moisturePercentage?: number }} FarmerUpdateQualityRequest */

/** @typedef {{ name: string, qualityScore: number, moistureScore: number, finalScore: number, ratingOutOfFive: number }} FarmerRatingResponse */

const QUALITY_SCORE = { A: 100, B: 80, C: 60 };

function getMoistureScore(moisture) {
  if (moisture <= 10) return 100;
  if (moisture <= 15) return 80;
  if (moisture <= 20) return 60;
  return 40;
}

export function toRatingResponse(doc) {
  const qualityScore = QUALITY_SCORE[doc.wasteQualityGrade] ?? 60;
  const moistureScore = getMoistureScore(Number(doc.moisturePercentage) ?? 0);
  const finalScore = Number(doc.ratingScore) ?? (qualityScore * 0.7 + moistureScore * 0.3);
  const ratingOutOfFive = (finalScore / 100) * 5;
  return {
    name: doc.name,
    qualityScore,
    moistureScore,
    finalScore: Math.round(finalScore * 100) / 100,
    ratingOutOfFive: Math.round(ratingOutOfFive * 100) / 100,
  };
}
