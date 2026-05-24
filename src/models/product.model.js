import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    handle: { type: String, trim: true, index: true },
    title: { type: String, trim: true, required: true },
    productCode: { type: String, trim: true, unique: true, sparse: true },
    category: { type: String, trim: true, default: "Uncategorized" },
    description: { type: String, trim: true, default: "" },
    vendor: { type: String, trim: true },
    mrp: { type: Number, default: 0 },
    sp: { type: Number, default: 0 },
    dp: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    hsnCode: { type: String, trim: true },
    color: { type: String, trim: true },
    image: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    inventoryQty: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
    source: { type: String, enum: ["admin", "csv"], default: "admin" },
  },
  { timestamps: true }
);

productSchema.index({ title: "text", description: "text", category: "text" });

export const ProductModel = mongoose.model("Product", productSchema);
