import { Router } from "express";
import {
  createPurchaseBill,
  getPurchaseBills,
  runBinarySettlement,
} from "../../controllers/admin/purchaseBill.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

const router = Router();

router.post("/add", requireAuth(["admin"]), createPurchaseBill);
router.get("/", requireAuth(["admin"]), getPurchaseBills);
router.post("/settle-binary", requireAuth(["admin"]), runBinarySettlement);

export { router as purchaseBillRouter };
