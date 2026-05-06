import { JWT_EXPIRE, JWT_SECRET } from "../../config/index.js";
import { UserModel } from "../../models/user.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { UserKyc } from "../../models/userKyc.modal.js";
import { BankKyc } from "../../models/bankKyc.modal.js";
import { WithdrawModel } from "../../models/withdraw.model.js";
import { IncomeModel } from "../../models/Income.modal.js";
import { PurchaseBillModel } from "../../models/purchaseBill.model.js";

const userController = {
  // Get all users with pagination
  getUsers: async (req, res) => {
    try {
      let { page = 1, limit = 10, from, to } = req.query;

      page = Number(page);
      limit = Number(limit);

      const filter = {};

      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }

      const users = await UserModel.find(filter)
        .sort({ createdAt: -1 })
        .select("userId email phone name forAdminPass createdAt isActivated walletBalance totalIncome")
        .skip((page - 1) * limit)
        .limit(limit);

      const totalUsers = await UserModel.countDocuments(filter);

      successResponse(res, "Users fetched successfully", {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
      });
    } catch (err) {
      errorResponse(res, "Error fetching users", 500, err.message);
    }
  },

  // Get all pending users
  getPendingUsers: async (req, res) => {
    try {
      const pendingUsers = await UserModel.find({ isActivated: false })
        .select("userId name phone email createdAt walletBalance sponsor")
        .sort({ createdAt: -1 });

      res.status(200).json({
        message: "Pending users fetched successfully",
        count: pendingUsers.length,
        pendingUsers,
      });
    } catch (err) {
      res.status(500).json({
        message: "Error fetching pending users",
        error: err.message,
      });
    }
  },

  getdashboarddetails: async (req, res) => {
    try {
      const todayStart = dayjs().startOf("day").toDate();
      const todayEnd = dayjs().endOf("day").toDate();

      const [
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,
        totalBlockedUsers,
        todayJoinedUsers,
        totalWalletBalance,
        todayTotalIncome,
        totalIncome,
        totalApprovedWithdraw,
        totalPendingWithdraw,
        totalPendinguserKyc,
        totalPendingbankKyc,
        totalIncomeGivenToUsers,
        totalPurchases,
        todayPurchases,
        totalPurchaseAmount
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ isActivated: true }),
        UserModel.countDocuments({ isActivated: false }),
        UserModel.countDocuments({ isBlocked: true }),
        UserModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$walletBalance" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$todayIncome" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$totalIncome" } } }]),
        WithdrawModel.aggregate([
          { $match: { status: "approved" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        WithdrawModel.countDocuments({ status: "pending" }),
        UserKyc.countDocuments({ status: "pending" }),
        BankKyc.countDocuments({ status: "pending" }),
        IncomeModel.aggregate([
          { $match: { type: { $ne: "outcome" } } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        PurchaseBillModel.countDocuments(),
        PurchaseBillModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
        PurchaseBillModel.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
      ]);

      const safeSum = (agg) => {
        if (!agg || !agg[0] || !agg[0].total) return 0;
        const val = agg[0].total;
        const num = typeof val === "object" && val._bsontype === "Decimal128"
          ? parseFloat(val.toString())
          : val;
        return parseFloat(num.toFixed(2));
      };

      const stats = {
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,
        totalBlockedUsers,
        todayJoinedUsers,
        totalWalletBalance: safeSum(totalWalletBalance),
        todayTotalIncome: safeSum(todayTotalIncome),
        totalIncome: safeSum(totalIncome),
        totalApprovedWithdraw: safeSum(totalApprovedWithdraw),
        totalPendingWithdraw,
        totalPendinguserKyc,
        totalPendingbankKyc,
        totalIncomeGivenToUsers: safeSum(totalIncomeGivenToUsers),
        totalPurchases,
        todayPurchases,
        totalPurchaseAmount: safeSum(totalPurchaseAmount)
      };

      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("❌ Admin dashboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  getSuspendedUser: async (req, res) => {
    try {
      const users = await UserModel.find({ isBlocked: true }).select(
        "userId name phone email createdAt walletBalance sponsor isBlocked"
      );

      if (!users || users.length === 0) {
        return res.status(200).json({
          message: "No suspended users found",
          users: [],
        });
      }

      res.status(200).json({
        message: "Suspended users fetched successfully",
        users,
      });
    } catch (err) {
      res.status(500).json({
        message: "Error fetching suspended users",
        error: err.message,
      });
    }
  },

  unblockUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (typeof status !== "boolean") {
        return res.status(400).json({ message: "Status must be true or false" });
      }

      const user = await UserModel.findOne({ userId });
      if (!user) return res.status(404).json({ message: "User not found" });

      user.isBlocked = status;
      await user.save();

      res.status(200).json({
        message: "User status updated successfully",
        isBlocked: user.isBlocked,
      });
    } catch (err) {
      res.status(500).json({
        message: "Error updating user status",
        error: err.message,
      });
    }
  },

  loginAsUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const token = jwt.sign(
        { _id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      successResponse(res, "Login as user token generated", { token });
    } catch (err) {
      errorResponse(res, "Error generating login token", 500, err.message);
    }
  },

  getAdminDirectReferrals: async (req, res) => {
    try {
      const adminId = req.currentUser._id;

      const directReferrals = await UserModel.find({ referrer: adminId })
        .select("userId walletBalance createdAt isActivated")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: directReferrals.length,
        referrals: directReferrals,
      });
    } catch (error) {
      console.error("Admin direct referrals error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error,
      });
    }
  },

  getallactiveusers: async (req, res) => {
    try {
      const users = await UserModel.find({
        isBlocked: false,
        isActivated: true,
      }).select("userId name phone email createdAt walletBalance sponsor isBlocked");

      res.status(200).json({
        message: "Active users fetched successfully",
        count: users.length,
        users,
      });
    } catch (err) {
      res.status(500).json({
        message: "Error fetching active users",
        error: err.message,
      });
    }
  },

  adminUpdateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        name, phone, email,
        walletBalance,
        password,
        isActivated
      } = req.body;

      const user = await UserModel.findOne({ userId });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (email) user.email = email;
      if (walletBalance !== undefined) user.walletBalance = walletBalance;
      if (typeof isActivated === "boolean") user.isActivated = isActivated;
      if (password) user.password = password;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: {
          userId: user.userId,
          name: user.name,
          phone: user.phone,
          email: user.email,
          walletBalance: user.walletBalance,
          isActivated: user.isActivated
        }
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  UserKyc: async (req, res) => {
    try {
      const { kycId } = req.params;
      const { status, remark } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status. Use 'approved' or 'rejected'." });
      }

      const kyc = await UserKyc.findById(kycId);
      if (!kyc) {
        return res.status(404).json({ success: false, message: "KYC record not found" });
      }

      kyc.status = status;
      if (remark) kyc.remark = remark;

      await kyc.save();

      return res.status(200).json({
        success: true,
        message: `KYC ${status} successfully`,
        data: kyc
      });
    } catch (err) {
      console.error("KYC review error:", err);
      return res.status(500).json({ success: false, message: "Failed to review KYC" });
    }
  },

  bankKyc: async (req, res) => {
    try {
      const { kycId } = req.params;
      const { status, remark } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status. Use 'approved' or 'rejected'." });
      }

      const kyc = await BankKyc.findById(kycId);
      if (!kyc) {
        return res.status(404).json({ success: false, message: "KYC record not found" });
      }

      kyc.status = status;
      if (remark) kyc.remark = remark;

      await kyc.save();

      return res.status(200).json({
        success: true,
        message: `KYC ${status} successfully`,
        data: kyc
      });
    } catch (err) {
      console.error("KYC review error:", err);
      return res.status(500).json({ success: false, message: "Failed to review KYC" });
    }
  },

  getuserkyc: async (req, res) => {
    try {
      let query = {};

      if (req.currentUser.role !== "admin") {
        query.user_id = req.currentUser._id;
      }

      const kycs = await UserKyc.find(query)
        .populate({
          path: "user_id",
          model: "User",
          select: "name email phone userId"
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: kycs.length,
        data: kycs
      });
    } catch (err) {
      console.error("Get KYC error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch KYC records" });
    }
  },

  getBankkyc: async (req, res) => {
    try {
      let kycs;

      if (req.currentUser.role === "admin") {
        kycs = await BankKyc.find()
          .populate("user_id", "name email phone userId")
          .sort({ createdAt: -1 });
      } else {
        kycs = await BankKyc.find({ user_id: req.currentUser._id })
          .populate("user_id", "name email phone userId")
          .sort({ createdAt: -1 });
      }

      return res.status(200).json({
        success: true,
        count: kycs.length,
        data: kycs
      });
    } catch (err) {
      console.error("Get Bank KYC error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch Bank KYC records"
      });
    }
  }
};

export { userController };
