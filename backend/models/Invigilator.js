// models/Invigilator.js
import mongoose from "mongoose";

const invigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  empId: { type: String, required: true },
  dept: String,
  phone: String,
  email: String,
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Invigilator", invigSchema);
