import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    role: { type: String, required: true, enum: ['farmer', 'startup'], index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    totalEarned: { type: Number, required: true, default: 0, min: 0 },
    totalWithdrawn: { type: Number, required: true, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 }, // for startup role
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1, role: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
