import mongoose from "mongoose";

const binarySettlementSchema = new mongoose.Schema(
  {
    runDate: { type: String, required: true, unique: true },
    totalMatchedBusiness: { type: Number, default: 0 },
    totalClaimAmount: { type: Number, default: 0 },
    availablePool: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    payoutRatio: { type: Number, default: 0 },
    usersPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BinarySettlementModel = mongoose.model("BinarySettlement", binarySettlementSchema);
