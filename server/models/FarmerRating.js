/**
 * Entity: Farmer (rating system).
 * Rates farmers by waste quality grade and moisture percentage.
 */
import mongoose from 'mongoose';

const farmerRatingSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: false, trim: true }, // auth userId – optional for backward compat
    name: { type: String, required: true, trim: true },
    wasteQualityGrade: { type: String, required: true, enum: ['A', 'B', 'C'], trim: true },
    moisturePercentage: { type: Number, required: true, min: 0, max: 100 },
    ratingScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);
farmerRatingSchema.index({ farmerId: 1 }, { sparse: true });

const FarmerRating = mongoose.model('FarmerRating', farmerRatingSchema);
export default FarmerRating;
