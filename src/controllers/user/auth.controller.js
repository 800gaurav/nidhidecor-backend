import jwt from "jsonwebtoken";

import { UserModel } from "../../models/user.model.js";

import { errorResponse, successResponse } from "../../utils/api-response.js";
import { getRandomOTP } from "../../utils/random-otp.js";
import { JWT_EXPIRE, JWT_SECRET } from "../../config/index.js";
import { sendRegisterationOTP, sendRegistrationCredentialsEmail, sendRegistrationOTP } from "../../utils/nodemailer.js";

import bcrypt from 'bcryptjs';

import { findBinaryPlacement } from "../../helper/binaryPlacement.js";
import { getLegteamCount } from "../../incomecalculation/binaryIncome.js";
import { BankKyc } from "../../models/bankKyc.modal.js";
import { UserKyc } from "../../models/userKyc.modal.js";
import { UserAddress } from "../../models/userAddress.modal.js";
import { TempUserModel } from "../../models/tempmodel.js";


// helper to escape user input for RegExp
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parseUserData = (body = {}) => {
  if (body.userData && typeof body.userData === "object") return body.userData;
  if (body.userData && typeof body.userData === "string") {
    try {
      return JSON.parse(body.userData);
    } catch {
      return {};
    }
  }

  const parsed = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^userData\[(.+)\]$/);
    if (!match) continue;

    const path = match[1].split("][");
    let cursor = parsed;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        cursor[part] = value;
      } else {
        cursor[part] = cursor[part] || {};
        cursor = cursor[part];
      }
    });
  }

  return parsed;
};

