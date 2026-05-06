import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth.js";
import {
  getAllIncomeReport,
  getIncomeSummaryByDate,
  getUserWiseIncomeReport
} from "../../controllers/admin/incomeReport.controller.js";

const router = Router();

// Get all income records
router.get("/all", requireAuth(["admin"]), getAllIncomeReport);

// Get income summary by date
router.get("/summary", requireAuth(["admin"]), getIncomeSummaryByDate);

// Get user-wise income report
router.get("/user-wise", requireAuth(["admin"]), getUserWiseIncomeReport);

export { router as adminIncomeReportRouter };
