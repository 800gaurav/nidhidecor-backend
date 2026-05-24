import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProduct,
  importProductsFromCsv,
  updateProduct,
} from "../../controllers/product.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";
import upload from "../../utils/multer.js";

const router = Router();

router.get("/get-all", getAllProducts);
router.get("/get/:id", getProduct);
router.post("/import-csv", requireAuth(["admin"]), importProductsFromCsv);
router.post("/create", requireAuth(["admin"]), upload.single("image"), createProduct);
router.put("/update/:id", requireAuth(["admin"]), upload.single("image"), updateProduct);
router.delete("/delete/:id", requireAuth(["admin"]), deleteProduct);

export { router as adminProductRouter };
