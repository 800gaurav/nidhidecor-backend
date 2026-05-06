import mongoose from "mongoose";

const bankKycSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  panNumber: { type: String },
  accountHolderName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  branchName: { type: String },

    // 🆕 New fields
  passbookPhoto: { type: String },
  pancardPhoto: { type: String },
  
  remark: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export const BankKyc = mongoose.model("BankKyc", bankKycSchema);
