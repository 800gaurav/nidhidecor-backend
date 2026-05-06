import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import { IncomeModel } from "./Income.modal.js";

const WithdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  remark: { type: String }, // for admin rejection reason

  // Payment details
  upiId: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  tds: { type: Number, default: 3 },
  maintenance: { type: Number, default: 2 },
  netAmount: { type: Number, required: true },

  // Uploaded files
  passbookPhoto: { type: String },
  pancardPhoto: { type: String },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// WithdrawSchema.post("save", async function (doc) {
//   try {
//     if (doc.status !== "approved") return;

//     const user = await UserModel.findById(doc.userId);
//     if (!user) return;

//     // ✅ Create income history entry
//     await IncomeModel.create({
//       user_id: user._id,
//       userId: user.userId,   // from your UserModel field
//       paymenttype: "Withdraw Amount",
//       amount: doc.amount,
//       type: "outcome"
//     });

//     // Optionally, you can set processedAt if not already set
//     if (!doc.processedAt) {
//       doc.processedAt = new Date();
//       await doc.save();
//     }

//   } catch (error) {
//     console.error("Error creating income record for approved deposit:", error);
//   }
// });

export const WithdrawModel = mongoose.model("WithdrawRequest", WithdrawSchema);