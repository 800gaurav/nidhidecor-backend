import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { BCRYPTSALT } from "../config/index.js";

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_RETRIES = 3;

const userSchema = new mongoose.Schema(
  {
    userId: { type: String },
    name: { type: String },
    gender: {type: String},
    dateOfBirth: { type: Date, required: false }, 
    maritalStatus: {type: String},
    email: { type: String, },
    rightteam: { type: Number, default: 0 },
    leftteam: { type: Number, default: 0 },
    password: { type: String },
    forAdminPass: { type: String },
    phone: { type: Number },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    referralCode: { type: String, unique: true, uppercase: true, trim: true },
    sponsor: {type: String},
    totalIncome: { type: Number, default: 0 },
    referrer: { type: mongoose.Types.ObjectId, ref: 'User' },
    profilePhoto: {type: String},
    isActivated: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    emailOTP: { type: Number, select: false },
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    binaryParent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    binarySide: { type: String, enum: ["left", "right", null], default: null },
    walletBalance: { type: Number, default: 0 },
    binaryLeftCarryAmount: { type: Number, default: 0 },
    binaryRightCarryAmount: { type: Number, default: 0 },
    todayIncome: { type: Number, default: 0 },
    totalPurchaseAmount: { type: Number, default: 0 },
  address: { type: mongoose.Schema.Types.ObjectId, ref: "UserAddress" },
  userKyc: { type: mongoose.Schema.Types.ObjectId, ref: "UserKyc" },
  bankKyc: { type: mongoose.Schema.Types.ObjectId, ref: "BankKyc" },
  
  },
  {
    timestamps: true
  }
);

// 1️⃣ Referral code generate karne wale block
userSchema.statics.generateReferralCode = async function () {
  let referralCode;
  let attempts = 0;
  let isUnique = false;

  while (!isUnique && attempts < REFERRAL_CODE_MAX_RETRIES) {
    // Generate a random 4-digit number
    const randomPart = Math.floor(Math.random() * 10000) // 0-9999
      .toString()
      .padStart(5, '0');

    referralCode = `AH${randomPart}`; // ✅ prefix DNT + 4 digit

    // Check if code exists in database
    const existingUser = await this.findOne({ referralCode });
    if (!existingUser) isUnique = true;

    attempts++;
  }

  if (!isUnique) throw new Error('Failed to generate a unique referral code after maximum attempts');
  return referralCode;
};


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, Number(BCRYPTSALT));
    this.updatedAt = Date.now();
    return next();
  } catch (err) {
    return next(err);
  }
});

// 2️⃣ Middleware to generate referral code for new users
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    try {
      const code = await this.constructor.generateReferralCode();
      this.referralCode = code;

      // ✅ Assign same value to userId
      this.userId = code;

      return next();
    } catch (err) {
      return next(err);
    }
  }
  return next();
});

// 3️⃣ Existing userId middleware (logic untouched, fallback)
userSchema.pre('save', async function (next) {
  if (!this.isNew) return next(); // Only for new user

  if (this.userId) return next(); // Already set via referralCode

  let isUnique = false;
  let generatedUserId;
  const prefix = "AH";

  while (!isUnique) {
    const randomPart = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(5, '0'); 

    generatedUserId = `${prefix}${randomPart}`;

    const existingUser = await mongoose
      .model('User')
      .findOne({ userId: generatedUserId });

    if (!existingUser) isUnique = true;
  }

  this.userId = generatedUserId;
  next();
});




// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (typeof candidatePassword !== "string" || typeof this.password !== "string") {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

//Method to reset/change password token
userSchema.methods.createPasswordRestToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordRestExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};


//Forgot Password Method

const UserModel = mongoose.model("User", userSchema);

export { UserModel }
