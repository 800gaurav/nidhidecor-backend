import { Router } from "express";
import { addToCart, getCart, removeFromCart } from "../../controllers/cart.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

const router = Router();

router.get("/", requireAuth(["user"]), getCart);
router.post("/add", requireAuth(["user"]), addToCart);
router.delete("/remove/:productId", requireAuth(["user"]), removeFromCart);

export { router as userCartRouter };
