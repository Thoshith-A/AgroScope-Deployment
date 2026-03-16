/**
 * Synthetic price dataset for AI/demo: waste_type, price_per_kg, market_status, quantity_tons, moisture_percent, location, date.
 */
import mongoose from 'mongoose';

const priceDatasetSchema = new mongoose.Schema(
  {
    waste_type: { type: String, required: true, trim: true },
    price_per_kg: { type: Number, required: true, min: 0 },
    market_status: { type: String, required: true, enum: ['Below Market Price', 'Current Market Price', 'Above Market Price'], trim: true },
    quantity_tons: { type: Number, required: true, min: 0 },
    moisture_percent: { type: Number, required: true, min: 0, max: 100 },
    location: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

priceDatasetSchema.index({ waste_type: 1, date: -1 });

const PriceDataset = mongoose.model('PriceDataset', priceDatasetSchema);
export default PriceDataset;
