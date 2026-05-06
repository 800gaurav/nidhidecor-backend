import { Router } from "express";

import { authController } from "../../controllers/user/auth.controller.js";
import { currentUser } from "../../middlewares/current-user.js";
import { requireAuth } from "../../middlewares/require-auth.js";
import { getReferralTree } from "../../helper/binaryPlacement.js";
import upload from "../../utils/multer.js";

const router = Router();

router.post("/send-email-otp", authController.sendEmailOTP);
router.post("/send-phone-otp", authController.sendPhoneOTP);
router.post("/register",  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 }
  ]), authController.register);

router.post("/check-password", authController.comparePassword)
router.post("/login", authController.login);
router.post('/change-password', currentUser, authController.changePassword);
router.put("/update-profile",upload.fields([
    { name: "passbookPhoto", maxCount: 1 },
    { name: "pancardPhoto", maxCount: 1 },
  ]),
  authController.updateUserProfile
);
router.get("/get-refrrer-name", authController.getReferrerDetails);

router.post('/forgot-password/send-otp', currentUser, authController.sendForgetPasswordOtp);
router.post('/forgot-password/reset', currentUser, authController.resetPasswordUsingOTP);

router.get("/get-profile", currentUser, authController.getProfile);
router.get("/get-user-profile/:userId", authController.getuserProfile);

router.get("/user-dashboard/:userId",requireAuth(["user", "admin"]), authController.userdashboarddetails)

router.post("/uploadProfilePhoto/:userId", requireAuth(["user"]), upload.single("profilePhoto"), authController.uploadProfilePhoto)

router.get("/getProfilePhoto/:userId", authController.getProfilePhoto)

router.get("/referrals/tree", requireAuth(["user"]), getReferralTree);

router.get("/all-income", currentUser, authController.getUserIncomeDetails)

router.put("/update-address", currentUser, authController.updateAddress)
router.get("/my-address", currentUser, authController.getAddresses)
router.post(
"/update-kyc",
  currentUser,
  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
  ]),
  authController.createKyc
);

router.post("/bank-kyc", currentUser, upload.fields([
    { name: "passbookPhoto", maxCount: 1 },
    { name: "pancardPhoto", maxCount: 1 },
  ]), authController.createBankKyc);

export { router as userAuthRouter };
