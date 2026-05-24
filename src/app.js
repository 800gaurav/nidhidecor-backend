import cors from "cors";
import morgan from "morgan";
import express from "express";
import './helper/dailyjob.js'

import { errorResponse } from "./utils/api-response.js";
import { currentUser } from "./middlewares/current-user.js";
import { errorHandler } from "./middlewares/error-handler.js";

// USER ROUTES IMPORT
import { userAuthRouter } from "./routes/user/auth.routes.js";
import { incomeRouter } from "./routes/user/income.routes.js";
import { userprofileRouter } from "./routes/user/profile.route.js";
import { userWithdrawRoutes } from "./routes/user/withdaw.routes.js";
import { userCartRouter } from "./routes/user/cart.routes.js";
import { userOrderRouter } from "./routes/user/order.routes.js";

// ADMIN ROUTES IMPORT
import { adminAuthRouter } from "./routes/admin/auth.routes.js";
import { adminUserRouter } from "./routes/admin/user.routes.js";
import { purchaseBillRouter } from "./routes/admin/purchaseBill.routes.js";
import { adminIncomeReportRouter } from "./routes/admin/incomeReport.routes.js";
import { adminProductRouter } from "./routes/admin/product.routes.js";

import path from 'path';

const app = express();

app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Set authorization token if the bearer token is provided
app.use(currentUser);

app.get("/", (req, res) => res.send("Dhantag MLM Backend is running..."))

// USER ROUTES
app.use("/api/v1/user/auth", userAuthRouter);
app.use("/api/v1/user/income", incomeRouter);
app.use("/api/v1/user/profile", userprofileRouter);
app.use("/api/v1/user/withdraw", userWithdrawRoutes);
app.use("/api/v1/user/cart", userCartRouter);
app.use("/api/v1/user/order", userOrderRouter);

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ADMIN ROUTES
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/admin/user", adminUserRouter);
app.use("/api/v1/admin/purchase-bills", purchaseBillRouter);
app.use("/api/v1/admin/income-report", adminIncomeReportRouter);
app.use("/api/v1/admin/product", adminProductRouter);

app.all("/*splat", (req, res) => {
  errorResponse(res, "Route not found", 404);
});

app.use(errorHandler);

export { app };
