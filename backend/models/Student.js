// models/Student.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  roll: { type: String, required: true },
  name: { type: String },
  dept: { type: String },
  sem: { type: String, required: true },
  shift: { type: Number },
  examType: { type: String, default: "College" },
  subject: [String],
  metadata: { type: Map, of: String },
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Student", studentSchema);
