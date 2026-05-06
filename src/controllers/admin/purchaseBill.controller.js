import { settleDailyBinaryIncome } from "../../incomecalculation/binaryIncome.js";
import {
  createBinaryBusinessForPurchase,
  payDirectIncomeForPurchase,
} from "../../incomecalculation/binaryIncome.js";
import { PurchaseBillModel } from "../../models/purchaseBill.model.js";
import { UserModel } from "../../models/user.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

export const createPurchaseBill = async (req, res) => {
  try {
    const {
      userId,
      billNumber,
      billDate,
      customerName,
      productName,
      designName,
      materialType,
      quantity = 1,
      unit = "pcs",
      rate,
      amount,
      remarks,
    } = req.body;

    if (!userId || !productName || !amount) {
      return errorResponse(res, "User ID, product name and amount are required", 400);
    }

    const purchaseAmount = roundMoney(amount);
    if (purchaseAmount <= 0) {
      return errorResponse(res, "Amount must be greater than 0", 400);
    }

    const user = await UserModel.findOne({ userId }).select(
      "_id userId name referrer totalPurchaseAmount binaryParent binarySide"
    );
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const bill = await PurchaseBillModel.create({
      user: user._id,
      userId: user.userId,
      billNumber,
      billDate: billDate ? new Date(billDate) : new Date(),
      customerName: customerName || user.name,
      productName,
      designName,
      materialType,
      quantity: Number(quantity) || 1,
      unit,
      rate: rate !== undefined ? roundMoney(rate) : 0,
      amount: purchaseAmount,
      remarks,
      binaryPoolAmount: roundMoney(purchaseAmount * 0.10),
      addedBy: req.currentUser?._id,
    });

    await UserModel.findByIdAndUpdate(user._id, {
      $inc: { totalPurchaseAmount: purchaseAmount },
    });

    const directIncomeAmount = await payDirectIncomeForPurchase({ buyer: user, purchaseBill: bill });
    const uplinersAdded = await createBinaryBusinessForPurchase({ buyer: user, purchaseBill: bill });

    return successResponse(
      res,
      "Purchase bill added successfully",
      {
        bill,
        directIncomeAmount: directIncomeAmount || 0,
        binaryPoolAmount: bill.binaryPoolAmount,
        uplinersAdded,
      },
      201
    );
  } catch (error) {
    console.error("Create purchase bill error:", error);
    return errorResponse(res, error.message, 500);
  }
};

export const getPurchaseBills = async (req, res) => {
  try {
    const { userId, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (from || to) {
      filter.billDate = {};
      if (from) filter.billDate.$gte = new Date(from);
      if (to) filter.billDate.$lte = new Date(to);
    }

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 20;

    const [bills, total] = await Promise.all([
      PurchaseBillModel.find(filter)
        .populate("user", "name userId phone email")
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      PurchaseBillModel.countDocuments(filter),
    ]);

    return successResponse(res, "Purchase bills fetched successfully", {
      bills,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: pageNumber,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const runBinarySettlement = async (req, res) => {
  try {
    const settlement = await settleDailyBinaryIncome();
    return successResponse(res, "Binary settlement completed successfully", settlement);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