const authController = {
  sendEmailOTP: async (req, res) => {
    try {
      const { email } = req.body;
      console.log("Send OTP request for:", email);

      if (!email) return errorResponse(res, "Email is required", 400);

      const existingUsers = await UserModel.countDocuments({ email });
      if (existingUsers >= 7) {
        return errorResponse(res, "Maximum 7 accounts can be registered with this email", 409);
      }

      const newOTP = getRandomOTP(6);
      console.log("Generated OTP:", newOTP);

      await TempUserModel.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            otp: newOTP,
            otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await sendRegisterationOTP(email, newOTP);
      console.log("Email sent successfully");

      console.log("OTP saved to temp DB");
      
      return successResponse(res, "OTP sent successfully.");
    } catch (error) {
      console.error("Send OTP Error:", error);
      return errorResponse(res, error.message || "Failed to send OTP", 500);
    }
  },

  sendPhoneOTP: async (req, res) => {
    const { phone } = req.body;
    const user = await UserModel.findOne({ phone });
    if (user && user.isPhoneVerified === true) return errorResponse(res, "Phone already in use", 409);

    const newOTP = getRandomOTP(6);
    if (!user) {
      user = new UserModel({ email, phoneOTP: newOTP });
    } else {
      user.phoneOTP = newOTP;
    };

    await user.save();
    return successResponse(res, "OTP sent successfully.");
  },

  register: async (req, res) => {
    try {
      const { email, otp } = req.body;
      const userData = parseUserData(req.body);

      if (!email || !otp || !userData || Object.keys(userData).length === 0) {
        return res.status(400).json({ success: false, message: "Email, OTP & userData required" });
      }

      // Verify OTP
      const tempUser = await TempUserModel.findOne({ email, otp: String(otp) });
      if (!tempUser) {
        return errorResponse(res, "Invalid or expired OTP", 400);
      }

      if (tempUser.otpExpiry && tempUser.otpExpiry < new Date()) {
        await TempUserModel.deleteOne({ _id: tempUser._id });
        return errorResponse(res, "Invalid or expired OTP", 400);
      }

      const existingUsers = await UserModel.countDocuments({ email });
      if (existingUsers >= 7) {
        return res.status(400).json({
          success: false,
          message: "Maximum 7 accounts can be registered with this email"
        });
      }

      if (!userData.name || !userData.phone || !userData.password || !userData.referrerCode) {
        return errorResponse(res, "Name, phone, password and referral code are required", 400);
      }

      delete userData.side;

      const sponsor = await UserModel.findOne({ referralCode: userData.referrerCode });
      if (!sponsor) return errorResponse(res, "Sponsor not found", 404);

      const placement = await findBinaryPlacement(sponsor);
      const placementParent = await UserModel.findById(placement.parent._id);
      if (!placementParent) return errorResponse(res, "Placement parent not found", 404);

      const newUser = await UserModel.create({
        name: userData.name,
        email,
        phone: userData.phone,
        password: userData.password,
        gender: userData.gender,
        dateOfBirth: userData.dateOfBirth,
        maritalStatus: userData.maritalStatus,
        sponsor: sponsor.userId,
        referrer: sponsor._id,
        referralLevel: (sponsor.referralLevel || 0) + 1,
      });

      if (placement.side === "left") placementParent.leftChild = newUser._id;
      else placementParent.rightChild = newUser._id;
      newUser.binaryParent = placementParent._id;
      newUser.binarySide = placement.side;
      await placementParent.save();
      await newUser.save();

      await TempUserModel.deleteOne({ _id: tempUser._id });

      // Send credentials email
      await sendRegistrationCredentialsEmail({
        toEmail: newUser.email,
        name: newUser.name,
        userId: newUser.userId,
        password: userData.password,
        referralCode: newUser.referralCode,
      });

      const token = jwt.sign({ _id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

      return successResponse(res, "User registered successfully. Login credentials sent to your email.", { user: newUser, token }, 201);
    } catch (err) {
      console.error(err);
      return res.status(500).json({success: false, message: err.message });
    }
  },

  // updateAddress: async (req, res) => {
  //   try {
  //     const userId = req.currentUser._id;
  //     const { address } = req.body;

  //     if (!address) {
  //       return res.status(400).json({ success: false, message: "Address is required" });
  //     }

  //     // Check if user exists
  //     const user = await UserModel.findById(userId).populate("address");
  //     if (!user) {
  //       return res.status(404).json({ success: false, message: "User not found" });
  //     }

  //     let addressDoc;
  //     if (user.address) {

  //       addressDoc = await UserAddress.findByIdAndUpdate(
  //         user.address,
  //         { $set: address },
  //         { new: true }
  //       );
  //     } else {
  //       addressDoc = await UserAddress.create({ user_id: user._id, ...address });
  //       user.address = addressDoc._id;
  //       await user.save();
  //     }

  //     return res.json({
  //       success: true,
  //       message: "Address updated successfully",
  //       address: addressDoc,
  //     });

  //   } catch (err) {
  //     console.error(err);
  //     return res.status(500).json({ success: false, message: "Failed to update address" });
  //   }
  // },

  updateAddress: async (req, res) => {
  try {
    const userId = req.currentUser._id; // token se aaya hua userId

    const {
      addressLine1,
      addressLine2,
      city,
      state,
      district,
      postOffice,
      pincode
    } = req.body;

    if (!addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const newAddress = await UserAddress.create({
      user_id: userId,
      addressLine1,
      addressLine2,
      city,
      state,
      district,
      postOffice,
      pincode,
    });

    await UserModel.findByIdAndUpdate(userId, { address: newAddress._id });

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: newAddress
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
  },

  getAddresses: async (req, res) => {
  try {
    const userId = req.currentUser._id; // token se nikala user id

    const addresses = await UserAddress.find({ user_id: userId });

    return res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
  },

  createKyc: async (req, res) => {
    try {
      const userId = req.currentUser._id; // requireAuth se aayega

      // Check if user already submitted KYC
      const existingKyc = await UserKyc.findOne({ user_id: userId });
      if (existingKyc) {
        return res.status(400).json({
          success: false,
          message: "KYC already submitted. You cannot resubmit.",
        });
      }

      // Check files
      if (!req.files || !req.files.documentFront || !req.files.documentBack) {
        return res.status(400).json({
          success: false,
          message: "Both document front and back are required.",
        });
      }

      const { documentType, documentNumber } = req.body;
      if (!documentType || !documentNumber) {
        return res.status(400).json({
          success: false,
          message: "Document type and number are required.",
        });
      }

       // ✅ Uploaded file paths
    const documentFront = `/uploads/${req.files.documentFront[0].filename}`;
    const documentBack = `/uploads/${req.files.documentBack[0].filename}`;

      // Create KYC document
      const kyc = await UserKyc.create({
        user_id: userId,
        documentType,
        documentNumber,
        documentFront,
        documentBack,
      });

      await UserModel.findByIdAndUpdate(userId, { userKyc: kyc._id });

      return res.status(201).json({
        success: true,
        message: "KYC submitted successfully. Waiting for admin approval.",
        data: kyc,
      });
    } catch (error) {
      console.error("Create KYC error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit KYC",
        error: error.message,
      });
    }
  },

  createBankKyc: async (req, res) => {
  try {
    const userId = req.currentUser._id;

    // Check if already submitted
    const existingKyc = await BankKyc.findOne({ user_id: userId });
    if (existingKyc) {
      return res.status(400).json({
        success: false,
        message: "Bank KYC already submitted. You cannot resubmit.",
      });
    }

    const { panNumber, accountHolderName, accountNumber, ifscCode, bankName, branchName } = req.body;
    if (!panNumber || !accountHolderName || !accountNumber || !ifscCode || !bankName || !branchName) {
      return res.status(400).json({
        success: false,
        message: "All bank details are required.",
      });
    }

    // ✅ Check file uploads
    if (!req.files || !req.files.passbookPhoto || !req.files.pancardPhoto) {
      return res.status(400).json({
        success: false,
        message: "Both passbook photo and pancard photo are required.",
      });
    }

    // ✅ Get file paths
    const passbookPhoto = `/uploads/${req.files.passbookPhoto[0].filename}`;
    const pancardPhoto = `/uploads/${req.files.pancardPhoto[0].filename}`;

    // ✅ Create Bank KYC entry
    const bankKyc = await BankKyc.create({
      user_id: userId,
      panNumber,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      passbookPhoto,
      pancardPhoto,
      status: "pending",
    });

    await UserModel.findByIdAndUpdate(userId, { bankKyc: bankKyc._id });

    return res.status(201).json({
      success: true,
      message: "Bank KYC submitted successfully. Waiting for admin approval.",
      data: bankKyc,
    });
  } catch (error) {
    console.error("Create Bank KYC error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit Bank KYC",
      error: error.message,
    });
  }
},

comparePassword: async (req, res) => {
try {
  
const {userId, password} = req.body;

    if (!userId || !password)
      return errorResponse(res, "User ID and password are required", 400);

 const user = await UserModel.findOne({ userId:userId });
    if (!user)
      return errorResponse(res, "Invalid userID", 400);

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return errorResponse(res, "Invalid password", 400);

    return res.status(200).json({
      success: true,
      message: "success",
    })
} catch (error) {
 return res.status(500).json({ success: false, message: error.message });
}


},




  login: async (req, res) => {
    try {
      let { userId, password, usertoken } = req.body;

      if (!userId || (!password && !usertoken)) {
        return errorResponse(res, "User ID and password are required", 400);
      }

      userId = userId.toString().trim();

      const user = await UserModel.findOne({ userId: new RegExp(`^${escapeRegex(userId)}$`, "i") });
      if (!user) return errorResponse(res, "Invalid userId", 400);

      // If token is provided, verify it
      if (usertoken) {
        try {
          const decoded = jwt.verify(usertoken, JWT_SECRET);
          if (decoded._id !== user._id.toString()) {
            return errorResponse(res, "Token mismatch", 401);
          }
        } catch (err) {
          return errorResponse(res, "Invalid or expired token", 401);
        }
      } else {
        // If no token, check password
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
          return errorResponse(res, "Invalid password", 400);
        }
      }

      if (user.isBlocked) {
        return errorResponse(res, "Account has been blocked. Contact Admin", 403);
      }

      const token = jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
      });

      return successResponse(res, "Logged in successfully", {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        sponsor: user.sponsor,
        referralCode: user.referralCode,
        referrer: user.referrer,
        directreferaralCount: user.directreferaralCount,
        isActivated: user.isActivated,
        totalInvested: user.totalInvested,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        token,
      });
    } catch (error) {
      return errorResponse(res, error.message || "Login failed", 500);
    }
  },

  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword, confirmNewPassword } = req.body;

      // Check if user is authenticated
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ status: 'Unauthorized', message: 'User not authenticated' });
      }

      const userId = req.currentUser._id;

      if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ status: 'Bad Request', message: 'All fields are mandatory' });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ status: 'Bad Request', message: 'New passwords do not match' });
      }

      // Get user from database
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ status: 'Not Found', message: 'User not found' });
      }

      // Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ status: 'Bad Request', message: 'Old password is incorrect' });
      }

      //  update the new password
      // If you hash this password this will throw error
      user.password = newPassword;
      await user.save();

      res.status(200).json({ status: 'Success', message: 'Password updated successfully!' });
    } catch (error) {
 
      res.status(500).json({ status: 'Internal Server Error', message: 'Server Error' });
    }
  },

  sendForgetPasswordOtp: async (req, res) => {
    const { userId, email } = req.body;

    if (!email || !userId) return errorResponse(res, "Email is required", 400);

    const user = await UserModel.findOne({ email, userId });

    if (!user) return errorResponse(res, "User not found with this email & userId", 404);

    const newOTP = getRandomOTP(6);
    user.emailOTP = newOTP;

    await sendRegistrationOTP(email, newOTP);
    await user.save();

    return successResponse(res, "OTP sent to your email for password reset.");
  },

  resetPasswordUsingOTP: async (req, res) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return errorResponse(res, "All fields are required", 400);
    }

    if (newPassword !== confirmNewPassword) {
      return errorResponse(res, "Passwords do not match", 400);
    }

    const user = await UserModel.findOne({ email, emailOTP: otp });

    if (!user) {
      return errorResponse(res, "Invalid email or OTP", 404);
    }

    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // user.password = hashedPassword;
    // user.emailOTP = undefined; // clear OTP after use

    // await user.save();

    user.password = newPassword;
    user.emailOTP = undefined;  //clear otp after use
    await user.save();

    return successResponse(res, "Password reset successful");
  },

  getProfile: async (req, res) => {
    try {
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await UserModel.findById(req.currentUser._id).select("-password -__v");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        message: "Profile fetched successfully",
        data: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          phone: user.phone,

          role: user.role,
          sponsor: user.sponsor,
          referralCode: user.referralCode,
          referrer: user.referrer,
          directreferaralCount: user.directreferaralCount,
          isActivated: user.isActivated,
          roiIncome: user.roiIncome,
          totalProfitEarned: user.totalProfitEarned,
          totalDomesticIncome: user.totalDomesticIncome,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      });
    } catch (err) {
      console.error("Get Profile Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getuserProfile: async (req, res) => {
    try {
      const { userId } = req.params;


      const user = await UserModel.findOne({ userId }).select("name");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        user,
      });
    } catch (err) {
      console.error("Get Profile Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  userdashboarddetails: async (req, res) => {
    try {
      const { userId } = req.params;
    const user = await UserModel.findOne(
      { userId },
      "_id userId name email createdAt isActivated walletBalance totalIncome todayIncome leftChild rightChild isBlocked"
    )
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const activeDirects = await UserModel.countDocuments({
        referrer: user._id,
        isActivated: true,
      });

      // ----------- Direct 7 Days Bonus -----------
      /*
      if (false) {
        const sevenDaysLater = new Date(user.createdAt);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        const activeDirectsIn7Days = await UserModel.countDocuments({
          referrer: user._id,
          isActivated: true,
          createdAt: { $gte: user.createdAt, $lte: sevenDaysLater }
        });

if (activeDirectsIn7Days >= 10) {
  user.walletBalance += 699;
  user.totalIncome += 699;
      user_id: user._id,
      userId: userId,
      paymenttype: "Direct 7 Referral Bonus",
      amount: 699,
      carryslsp: 0,
      carrysrsp: 0,
      slsp: 0,
      srsp: 0
    });
} else {
    // ✅ Agar 7 din cross ho gaye par 10 direct nahi hue
    const today = new Date();
    if (today > sevenDaysLater) {
    }
  }

      }
      */

      const leftteam = await getLegteamCount(user.leftChild)
      const rightteam = await getLegteamCount(user.rightChild)
   


      user.leftteam = leftteam.total
      user.rightteam = rightteam.total
await user.save(); 
    const dashboardData = {
      id: user._id,
      username: user.name,
      totalIncome: user.totalIncome,
      activeDirects,
      userId: user.userId,
      active: user.isActivated,
      createdAt: user.createdAt, 
      email: user.email,
      phone: user.phone,
      walletBalance: user.walletBalance,
      todayIncome: user.todayIncome,
      isblocked: user.isBlocked
    };

       res.status(200).json({
        success: true,
        message: "User income details fetched successfully",
        data: dashboardData
      });
    } catch (error) {
      console.error("Get Income Details Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },


  getUserIncomeDetails: async (req, res) => {
    try {
      const userId = req.currentUser?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const user = await UserModel.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const incomeData = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,

        // ✅ Total incomes
        walletBalance: user.walletBalance,
        todayIncome: user.todayIncome,
        totalIncome: user.totalIncome,
        totalPurchaseAmount: user.totalPurchaseAmount || 0,
        binaryLeftCarryAmount: user.binaryLeftCarryAmount || 0,
        binaryRightCarryAmount: user.binaryRightCarryAmount || 0,

        // ✅ Histories

        // ✅ Flags


        createdAt: user.createdAt
      };

      return res.status(200).json({
        success: true,
        message: "User income details fetched successfully",
        data: incomeData
      });
    } catch (error) {
      console.error("Get Income Details Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      const { name, email, phone, accountNumber, ifscCode, bankName, upiId } = req.body;
      // Prepare withdrawal details
      const withdrawalDetails = {};
      if (accountNumber) withdrawalDetails.accountNumber = accountNumber;
      if (ifscCode) withdrawalDetails.ifscCode = ifscCode;
      if (bankName) withdrawalDetails.bankName = bankName;
      if (upiId) withdrawalDetails.upiId = upiId;
      if (req.files?.passbookPhoto?.[0]?.path) {
        withdrawalDetails.passbookPhoto = req.files.passbookPhoto[0].path;
      }
      if (req.files?.pancardPhoto?.[0]?.path) {
        withdrawalDetails.pancardPhoto = req.files.pancardPhoto[0].path;
      }
      // Prepare update object
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (Object.keys(withdrawalDetails).length > 0) {
        updateData.withdrawalDetails = withdrawalDetails;
      }
      // Update user
      const updatedUser = await UserModel.findByIdAndUpdate(
        req.currentUser._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          withdrawalDetails: updatedUser.withdrawalDetails
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getReferrerDetails: async (req, res) => {
    try {
      const { referralCode } = req.query;
      if (!referralCode) {
        return errorResponse(res, "Referral code is required", 400);
      }

      const user = await UserModel.findOne({ referralCode }).select("name");
      if (!user) {
        return errorResponse(res, "Invalid referral code", 404);
      }

      return successResponse(res, "Name fetched successfully", { name: user.name });
    } catch (err) {
      console.error("Error fetching referrer details:", err);
      return errorResponse(res, "Internal server error", 500, err.message);
    }
  },

uploadProfilePhoto: async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return errorResponse(res, "No file uploaded", 400);
    }

    const user = await UserModel.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    // Save file path to user (include uploads folder)
    user.profilePhoto = req.file.filename;
    await user.save();

    // Return full path (or URL if you want)
    const profilePhotoUrl = `/uploads/${req.file.filename}`;

    return successResponse(res, "Profile photo uploaded successfully", { profilePhoto: profilePhotoUrl });
  } catch (err) {
    console.error("Error uploading profile photo:", err);
    return errorResponse(res, "Internal server error", 500, err.message);
  }
},

getProfilePhoto: async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);

    if (!user || !user.profilePhoto) {
      return errorResponse(res, "Profile photo not found", 404);
    }

    const profilePhotoUrl = `/uploads/${user.profilePhoto}`;
    return successResponse(res, "Profile photo fetched successfully", { profilePhoto: profilePhotoUrl });
  } catch (err) {
    console.error("Error fetching profile photo:", err);
    return errorResponse(res, "Internal server error", 500, err.message);
  }
}

};

export { authController }
