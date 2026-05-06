import { BankKyc } from "../../models/bankKyc.modal.js";
import { UserModel } from "../../models/user.model.js";
import { WithdrawModel } from "../../models/withdraw.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";
import { UserKyc } from './../../models/userKyc.modal.js';


export const createWithdrawRequest = async (req, res) => {
  let deducted = false;
  let createdWithdraw = null;

  try {
    const userId = req.currentUser?._id;
    const { amount } = req.body;

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return errorResponse(res, "Valid amount is required", 400);
    }

    // ✅ check user
    const user = await UserModel.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);
    if(!user.isActivated) return errorResponse(res, "User is not Activated", 400);

    // ✅ check user KYC approved
    const userKyc = await UserKyc.findOne({ user_id: userId, status: "approved" });
    if (!userKyc) {
      return errorResponse(res, "KYC not approved. Please complete KYC first.", 400);
    }

    // ✅ check bank KYC approved
    const bankKyc = await BankKyc.findOne({ user_id: userId, status: "approved" });
    if (!bankKyc) {
      return errorResponse(res, "Bank KYC not approved. Please submit and approve bank details first.", 400);
    }

  //  ✅ check withdraw day (Thursday only)
    // const today = new Date();
    // const day = today.getDay(); 
    // if (day !== 4) {
    //   return errorResponse(res, "Withdrawals are allowed only on Thursday", 400);
    // }

    // ✅ check existing pending withdraw
    const existingPending = await WithdrawModel.findOne({ userId, status: "pending" });
    if (existingPending) {
      return errorResponse(res, "You already have a pending withdraw request", 400);
    }

    // ✅ deduct wallet balance (whole withdraw amount)
const updatedUser = await UserModel.findOneAndUpdate(
  { _id: userId, walletBalance: { $gte: amt } },
  { $inc: { walletBalance: -amt } },
  { new: true }
);
if (!updatedUser) {
  return errorResponse(res, "Insufficient balance", 400);
}
    deducted = true;

    // ✅ Calculate TDS & Maintenance
    const tds = (amt * 3) / 100;
    const maintenance = (amt * 2) / 100;
    const netAmount = amt - (tds + maintenance);

    // ✅ fetch bank details from BankKyc
    const paymentDetails = {
      accountNumber: bankKyc.accountNumber,
      ifscCode: bankKyc.ifscCode,
      bankName: bankKyc.bankName,
      branchName: bankKyc.branchName,
      accountHolderName: bankKyc.accountHolderName,
      panNumber: bankKyc.panNumber,
    };

    // ✅ Create withdraw request
    const newWithdraw = new WithdrawModel({
      userId,
      amount: amt,
      tds,
      maintenance,
      netAmount,
      ...paymentDetails,
    });

    createdWithdraw = await newWithdraw.save();

    return successResponse(res, "Withdraw request submitted successfully", createdWithdraw, 201);

  } catch (error) {
    console.error("Create Withdraw Error:", error);

    // rollback if wallet deducted but withdraw not created
    if (deducted && !createdWithdraw) {
      const userId = req.currentUser?._id;
      const amt = Number(req.body?.amount) || 0;
      if (userId && amt > 0) {
        await UserModel.findByIdAndUpdate(userId, { $inc: { walletBalance: amt } });
      }
    }

    return errorResponse(res, error.message || "Internal server error", 500);
  }
};

// export const createWithdrawRequest = async (req, res) => {
//   let deducted = false;
//   let createdWithdraw = null;

//   try {
//     const userId = req.currentUser?._id;
//     const { amount, accountNumber, ifscCode, accountHolderName, upiId } = req.body;

//     const amt = Number(amount);
//     if (!amt || isNaN(amt) || amt <= 0) {
//       return errorResponse(res, "Valid amount is required", 400);
//     }

//     // ✅ check user
//     const user = await UserModel.findById(userId);
//     if (!user) return errorResponse(res, "User not found", 404);
//     if (!user.isActivated) return errorResponse(res, "User not activated", 400);

//     // ✅ check user KYC approved
//     const userKyc = await UserKyc.findOne({ user_id: userId, status: "approved" });
//     if (!userKyc)
//       return errorResponse(res, "KYC not approved. Please complete KYC first.", 400);

//     // // ✅ check withdraw day (Thursday only)
//     // const today = new Date();
//     // const day = today.getDay(); // 4 = Thursday
//     // if (day !== 4) {
//     //   return errorResponse(res, "Withdrawals are allowed only on Thursday", 400);
//     // }

//     // ✅ check existing pending withdraw
//     const existingPending = await WithdrawModel.findOne({ userId, status: "pending" });
//     if (existingPending)
//       return errorResponse(res, "You already have a pending withdraw request", 400);

//     // ✅ check bank KYC
//     const bankKyc = await BankKyc.findOne({ user_id: userId, status: "approved" });

//     let tds = 0;
//     const maintenance = (amt * 2) / 100;
//     let paymentDetails = {};
//     let message = "";
//     let isKycCompleted = false;

