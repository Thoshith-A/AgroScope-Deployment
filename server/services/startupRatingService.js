/**
 * Startup Rating Service.
 * Payment Score = (onTimePayments / totalTransactions) * 100
 * Logistics Score = (logisticsUpdatesSent / totalLogisticsRequired) * 100
 * Final = (Payment * 0.6) + (Logistics * 0.4). 5-star = (finalScore/100)*5.
 */
import * as repo from '../repositories/startupRatingRepository.js';
import { toRatingResponse } from '../dtos/startupDtos.js';
import { NotFoundException } from '../exceptions/NotFoundException.js';

function recalcRatingScore(doc) {
  const total = Number(doc.totalTransactions) || 0;
  const paymentScore = total > 0 ? ((Number(doc.onTimePayments) || 0) / total) * 100 : 0;
  const logTotal = Number(doc.totalLogisticsRequired) || 0;
  const logisticsScore = logTotal > 0 ? ((Number(doc.logisticsUpdatesSent) || 0) / logTotal) * 100 : 0;
  return Math.round((paymentScore * 0.6 + logisticsScore * 0.4) * 100) / 100;
}

export async function createStartup(request) {
  const doc = {
    name: String(request.name).trim(),
    totalTransactions: Number(request.totalTransactions) || 0,
    onTimePayments: Number(request.onTimePayments) || 0,
    delayedPayments: Number(request.delayedPayments) || 0,
    logisticsUpdatesSent: Number(request.logisticsUpdatesSent) || 0,
    totalLogisticsRequired: Number(request.totalLogisticsRequired) || 0,
  };
  doc.ratingScore = recalcRatingScore(doc);
  const saved = await repo.save(doc);
  return { id: saved._id.toString(), name: saved.name, ratingScore: saved.ratingScore };
}

export async function updatePerformance(id, request) {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundException('Startup', id);
  const updated = {
    totalTransactions: request.totalTransactions !== undefined ? Number(request.totalTransactions) : existing.totalTransactions,
    onTimePayments: request.onTimePayments !== undefined ? Number(request.onTimePayments) : existing.onTimePayments,
    delayedPayments: request.delayedPayments !== undefined ? Number(request.delayedPayments) : existing.delayedPayments,
    logisticsUpdatesSent: request.logisticsUpdatesSent !== undefined ? Number(request.logisticsUpdatesSent) : existing.logisticsUpdatesSent,
    totalLogisticsRequired: request.totalLogisticsRequired !== undefined ? Number(request.totalLogisticsRequired) : existing.totalLogisticsRequired,
  };
  updated.ratingScore = recalcRatingScore({ ...existing, ...updated });
  const doc = await repo.updatePerformance(id, updated);
  if (!doc) throw new NotFoundException('Startup', id);
  return toRatingResponse(doc);
}

export async function getRating(id) {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundException('Startup', id);
  return toRatingResponse(doc);
}
