import jwt from "jsonwebtoken";
import { UserModel } from "../../models/user.model.js";
import { JWT_SECRET } from "../../config/index.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";

const authController = {
register: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return errorResponse(res, "All fields are required", 400);

    const isExists = await UserModel.findOne({ email });
    if (isExists) return errorResponse(res, "Email already in use.", 400);

    await UserModel.create({ email, password, role: "admin" });   
    successResponse(res, "Admin registered successfully");
},

login: async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return errorResponse(res, "All fields are required", 400);

    const admin = await UserModel.findOne({ email, role: "admin" });
    if (!admin)
      return errorResponse(res, "Invalid email or password", 400);

    const isPasswordCorrect = await admin.comparePassword(password);
    if (!isPasswordCorrect)
      return errorResponse(res, "Invalid email or password", 400);

    // Generate JWT token with role
    const token = jwt.sign(
      { _id: admin._id, role: admin.role, email: admin.email },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    console.log("✅ Admin token generated for:", email);

    successResponse(res, "Login successful", {
      user: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      },
      token
    });
  } catch (error) {
    console.error("Admin login error:", error);
    errorResponse(res, "Something went wrong", 500);
  }
},

changePassword: async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validate fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      return errorResponse(res, "All fields are required", 400);
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return errorResponse(res, "New password and confirm password do not match", 400);
    }

    // Get current admin from token (assuming req.user is set by auth middleware)
    const adminId = req.currentUser?._id; 
    const admin = await UserModel.findById(adminId).select("+password");

    if (!admin || admin.role !== "admin") {
      return errorResponse(res, "Admin not found", 404);
    }

    // Verify old password
    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return errorResponse(res, "Old password is incorrect", 400);
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    return successResponse(res, "Password changed successfully");

  } catch (error) {
    console.error(error);
    return errorResponse(res, "Internal Server Error", 500);
  }
}

}

export { authController }