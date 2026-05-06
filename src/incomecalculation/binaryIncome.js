import { BinaryBusinessModel } from "../models/binaryBusiness.model.js";
import { BinarySettlementModel } from "../models/binarySettlement.model.js";
import { PurchaseBillModel } from "../models/purchaseBill.model.js";
import { UserModel } from "../models/user.model.js";
import { creditUserWallet } from "../utils/wallet.js";

const DIRECT_INCOME_RATE = 0.05;
const BINARY_POOL_RATE = 0.10;
const MAX_UPLINER_DEPTH = 100;
const REQUIRED_ACTIVE_DIRECTS_FOR_BINARY = 2;

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getRunDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export const getBinaryParentInfo = async (user) => {
  if (!user) return null;

  if (user.binaryParent && user.binarySide) {
    return {
      parentId: user.binaryParent,
      side: user.binarySide,
    };
  }

  const leftParent = await UserModel.findOne({ leftChild: user._id }).select("_id");
  if (leftParent) return { parentId: leftParent._id, side: "left" };

  const rightParent = await UserModel.findOne({ rightChild: user._id }).select("_id");
  if (rightParent) return { parentId: rightParent._id, side: "right" };

  return null;
};

export const getLegteamCount = async (rootId) => {
  if (!rootId) return { total: 0, active: 0, business: 0 };

  let total = 0;
  let active = 0;
  let business = 0;
  const queue = [rootId];

  while (queue.length) {
    const currentId = queue.shift();
    const user = await UserModel.findById(currentId).select(
      "leftChild rightChild isActivated totalPurchaseAmount"
    );
    if (!user) continue;

    total += 1;
    if (user.isActivated) active += 1;
    business += user.totalPurchaseAmount || 0;

    if (user.leftChild) queue.push(user.leftChild);
    if (user.rightChild) queue.push(user.rightChild);
  }

  return { total, active, business: roundMoney(business) };
};

export const createBinaryBusinessForPurchase = async ({ buyer, purchaseBill }) => {
  let currentUser = buyer;
  let depth = 0;
  const entries = [];

  while (currentUser && depth < MAX_UPLINER_DEPTH) {
    const parentInfo = await getBinaryParentInfo(currentUser);
    if (!parentInfo) break;

    const upliner = await UserModel.findById(parentInfo.parentId).select("_id userId role binaryParent binarySide");
    if (!upliner || upliner.role === "admin") break;

    entries.push({
      purchaseBill: purchaseBill._id,
      buyer: buyer._id,
      buyerUserId: buyer.userId,
      upliner: upliner._id,
      uplinerUserId: upliner.userId,
      leg: parentInfo.side,
      amount: purchaseBill.amount,
    });

    currentUser = upliner;
    depth += 1;
  }

  if (entries.length) {
    await BinaryBusinessModel.insertMany(entries, { ordered: false });
  }

  return entries.length;
};

export const payDirectIncomeForPurchase = async ({ buyer, purchaseBill }) => {
  if (!buyer.referrer) return null;

  const sponsor = await UserModel.findById(buyer.referrer).select("_id userId role walletBalance totalIncome todayIncome");
  if (!sponsor || sponsor.role === "admin") return null;

  const directAmount = roundMoney(purchaseBill.amount * DIRECT_INCOME_RATE);
  await creditUserWallet({
    user: sponsor,
    amount: directAmount,
    paymenttype: "Direct Referral Income",
    description: `5% direct income from purchase bill ${purchaseBill.billNumber || purchaseBill._id}`,
    meta: {
      purchaseBill: purchaseBill._id,
      sourceUserId: buyer.userId,
    },
  });

  purchaseBill.directIncomeAmount = directAmount;
  await purchaseBill.save();

  return directAmount;
};

const consumeBinaryPool = async (amount) => {
  let remaining = roundMoney(amount);
  if (remaining <= 0) return;

  const bills = await PurchaseBillModel.find({
    $expr: { $lt: ["$binaryPoolUsed", "$binaryPoolAmount"] },
  }).sort({ createdAt: 1 });

  for (const bill of bills) {
    if (remaining <= 0) break;
    const available = roundMoney(bill.binaryPoolAmount - bill.binaryPoolUsed);
    const useAmount = Math.min(available, remaining);
    bill.binaryPoolUsed = roundMoney(bill.binaryPoolUsed + useAmount);
    await bill.save();
    remaining = roundMoney(remaining - useAmount);
  }
};

