/** @typedef {{ name: string, totalTransactions?: number, onTimePayments?: number, delayedPayments?: number, logisticsUpdatesSent?: number, totalLogisticsRequired?: number }} StartupCreateRequest */

/** @typedef {{ totalTransactions?: number, onTimePayments?: number, delayedPayments?: number, logisticsUpdatesSent?: number, totalLogisticsRequired?: number }} StartupUpdatePerformanceRequest */

/** @typedef {{ name: string, paymentScore: number, logisticsScore: number, finalScore: number, ratingOutOfFive: number }} StartupRatingResponse */

export function toRatingResponse(doc) {
  const total = Number(doc.totalTransactions) || 0;
  const paymentScore = total > 0 ? ((Number(doc.onTimePayments) || 0) / total) * 100 : 0;
  const logTotal = Number(doc.totalLogisticsRequired) || 0;
  const logisticsScore = logTotal > 0 ? ((Number(doc.logisticsUpdatesSent) || 0) / logTotal) * 100 : 0;
  const finalScore = Number(doc.ratingScore) ?? (paymentScore * 0.6 + logisticsScore * 0.4);
  const ratingOutOfFive = (finalScore / 100) * 5;
  return {
    name: doc.name,
    paymentScore: Math.round(paymentScore * 100) / 100,
    logisticsScore: Math.round(logisticsScore * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
    ratingOutOfFive: Math.round(ratingOutOfFive * 100) / 100,
  };
}
