import mongoose from 'mongoose';

const cropWasteVerificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    imagePath: { type: String, required: true },
    image_hash: { type: String, required: true, unique: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    captured_at: { type: Number, required: true },
    device_id: { type: String, required: false },
  },
  { timestamps: true }
);

const CropWasteVerification = mongoose.model('CropWasteVerification', cropWasteVerificationSchema);
export default CropWasteVerification;
