/**
 * Entity: WasteSupplyRecord
 * Historical supply records for 30-day forecast (moving average).
 */
import mongoose from 'mongoose';

const wasteSupplyRecordSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true, trim: true },
    wasteType: { type: String, required: true, trim: true },
    quantityInTons: { type: Number, required: true, min: 0 },
    dateRecorded: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

wasteSupplyRecordSchema.index({ wasteType: 1, dateRecorded: -1 });

const WasteSupplyRecord = mongoose.model('WasteSupplyRecord', wasteSupplyRecordSchema);
export default WasteSupplyRecord;
