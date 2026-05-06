import mongoose from "mongoose";
const userAddressSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  state: { type: String },
  district: { type: String },
  postOffice: { type: String },
  pincode: { type: String },
}, { timestamps: true });

export const UserAddress = mongoose.model("UserAddress", userAddressSchema);
