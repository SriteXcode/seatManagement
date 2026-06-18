// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "admin" }, // "admin" or "staff"
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  orgName: { type: String }, // Organization name for Admin
  adminCode: { type: String }, // 6-digit unique code generated for Admin
  staffCode: { type: String }, // 6-digit code staff signed up with
  isApproved: { type: Boolean, default: false } // true for admins, false for staff until approved
}, { timestamps: true });

export default mongoose.model("User", userSchema);
