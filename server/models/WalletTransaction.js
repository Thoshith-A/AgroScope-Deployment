import mongoose from 'mongoose';

const TRANSACTION_TYPES = [
  'listing_credit',
  'platform_fee',
  'withdrawal_requested',
  'withdrawal_completed',
  'startup_payment',
];

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    type: { type: String, required: true, enum: TRANSACTION_TYPES },
    amount: { type: Number, required: true },
    description: { type: String },
    referenceId: { type: String }, // listing id or withdrawal id
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
export { TRANSACTION_TYPES };
