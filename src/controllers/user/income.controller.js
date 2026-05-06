import { IncomeModel } from "../../models/Income.modal.js";
import { UserModel } from "../../models/user.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";

const incomeController = {
pairincome: async(req, res)=>{
    try { 
successResponse(res, "successfully");
    } catch (error) {
        console.error("Error in pair:", error);
      errorResponse(res, "Failed", 500);
    }
},
bonusincome: async(req, res)=>{
    try {
        const {userId} = req.params;
   
    //    await checkAndAddBonus(userId)

successResponse(res, "successfully");
    } catch (error) {
        console.error("Error in pair:", error);
      errorResponse(res, "Failed", 500);
    }
},

// Get user income history with detailed breakdown
getIncomeHistory: async (req, res) => {
  try {
    const userId = req.currentUser._id;
    const { startDate, endDate, type } = req.query;

    const filter = { user_id: userId };

    if (type) {
      filter.paymenttype = type;
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const incomes = await IncomeModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    // Get summary
    const summary = await IncomeModel.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: "$paymenttype",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const user = await UserModel.findById(userId).select("walletBalance totalIncome todayIncome");

    return successResponse(res, "Income history fetched successfully", {
      incomes,
      summary,
      walletBalance: user.walletBalance,
      totalIncome: user.totalIncome,
      todayIncome: user.todayIncome
    });
  } catch (error) {
    console.error("Get Income History Error:", error);
    return errorResponse(res, error.message, 500);
  }
},

// Get direct referral income details
getDirectIncome: async (req, res) => {
  try {
    const userId = req.currentUser._id;

    const directIncomes = await IncomeModel.find({
      user_id: userId,
      paymenttype: "Direct Referral Income"
    }).sort({ createdAt: -1 });

    const totalDirect = directIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    return successResponse(res, "Direct income fetched successfully", {
      incomes: directIncomes,
      total: totalDirect
    });
  } catch (error) {
    console.error("Get Direct Income Error:", error);
    return errorResponse(res, error.message, 500);
  }
},

// Get binary matching income details
getMatchingIncome: async (req, res) => {
  try {
    const userId = req.currentUser._id;

    const matchingIncomes = await IncomeModel.find({
      user_id: userId,
      paymenttype: "Binary Matching Income"
    }).sort({ createdAt: -1 });

    const totalMatching = matchingIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    return successResponse(res, "Matching income fetched successfully", {
      incomes: matchingIncomes,
      total: totalMatching
    });
  } catch (error) {
    console.error("Get Matching Income Error:", error);
    return errorResponse(res, error.message, 500);
  }
}
}
export {incomeController}
