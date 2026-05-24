import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    title: { type: String, trim: true, required: true },
    productCode: { type: String, trim: true },
    dp: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sp: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    basicAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    billNumber: { type: String, trim: true, unique: true, index: true },
    txnId: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: String, trim: true, required: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    items: [orderItemSchema],
    totalBasic: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalShipping: { type: Number, default: 0 },
    totalSp: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, min: 1 },
    shippingAddress: { type: String, trim: true, required: true },
    shippingMobile: { type: String, trim: true, required: true },
    shippingPincode: { type: String, trim: true, required: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    mediumOfPayment: { type: String, default: "Offline" },
    saleGroup: { type: String, trim: true },
    cf: { type: String, trim: true },
    cfType: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    purchaseBill: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseBill" },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, status: 1, createdAt: -1 });

export const OrderModel = mongoose.model("Order", orderSchema);
