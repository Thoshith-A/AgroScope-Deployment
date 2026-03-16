/**
 * ML-ready supply forecast dataset.
 * Schema: date, crop_type, predicted_supply_tons, season, region, moisture_percent, demand_index.
 */
import mongoose from 'mongoose';

const supplyForecastSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    crop_type: { type: String, required: true, trim: true },
    predicted_supply_tons: { type: Number, required: true, min: 0 },
    season: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    moisture_percent: { type: Number, required: true, min: 0, max: 100 },
    demand_index: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true }
);

supplyForecastSchema.index({ crop_type: 1, date: 1 });

const SupplyForecastDataset = mongoose.model('SupplyForecastDataset', supplyForecastSchema);
export default SupplyForecastDataset;
