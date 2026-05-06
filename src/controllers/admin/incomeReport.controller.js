import { IncomeModel } from "../../models/Income.modal.js";
import { UserModel } from "../../models/user.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";

// Get all income records for admin
export const getAllIncomeReport = async (req, res) => {
  try {
    const { userId, startDate, endDate, paymenttype } = req.query;

    const filter = {};

    // Filter by userId
    if (userId) {
      filter.userId = { $regex: userId, $options: 'i' };
    }

    // Filter by payment type
    if (paymenttype) {
      filter.paymenttype = paymenttype;
    }

    // Filter by date range
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const incomes = await IncomeModel.find(filter)
      .populate('user_id', 'userId name email phone')
      .sort({ createdAt: -1 })
      .limit(1000);

    // Calculate totals
    const totalAmount = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    
    const summary = {
      totalRecords: incomes.length,
      totalAmount: totalAmount,
      byType: {}
    };

    // Group by payment type
    incomes.forEach(inc => {
      if (!summary.byType[inc.paymenttype]) {
        summary.byType[inc.paymenttype] = {
          count: 0,
          amount: 0
        };
      }
      summary.byType[inc.paymenttype].count++;
      summary.byType[inc.paymenttype].amount += inc.amount || 0;
    });

    return successResponse(res, "Income report fetched successfully", {
      incomes,
      summary
    });
  } catch (error) {
    console.error("Get Income Report Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// Get income summary by date
export const getIncomeSummaryByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const summary = await IncomeModel.aggregate([
      { $match: { type: { $ne: "outcome" }, ...dateFilter } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            paymenttype: "$paymenttype"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]);

    return successResponse(res, "Income summary fetched successfully", summary);
  } catch (error) {
    console.error("Get Income Summary Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// Get user-wise income report
export const getUserWiseIncomeReport = async (req, res) => {
  try {
    const report = await IncomeModel.aggregate([
      { $match: { type: { $ne: "outcome" } } },
      {
        $group: {
          _id: "$userId",
          totalIncome: { $sum: "$amount" },
          directIncome: {
            $sum: {
              $cond: [{ $eq: ["$paymenttype", "Direct Referral Income"] }, "$amount", 0]
            }
          },
          matchingIncome: {
            $sum: {
              $cond: [{ $eq: ["$paymenttype", "Sales Incentive Income"] }, "$amount", 0]
            }
          },
          bonusIncome: {
            $sum: {
              $cond: [{ $eq: ["$paymenttype", "Sales Bonus Income"] }, "$amount", 0]
            }
          },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalIncome: -1 } },
      { $limit: 100 }
    ]);

    return successResponse(res, "User-wise income report fetched successfully", report);
  } catch (error) {
    console.error("Get User-wise Income Report Error:", error);
    return errorResponse(res, error.message, 500);
  }
};
