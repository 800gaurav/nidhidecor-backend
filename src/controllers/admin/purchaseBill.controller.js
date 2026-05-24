import { settleDailyBinaryIncome } from "../../incomecalculation/binaryIncome.js";
import {
  createBinaryBusinessForPurchase,
  payDirectIncomeForPurchase,
  payPurchaseCashbackForPurchase,
} from "../../incomecalculation/binaryIncome.js";
import { PurchaseBillModel } from "../../models/purchaseBill.model.js";
import { OrderModel } from "../../models/order.model.js";
import { UserModel } from "../../models/user.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getRunDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const createApprovedOrderFromPurchaseBill = async ({ user, bill, addedBy }) => {
  const existingOrder = await OrderModel.findOne({ purchaseBill: bill._id });
  if (existingOrder) return existingOrder;

  return OrderModel.create({
    billNumber: bill.billNumber
      ? `${bill.billNumber}-${bill._id.toString().slice(-6).toUpperCase()}`
      : `PB${bill._id.toString().slice(-8).toUpperCase()}`,
    txnId: `MANUAL-${bill._id.toString()}`,
    user: user._id,
    userId: user.userId,
    name: bill.customerName || user.name,
    phone: String(user.phone || ""),
    items: [
      {
        title: bill.productName,
        productCode: bill.designName || bill.materialType || "MANUAL",
        dp: bill.rate || bill.amount,
        mrp: bill.rate || bill.amount,
        sp: bill.amount,
        quantity: bill.quantity || 1,
        basicAmount: bill.amount,
        taxAmount: 0,
        netAmount: bill.amount,
      },
    ],
    totalBasic: bill.amount,
    totalTax: 0,
    totalShipping: 0,
    totalSp: bill.amount,
    netAmount: bill.amount,
    shippingAddress: "Manual purchase added by admin",
    shippingMobile: String(user.phone || "0000000000"),
    shippingPincode: "000000",
    mediumOfPayment: "Offline",
    status: "approved",
    approvedAt: new Date(),
    approvedBy: addedBy,
    purchaseBill: bill._id,
    remarks: bill.remarks || "Manual purchase bill",
  });
};

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
      binaryPoolAmount: roundMoney(purchaseAmount * 0.07),
      addedBy: req.currentUser?._id,
    });

    await UserModel.findByIdAndUpdate(user._id, {
      $inc: { totalPurchaseAmount: purchaseAmount },
      isActivated: true,
    });

    const directIncomeAmount = await payDirectIncomeForPurchase({ buyer: user, purchaseBill: bill });
    const purchaseCashbackAmount = await payPurchaseCashbackForPurchase({ buyer: user, purchaseBill: bill });
    const uplinersAdded = await createBinaryBusinessForPurchase({ buyer: user, purchaseBill: bill });
    const order = await createApprovedOrderFromPurchaseBill({
      user,
      bill,
      addedBy: req.currentUser?._id,
    });

    return successResponse(
      res,
      "Purchase bill added successfully",
      {
        bill,
        order,
        directIncomeAmount: directIncomeAmount || 0,
        purchaseCashbackAmount: purchaseCashbackAmount || 0,
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
    const isManualTest = Boolean(req.body?.manualTest);
    const runDate = isManualTest
      ? `${getRunDate()}-manual-${Date.now()}`
      : getRunDate();
    const settlement = await settleDailyBinaryIncome(runDate);
    return successResponse(res, "Binary settlement completed successfully", settlement);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
