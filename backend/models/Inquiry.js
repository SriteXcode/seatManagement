// models/Inquiry.js
import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  type: { type: String, required: true }, // "Bug Report", "Feature Request", "Contact Query"
  message: { type: String, required: true },
  isResolved: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Inquiry", inquirySchema);
