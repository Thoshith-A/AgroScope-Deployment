/**
 * Entity: CropWasteHistory
 * Historical crop waste collection data used as training dataset for forecast.
 */
import mongoose from 'mongoose';

const cropWasteHistorySchema = new mongoose.Schema(
  {
    wasteType: { type: String, required: true, trim: true },
    quantityTons: { type: Number, required: true, min: 0 },
    dateCollected: { type: Date, required: true },
    location: { type: String, required: false, trim: true, default: '' },
  },
  { timestamps: true }
);

cropWasteHistorySchema.index({ wasteType: 1, dateCollected: -1 });

const CropWasteHistory = mongoose.model('CropWasteHistory', cropWasteHistorySchema);
export default CropWasteHistory;
