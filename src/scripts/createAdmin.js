import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "../models/user.model.js";

dotenv.config();

const email = "admin@dhantag.com";
const password = "Admin@1234";

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected");

  const existing = await UserModel.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  await UserModel.create({ email, password, role: "admin", name: "Admin" });
  console.log("✅ Admin created successfully");
  console.log("   Email   :", email);
  console.log("   Password:", password);

  process.exit(0);
})();
