import { connect, disconnect } from "mongoose";
import path from "path";
import { MONGO_URI } from "../config/index.js";
import { importProductsFromCsvFile } from "../controllers/product.controller.js";

(async () => {
  try {
    await connect(MONGO_URI);
    const csvPath = path.join(process.cwd(), "uploads", "products_export_1.csv");
    const result = await importProductsFromCsvFile(csvPath);
    console.log("Products import completed:", result);
  } catch (error) {
    console.error("Products import failed:", error);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
})();