const getActiveDirectCount = async (userId) =>
  UserModel.countDocuments({
    referrer: userId,
    role: "user",
    isActivated: true,
  });

export const settleDailyBinaryIncome = async (runDate = getRunDate()) => {
  const existing = await BinarySettlementModel.findOne({ runDate });
  if (existing) {
    return existing;
  }

  const [poolAgg] = await PurchaseBillModel.aggregate([
    {
      $project: {
        available: { $subtract: ["$binaryPoolAmount", "$binaryPoolUsed"] },
      },
    },
    { $match: { available: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$available" } } },
  ]);

  const availablePool = roundMoney(poolAgg?.total || 0);
  const users = await UserModel.find({ role: "user", isActivated: true }).select(
    "_id userId walletBalance totalIncome todayIncome binaryLeftCarryAmount binaryRightCarryAmount"
  );

  const claims = [];
  const processedUplinerIds = [];
  let totalMatchedBusiness = 0;
  let totalClaimAmount = 0;
  let usersSkippedForDirects = 0;

  for (const user of users) {
    const activeDirectCount = await getActiveDirectCount(user._id);
    if (activeDirectCount < REQUIRED_ACTIVE_DIRECTS_FOR_BINARY) {
      usersSkippedForDirects += 1;
      continue;
    }

    const [leftAgg, rightAgg] = await Promise.all([
      BinaryBusinessModel.aggregate([
        { $match: { upliner: user._id, leg: "left", processed: false } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      BinaryBusinessModel.aggregate([
        { $match: { upliner: user._id, leg: "right", processed: false } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const leftTotal = roundMoney((user.binaryLeftCarryAmount || 0) + (leftAgg[0]?.total || 0));
    const rightTotal = roundMoney((user.binaryRightCarryAmount || 0) + (rightAgg[0]?.total || 0));
    const matchedBusiness = roundMoney(Math.min(leftTotal, rightTotal));
    const hasPendingBusiness = (leftAgg[0]?.total || 0) > 0 || (rightAgg[0]?.total || 0) > 0;

    user.binaryLeftCarryAmount = roundMoney(leftTotal - matchedBusiness);
    user.binaryRightCarryAmount = roundMoney(rightTotal - matchedBusiness);
    await user.save();

    if (hasPendingBusiness) {
      processedUplinerIds.push(user._id);
    }

    if (matchedBusiness > 0) {
      const claimAmount = roundMoney(matchedBusiness * BINARY_POOL_RATE);
      claims.push({ user, leftTotal, rightTotal, matchedBusiness, claimAmount });
      totalMatchedBusiness = roundMoney(totalMatchedBusiness + matchedBusiness);
      totalClaimAmount = roundMoney(totalClaimAmount + claimAmount);
    }
  }

  const payoutRatio =
    totalClaimAmount > 0 && availablePool > 0
      ? Math.min(1, availablePool / totalClaimAmount)
      : 0;

  let paidAmount = 0;
  let usersPaid = 0;

  for (const claim of claims) {
    const payout = roundMoney(claim.claimAmount * payoutRatio);
    if (payout <= 0) continue;

    await creditUserWallet({
      user: claim.user,
      amount: payout,
      paymenttype: "Binary Matching Income",
      description: `Daily binary matching income for ${runDate}`,
      meta: {
        slsp: claim.leftTotal,
        srsp: claim.rightTotal,
        carryslsp: claim.user.binaryLeftCarryAmount,
        carrysrsp: claim.user.binaryRightCarryAmount,
      },
    });
    paidAmount = roundMoney(paidAmount + payout);
    usersPaid += 1;
  }

  if (processedUplinerIds.length) {
    await BinaryBusinessModel.updateMany(
      { upliner: { $in: processedUplinerIds }, processed: false },
      { $set: { processed: true, processedAt: new Date() } }
    );
  }

  await consumeBinaryPool(paidAmount);

  return BinarySettlementModel.create({
    runDate,
    totalMatchedBusiness,
    totalClaimAmount,
    availablePool,
    paidAmount,
    payoutRatio: roundMoney(payoutRatio),
    usersPaid,
    usersSkippedForDirects,
  });
};
