/**
 * Entity: Startup (rating system).
 * Rates startups by payment efficiency and logistics update efficiency.
 */
import mongoose from 'mongoose';

const startupRatingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    totalTransactions: { type: Number, required: true, default: 0, min: 0 },
    onTimePayments: { type: Number, required: true, default: 0, min: 0 },
    delayedPayments: { type: Number, required: true, default: 0, min: 0 },
    logisticsUpdatesSent: { type: Number, required: true, default: 0, min: 0 },
    totalLogisticsRequired: { type: Number, required: true, default: 0, min: 0 },
    ratingScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

const StartupRating = mongoose.model('StartupRating', startupRatingSchema);
export default StartupRating;
