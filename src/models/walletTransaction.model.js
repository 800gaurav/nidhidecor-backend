import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["credit", "debit"], required: true }, // ✅ credit/debit
  amount: { type: Number, required: true },
  description: { type: String }, // e.g. "Topup approved", "Order payment"
  balanceAfter: { type: Number, required: true }, // ✅ transaction ke baad balance
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const WalletTransactionModel = mongoose.model("WalletTransaction", walletTransactionSchema);
