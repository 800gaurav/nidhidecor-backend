import {
  createBinaryBusinessForPurchase,
  payDirectIncomeForPurchase,
  payPurchaseCashbackForPurchase,
} from "../incomecalculation/binaryIncome.js";
import { CartModel } from "../models/cart.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { PurchaseBillModel } from "../models/purchaseBill.model.js";
import { UserModel } from "../models/user.model.js";
import { errorResponse, successResponse } from "../utils/api-response.js";

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const createBillNumber = () => `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

const buildOrderItem = (product, quantity) => {
  const qty = Math.max(1, Number(quantity) || 1);
  const basicAmount = roundMoney((product.dp || 0) * qty);
  const taxRate = (product.cgstRate || 0) + (product.sgstRate || 0) + (product.igstRate || 0);
  const taxAmount = roundMoney(basicAmount * (taxRate / 100));
  const shippingCharge = roundMoney(product.shippingCharge || 0);

  return {
    product: product._id,
    title: product.title,
    productCode: product.productCode,
    dp: product.dp || 0,
    mrp: product.mrp || 0,
    sp: product.sp || 0,
    shippingCharge,
    cgstRate: product.cgstRate || 0,
    sgstRate: product.sgstRate || 0,
    igstRate: product.igstRate || 0,
    quantity: qty,
    basicAmount,
    taxAmount,
    netAmount: roundMoney(basicAmount + taxAmount + shippingCharge),
  };
};

const createPurchaseBillFromOrder = async ({ order, adminId }) => {
  if (order.purchaseBill) return PurchaseBillModel.findById(order.purchaseBill);

  const user = await UserModel.findById(order.user).select(
    "_id userId name referrer totalPurchaseAmount binaryParent binarySide"
  );
  if (!user) throw new Error("Order user not found");

  const bill = await PurchaseBillModel.create({
    user: user._id,
    userId: user.userId,
    billNumber: order.billNumber,
    billDate: new Date(),
    customerName: order.name || user.name,
    productName: order.items.map((item) => item.title).join(", "),
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    unit: "pcs",
    rate: order.netAmount,
    amount: order.netAmount,
    remarks: `Approved order ${order.billNumber}`,
    binaryPoolAmount: roundMoney(order.netAmount * 0.07),
    addedBy: adminId,
  });

  await UserModel.findByIdAndUpdate(user._id, {
    $inc: { totalPurchaseAmount: order.netAmount },
    isActivated: true,
  });

  const directIncomeAmount = await payDirectIncomeForPurchase({ buyer: user, purchaseBill: bill });
  const purchaseCashbackAmount = await payPurchaseCashbackForPurchase({ buyer: user, purchaseBill: bill });
  const uplinersAdded = await createBinaryBusinessForPurchase({ buyer: user, purchaseBill: bill });

  order.purchaseBill = bill._id;
  await order.save();

  return { bill, directIncomeAmount, purchaseCashbackAmount, uplinersAdded };
};

export const createOrder = async (req, res) => {
  try {
    const {
      txnId,
      products = [],
      shippingAddress,
      shippingMobile,
      shippingPincode,
      district,
      state,
      saleGroup,
      cf,
      cfType,
    } = req.body;

    if (!shippingAddress || !shippingMobile || !shippingPincode) {
      return errorResponse(res, "Delivery address, phone and pincode are required", 400);
    }
    if (!products.length) return errorResponse(res, "Please select at least one product", 400);

    const user = await UserModel.findById(req.currentUser._id).select("_id userId name phone");
    if (!user) return errorResponse(res, "User not found", 404);

    const productIds = products.map((item) => item.productId);
    const dbProducts = await ProductModel.find({ _id: { $in: productIds }, status: { $ne: "archived" } });
    const productMap = new Map(dbProducts.map((product) => [product._id.toString(), product]));

    const items = products.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("One or more products are not available");
      return buildOrderItem(product, item.quantity);
    });

    const totals = items.reduce(
      (acc, item) => ({
        totalBasic: roundMoney(acc.totalBasic + item.basicAmount),
        totalTax: roundMoney(acc.totalTax + item.taxAmount),
        totalShipping: roundMoney(acc.totalShipping + item.shippingCharge),
        totalSp: roundMoney(acc.totalSp + item.sp * item.quantity),
        netAmount: roundMoney(acc.netAmount + item.netAmount),
      }),
      { totalBasic: 0, totalTax: 0, totalShipping: 0, totalSp: 0, netAmount: 0 }
    );

    const order = await OrderModel.create({
      billNumber: createBillNumber(),
      txnId,
      user: user._id,
      userId: user.userId,
      name: user.name,
      phone: String(user.phone || shippingMobile),
      items,
      ...totals,
      shippingAddress,
      shippingMobile,
      shippingPincode,
      district,
      state,
      mediumOfPayment: "Offline",
      saleGroup,
      cf,
      cfType,
      status: "pending",
    });

    await CartModel.findOneAndUpdate({ user: user._id }, { $set: { items: [] } });

    return successResponse(res, "Order request sent to admin", order, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.currentUser.role !== "admin") filter.user = req.currentUser._id;

    const orderDocs = await OrderModel.find(filter).sort({ createdAt: -1 }).populate("purchaseBill");
    const orders = orderDocs.map((order) => order.toObject({ virtuals: true }));

    if (!req.query.status || req.query.status === "approved") {
      const linkedBillIds = orders
        .map((order) => order.purchaseBill?._id || order.purchaseBill)
        .filter(Boolean);
      const billFilter = linkedBillIds.length ? { _id: { $nin: linkedBillIds } } : {};
      if (req.currentUser.role !== "admin") billFilter.user = req.currentUser._id;

      const manualBills = await PurchaseBillModel.find(billFilter)
        .populate("user", "name userId phone")
        .sort({ billDate: -1, createdAt: -1 })
        .lean();

      const manualOrders = manualBills.map((bill) => ({
        _id: `bill-${bill._id}`,
        id: `bill-${bill._id}`,
        billNumber: bill.billNumber || `PB${bill._id.toString().slice(-8).toUpperCase()}`,
        txnId: `MANUAL-${bill._id}`,
        user: bill.user?._id || bill.user,
        userId: bill.userId,
        name: bill.customerName || bill.user?.name || "",
        phone: String(bill.user?.phone || ""),
        items: [
          {
            title: bill.productName,
            productCode: bill.designName || bill.materialType || "MANUAL",
            dp: bill.rate || bill.amount,
            mrp: bill.rate || bill.amount,
            sp: bill.amount,
            quantity: bill.quantity || 1,
            netAmount: bill.amount,
          },
        ],
        totalBasic: bill.amount,
        totalTax: 0,
        totalShipping: 0,
        totalSp: bill.amount,
        netAmount: bill.amount,
        shippingAddress: "Manual purchase added by admin",
        shippingMobile: String(bill.user?.phone || ""),
        shippingPincode: "",
        mediumOfPayment: "Offline",
        status: "approved",
        approvedAt: bill.createdAt,
        purchaseBill: bill,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      }));

      orders.push(...manualOrders);
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return successResponse(res, "Orders fetched successfully", orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    if (req.currentUser.role !== "admin") {
      return errorResponse(res, "Only admin can update order status", 401);
    }

    const { status, remarks } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return errorResponse(res, "Status must be approved or rejected", 400);
    }

    const order = await OrderModel.findById(req.params.id);
    if (!order) return errorResponse(res, "Order not found", 404);
    if (order.status !== "pending") {
      return errorResponse(res, `Order already ${order.status}`, 400);
    }

    order.status = status;
    order.remarks = remarks;

    let incomeResult = null;
    if (status === "approved") {
      order.approvedAt = new Date();
      order.approvedBy = req.currentUser._id;
      await order.save();
      incomeResult = await createPurchaseBillFromOrder({ order, adminId: req.currentUser._id });
    } else {
      order.rejectedAt = new Date();
      order.rejectedBy = req.currentUser._id;
      await order.save();
    }

    return successResponse(res, `Order ${status} successfully`, { order, incomeResult });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
