import { findInDownline } from "../../helper/searchUser.js";
import { getLegteamCount } from "../../incomecalculation/binaryIncome.js";
import { PurchaseBillModel } from "../../models/purchaseBill.model.js";
import { UserModel } from "../../models/user.model.js";

const TREE_USER_FIELDS =
  "_id userId name email phone sponsor createdAt isActivated totalPurchaseAmount leftChild rightChild";



const profileController = {

  getprofile: async (req, res)=>{
    try {
        const userId = req.currentUser._id;
        
         const user = await UserModel.findById(userId).populate("address").populate("userKyc").populate("bankKyc")
         if(!user) return res.status(404).json({success: false, message: "user not found"});
         return res.status(200).json({success: true, message: "user profile fatched successfully", data: user});

    } catch (error) {

      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile"
      });
    }
},
  userUpdateprofile: async(req, res) => {
    const userId = req.currentUser._id;
    const {addressLine1, addressLine2, city, state, district, postOffice, pincode} = req.body;
    const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.address) {
        await UserAddress.findByIdAndUpdate(user.address, {
          addressLine1,
          addressLine2,
          city,
          state,
          district,
          postOffice,
          pincode
        });
      } else {
        const newAddress = await UserAddress.create({
          user_id: user._id,
          addressLine1,
          addressLine2,
          city,
          state,
          district,
          postOffice,
          pincode
        });

        user.address = newAddress._id;
        await user.save();
      }
},
  userUpdatebankkyc: async(req, res) => {
    const userId = req.currentUser._id;
    const {addressLine1, addressLine2, city, state, district, postOffice, pincode} = req.body;
    const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.bankKyc) {
        await UserAddress.findByIdAndUpdate(user.bankKyc, {
          addressLine1,
          addressLine2,
          city,
          state,
          district,
          postOffice,
          pincode
        });
      } else {
        const newAddress = await UserAddress.create({
          user_id: user._id,
          addressLine1,
          addressLine2,
          city,
          state,
          district,
          postOffice,
          pincode
        });

        user.address = newAddress._id;
        await user.save();
      }
},

  getleftrightchild: async (req, res) =>{
      try {
    const { userId } = req.params;
    const { searchId } = req.query;

    const user = await UserModel.findById(userId)
      .select(TREE_USER_FIELDS)
      .populate("leftChild", TREE_USER_FIELDS)
      .populate("rightChild", TREE_USER_FIELDS);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

      if (searchId) {
        const foundUser = await findInDownline(userId, searchId);
        if (!foundUser) {
          return res.json({ success: false, message: "User not found in downline" });
        }
        return res.json({ success: true, data: foundUser });
      }

    return res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to fetch tree" });
  }
  },

  userdata: async (req, res) => {
    try {
      const userId = req.currentUser._id;

      const user = await UserModel.findById(userId).populate("bankKyc", "status").populate("userKyc", "status")
      const bankKyc = user.bankKyc?.status || "pending";
      const userKyc = user.userKyc?.status || "pending";
      if (!user) {

        return res.status(404).json({ success: false, message: "User not found" });
      }
      const leftteam = await getLegteamCount(user.leftChild)
      const rightteam = await getLegteamCount(user.rightChild)
      await user.save();
      const dashboardData = {
        username: user.name,
        isActivated: user.isActivated,
        totalPurchaseAmount: user.totalPurchaseAmount || 0,
        totalIncome: user.totalIncome,
        email: user.email,
        phone: user.phone,
        walletBalance: user.walletBalance,
        todayIncome: user.todayIncome,
        leftteamactive: leftteam.active,
        rightteamactive: rightteam.active,
        leftBusiness: leftteam.business,
        rightBusiness: rightteam.business,
        leftteam: leftteam.total,
        rightteam: rightteam.total,
        bankKyc,
        userKyc
      };

      return res.status(200).json({
        success: true,
        message: "User income details fetched successfully",
        data: dashboardData
      });
    } catch (error) {
      console.error("Get Income Details Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  purchaseBills: async (req, res) => {
    try {
      const userId = req.currentUser._id;
      const { from, to, page = 1, limit = 50 } = req.query;
      const filter = { user: userId };

      if (from || to) {
        filter.billDate = {};
        if (from) filter.billDate.$gte = new Date(from);
        if (to) filter.billDate.$lte = new Date(to);
      }

      const pageNumber = Number(page) || 1;
      const pageSize = Number(limit) || 50;

      const [bills, total, user] = await Promise.all([
        PurchaseBillModel.find(filter)
          .sort({ billDate: -1, createdAt: -1 })
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        PurchaseBillModel.countDocuments(filter),
        UserModel.findById(userId).select(
          "walletBalance totalIncome todayIncome totalPurchaseAmount binaryLeftCarryAmount binaryRightCarryAmount"
        ),
      ]);

      const totals = bills.reduce(
        (acc, bill) => {
          acc.amount += Number(bill.amount || 0);
          acc.direct += Number(bill.directIncomeAmount || 0);
          acc.binaryPool += Number(bill.binaryPoolAmount || 0);
          acc.binaryPaid += Number(bill.binaryPoolUsed || 0);
          return acc;
        },
        { amount: 0, direct: 0, binaryPool: 0, binaryPaid: 0 }
      );

      return res.status(200).json({
        success: true,
        message: "Purchase bills fetched successfully",
        data: {
          bills,
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: pageNumber,
          totals,
          walletBalance: user?.walletBalance || 0,
          totalIncome: user?.totalIncome || 0,
          todayIncome: user?.todayIncome || 0,
          totalPurchaseAmount: user?.totalPurchaseAmount || 0,
          binaryLeftCarryAmount: user?.binaryLeftCarryAmount || 0,
          binaryRightCarryAmount: user?.binaryRightCarryAmount || 0,
        },
      });
    } catch (error) {
      console.error("Get purchase bills error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  updatestatus: async (req, res) => {
  try {
  await UserModel.updateMany(
      {},           
      { isActivated: false }  
    );
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
    });

  } catch (error) {
    console.error("Error fetching commission details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
  },

getLegStats: async (rootId) => {
  if (!rootId) return { teamCount: 0, business: 0 };

  let teamCount = 0;
  let business = 0;
  const queue = [rootId];

  while (queue.length) {
    const currentId = queue.shift();
    const user = await UserModel.findById(currentId).select("leftChild rightChild totalPurchaseAmount");
    if (!user) continue;

    teamCount++;

    // ✅ Calculate total SP for this user
    business += user.totalPurchaseAmount || 0;

    // ✅ Push child nodes
    if (user.leftChild) queue.push(user.leftChild);
    if (user.rightChild) queue.push(user.rightChild);
  }

  return { teamCount, business };
},


  


}
export {profileController}
