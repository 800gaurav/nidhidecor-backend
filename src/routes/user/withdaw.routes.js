import express from "express";
import { approveWithdraw, createWithdrawRequest, getWithdrawRequests, rejectWithdraw } from "../../controllers/user/withdraw.controller.js";
import upload from './../../utils/multer.js';
import { requireAuth } from "../../middlewares/require-auth.js";

const router = express.Router();


//Withdraw req by user and approve by admin
router.post("/withdraw/request", requireAuth(["user"]), upload.fields([
    { name: "passbookPhoto", maxCount: 1 },
    { name: "pancardPhoto", maxCount: 1 },
  ]), createWithdrawRequest);
router.post("/withdraw/:id/approve", requireAuth(['admin']), approveWithdraw);
router.post("/withdraw/:id/reject", requireAuth(['admin']), rejectWithdraw);
router.get("/withdraw/request/history", requireAuth(["user", "admin"]), getWithdrawRequests);


export { router as userWithdrawRoutes };