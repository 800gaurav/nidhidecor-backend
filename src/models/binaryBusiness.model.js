import mongoose from "mongoose";

const binaryBusinessSchema = new mongoose.Schema(
  {
    purchaseBill: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseBill", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyerUserId: { type: String, required: true },
    upliner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uplinerUserId: { type: String, required: true },
    leg: { type: String, enum: ["left", "right"], required: true },
    amount: { type: Number, required: true, min: 1 },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

binaryBusinessSchema.index({ processed: 1, upliner: 1, leg: 1 });
binaryBusinessSchema.index({ purchaseBill: 1, upliner: 1 }, { unique: true });

export const BinaryBusinessModel = mongoose.model("BinaryBusiness", binaryBusinessSchema);
