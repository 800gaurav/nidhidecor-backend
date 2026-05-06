// models/TempUser.js
import mongoose from "mongoose";

const TempUserSchema = new mongoose.Schema({
  name: String,
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  dateOfBirth: Date,
  // email: { type: String},
  email: { type: String, index: false, unique: false },
  maritalStatus: String,
  phone: String,
  password: String,
  referrerCode: String,

  address: {
 addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  state: { type: String },
  district: { type: String },
  postOffice: { type: String },
  pincode: { type: String },
  },
  bankKyc :{
panNumber: { type: String },
  accountHolderName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  branchName: { type: String },
  },
userKyc:{
 documentType: { type: String},
  documentNumber: { type: String},
  documentFront: { type: String },
  documentBack: { type: String }, 
},

  otp: String,
  otpExpiry: Date,
}, { timestamps: true });

export const TempUserModel = mongoose.model("TempUser", TempUserSchema);
