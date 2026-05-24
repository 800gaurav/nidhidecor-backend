import { Router } from "express";
import { createOrder, getOrders, updateOrderStatus } from "../../controllers/order.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

const router = Router();

router.post("/create", requireAuth(["user"]), createOrder);
router.get("/get-all", requireAuth(["user", "admin"]), getOrders);
router.put("/update-order/:id", requireAuth(["user", "admin"]), updateOrderStatus);

export { router as userOrderRouter };
