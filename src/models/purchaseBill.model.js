import mongoose from "mongoose";

const purchaseBillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: String, required: true },
    billNumber: { type: String, trim: true },
    billDate: { type: Date, default: Date.now },
    customerName: { type: String, trim: true },
    productName: { type: String, trim: true, required: true },
    designName: { type: String, trim: true },
    materialType: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, trim: true, default: "pcs" },
    rate: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 1 },
    remarks: { type: String, trim: true },
    directIncomeAmount: { type: Number, default: 0 },
    purchaseCashbackAmount: { type: Number, default: 0 },
    binaryPoolAmount: { type: Number, default: 0 },
    binaryPoolUsed: { type: Number, default: 0 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseBillSchema.index({ user: 1, createdAt: -1 });
purchaseBillSchema.index({ userId: 1, createdAt: -1 });

export const PurchaseBillModel = mongoose.model("PurchaseBill", purchaseBillSchema);
