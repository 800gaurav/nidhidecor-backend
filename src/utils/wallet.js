import { IncomeModel } from "../models/Income.modal.js";
import { UserModel } from "../models/user.model.js";
import { WalletTransactionModel } from "../models/walletTransaction.model.js";

export const creditUserWallet = async ({ user, amount, paymenttype, description, meta = {} }) => {
  const creditAmount = Number(Number(amount).toFixed(2));
  if (!user || creditAmount <= 0) return null;

  const updatedUser = await UserModel.findByIdAndUpdate(
    user._id,
    {
      $inc: {
        walletBalance: creditAmount,
        totalIncome: creditAmount,
        todayIncome: creditAmount,
      },
    },
    { new: true }
  );

  await IncomeModel.create({
    user_id: updatedUser._id,
    userId: updatedUser.userId,
    paymenttype,
    amount: creditAmount,
    type: "income",
    ...meta,
  });

  await WalletTransactionModel.create({
    userId: updatedUser._id,
    type: "credit",
    amount: creditAmount,
    description,
    balanceAfter: updatedUser.walletBalance,
  });

  return updatedUser;
};
