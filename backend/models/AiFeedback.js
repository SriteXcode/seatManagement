import mongoose from "mongoose";

const aiFeedbackSchema = new mongoose.Schema({
  orgCode: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["rating", "rule", "manual_adjustment", "constraint"], 
    default: "rating"
  },
  ruleKey: { type: String, default: "general_preference" }, // e.g. room_priority, pattern_preference, subject_separation, density_preference
  ruleValue: { type: mongoose.Schema.Types.Mixed, default: {} },
  description: { type: String, required: true }, // Natural language summary of rule or feedback
  rating: { type: Number, min: 1, max: 5 }, // Optional 1-5 rating
  comment: String,
  appliedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("AiFeedback", aiFeedbackSchema);