//     if (bankKyc) {
//       // ✅ normal flow — bank KYC approved
//       tds = (amt * 3) / 100;
//       isKycCompleted = true;
//       paymentDetails = {
//         accountNumber: bankKyc.accountNumber,
//         ifscCode: bankKyc.ifscCode,
//         bankName: bankKyc.bankName,
//         branchName: bankKyc.branchName,
//         accountHolderName: bankKyc.accountHolderName,
//         panNumber: bankKyc.panNumber,
//       };
//     } else {
//       // ❌ bank KYC not completed
//       tds = (amt * 20) / 100;
//       message =
//         "Bank KYC not completed — 20% TDS will be charged. Please update KYC soon.";

//       // Agar frontend popup se accountNumber ya UPI bheja hai toh wahi use karega
//       if (!accountNumber && !upiId) {
//         // frontend ko flag bhejna
//         return res.status(400).json({
//           success: false,
//           bankKycNotCompleted: true,
//           message:
//             "Bank KYC not completed. Provide bank account number or UPI ID to continue (20% TDS will apply).",
//         });
//       }

//       paymentDetails = {
//         accountNumber: accountNumber || null,
//         ifscCode: ifscCode || null,
//         accountHolderName: accountHolderName || null,
//         upiId: upiId || null,
//       };
//     }

//     // ✅ deduct wallet balance
//     const updatedUser = await UserModel.findOneAndUpdate(
//       { _id: userId, walletBalance: { $gte: amt } },
//       { $inc: { walletBalance: -amt } },
//       { new: true }
//     );
//     if (!updatedUser) return errorResponse(res, "Insufficient balance", 400);

//     deducted = true;

//     const netAmount = amt - tds;

//     // ✅ Create withdraw request
//     const newWithdraw = new WithdrawModel({
//       userId,
//       amount: amt,
//       tds,
//       maintenance: 0,
//       netAmount,
//       ...paymentDetails,
//       note: message,
//     });

//     createdWithdraw = await newWithdraw.save();

//     return successResponse(
//       res,
//       isKycCompleted
//         ? "Withdraw request submitted successfully."
//         : "Withdraw submitted with 20% TDS due to incomplete KYC.",
//       createdWithdraw,
//       201
//     );
//   } catch (error) {
//     console.error("Create Withdraw Error:", error);

//     // rollback if wallet deducted but withdraw not created
//     if (deducted && !createdWithdraw) {
//       const userId = req.currentUser?._id;
//       const amt = Number(req.body?.amount) || 0;
//       if (userId && amt > 0) {
//         await UserModel.findByIdAndUpdate(userId, { $inc: { walletBalance: amt } });
//       }
//     }

//     return errorResponse(res, error.message || "Internal server error", 500);
//   }
// };

// ✅ Admin Approve Withdraw


export const approveWithdraw = async (req, res) => {
  try {
    const { id } = req.params;

    const withdraw = await WithdrawModel.findById(id);
    if (!withdraw) return res.status(404).json({ message: "Withdraw request not found" });

    // Prevent re-approval / invalid state changes
    if (withdraw.status === "approved") {
      return res.status(400).json({ message: "This request is already approved" });
    }
    if (withdraw.status === "rejected") {
      return res.status(400).json({ message: "This request is already rejected" });
    }

    // NOTE: we already deducted amount at request creation, so here we only mark approved.
    withdraw.status = "approved";
    withdraw.processedAt = new Date(); // optional: store processed timestamp
    await withdraw.save();

    return res.status(200).json({ success: true, message: "Withdraw approved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectWithdraw = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    const withdraw = await WithdrawModel.findById(id);
    if (!withdraw) return errorResponse(res, "Withdraw request not found", 404);

    // ❌ Prevent invalid rejections
    if (withdraw.status === "rejected") {
      return errorResponse(res, "This request is already rejected", 400);
    }
    if (withdraw.status === "approved") {
      return errorResponse(res, "This request is already approved", 400);
    }

    // ✅ Refund full requested amount (not net)
    const user = await UserModel.findById(withdraw.userId);
    if (!user) return errorResponse(res, "User not found", 404);

    await UserModel.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: withdraw.amount } }, // refund full amount
      { new: true }
    );

    // ✅ Update withdraw status
    withdraw.status = "rejected";
    withdraw.remark = remark || "Rejected by admin";
    withdraw.processedAt = new Date();
    await withdraw.save();

    return successResponse(res, "Withdraw rejected and amount refunded to wallet", withdraw, 200);

  } catch (error) {
    console.error("Reject Withdraw Error:", error);
    return errorResponse(res, error.message || "Internal server error", 500);
  }
};


export const getWithdrawRequests = async (req, res) => {
  try {
    const currentUser = await UserModel.findById(req.currentUser._id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin gets all, user gets only their own
    const filter = currentUser.role === "admin" ? {} : { userId: currentUser._id };

    const requests = await WithdrawModel.find(filter)
      .populate("userId", "userId name email")
      .sort({ createdAt: -1 });

    const response = requests.map(r => ({
      ...r.toObject(),
      userId: r.userId?.userId,  // custom userId field
      name: r.userId?.name,
      email: r.userId?.email,
    }));

    return res.json({
      success: true,
      message: "Withdraw requests fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("❌ Get Withdraw Requests Error:", error);
    res.status(500).json({ message: error.message });
  }
};