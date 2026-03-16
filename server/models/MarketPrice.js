/**
 * Entity: MarketPrice
 * Unique constraint on (wasteType + state).
 * Database only – no external API.
 */
import mongoose from 'mongoose';

const marketPriceSchema = new mongoose.Schema(
  {
    wasteType: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    avgPricePerKg: { type: Number, required: true, min: 0 },
    source: { type: String, default: '', trim: true },
    lastUpdated: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

marketPriceSchema.index({ wasteType: 1, state: 1 }, { unique: true });

const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);
export default MarketPrice;
