import mongoose from "mongoose";
const userKycSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  documentType: { type: String},
  documentNumber: { type: String},
  documentFront: { type: String },
  documentBack: { type: String },
  remark: String,  
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export const UserKyc = mongoose.model("UserKyc", userKycSchema);
