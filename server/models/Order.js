import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    provisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provision', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'fulfilled'], default: 'pending', index: true },
    message: { type: String },
    // Optional: for startup rating (payment & logistics efficiency)
    paymentCompletedAt: { type: Date },
    deliveryCompletedAt: { type: Date },
    // Optional: for farmer rating (quality, moisture, rejection)
    qualityGrade: { type: Number, min: 0, max: 10 },
    moisturePercent: { type: Number, min: 0, max: 100 },
    rejected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;


