import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth.js";
import { userController } from "../../controllers/admin/user.controller.js";

const router = Router();

// User Management
router.get("/", requireAuth(["admin"]), userController.getUsers);
router.get("/login-as-user/:userId", requireAuth(["admin"]), userController.loginAsUser);
router.get("/dashboardDetails", requireAuth(["admin"]), userController.getdashboarddetails);
router.get("/suspended-users", requireAuth(["admin"]), userController.getSuspendedUser);
router.patch("/unblockuser/:userId", requireAuth(["admin"]), userController.unblockUser);
router.get("/pendinguser", requireAuth(["admin"]), userController.getPendingUsers);
router.get("/activeusers", requireAuth(["admin"]), userController.getallactiveusers);
router.get("/get-left-right-user/:userId", requireAuth(["admin"]), userController.getLeftRightUserTree);
router.get("/admin-referals", requireAuth(["admin"]), userController.getAdminDirectReferrals);
router.post("/update-a-user/:userId", requireAuth(["admin"]), userController.adminUpdateUser);

// KYC Management
router.put("/userKyc/:kycId", requireAuth(["admin"]), userController.UserKyc);
router.put("/user-bankKyc/:kycId", requireAuth(["admin"]), userController.bankKyc);
router.get("/getuser-userkKyc", requireAuth(["admin", "user"]), userController.getuserkyc);
router.get("/getuser-bankKyc", requireAuth(["admin", "user"]), userController.getBankkyc);

export { router as adminUserRouter };
