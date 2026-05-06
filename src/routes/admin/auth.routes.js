import { Router } from "express";
import { authController } from "../../controllers/admin/auth.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

router.post("/change-password", requireAuth(["admin"]), authController.changePassword);

export { router as adminAuthRouter }
