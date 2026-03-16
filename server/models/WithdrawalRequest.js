import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    farmerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    upiId: { type: String },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String },
    receiptUrl: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ farmerId: 1, createdAt: -1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
export default WithdrawalRequest;
