/** @typedef {{ wasteType: string, lastThreeMonthAverage: number, predictedNext30Days: number, confidenceLevel: 'HIGH'|'MEDIUM'|'LOW' }} ForecastResponse */

export function toForecastResponse(wasteType, monthlyAvgTons, recordCount) {
  const lastThreeMonthAverage = Math.round((monthlyAvgTons ?? 0) * 100) / 100;
  const predictedNext30Days = Math.round((monthlyAvgTons ?? 0) * 100) / 100;
  let confidenceLevel = 'LOW';
  if (recordCount >= 6) confidenceLevel = 'HIGH';
  else if (recordCount >= 3) confidenceLevel = 'MEDIUM';
  return {
    wasteType,
    lastThreeMonthAverage,
    predictedNext30Days,
    confidenceLevel,
  };
}
