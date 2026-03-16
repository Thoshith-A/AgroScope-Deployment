import mongoose from 'mongoose';

const provisionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    wasteType: { type: String, required: true },
    quantityTons: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    price: { type: Number, required: false },
    status: { type: String, enum: ['active', 'fulfilled', 'expired'], default: 'active' },
  },
  { timestamps: true }
);

const Provision = mongoose.model('Provision', provisionSchema);
export default Provision;
