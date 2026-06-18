import mongoose from "mongoose";

const fieldConfigSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["identifier", "name", "constraint_1", "constraint_2", "subject", "custom"],
    required: true,
  },
  required: { type: Boolean, default: false },
  sampleValue: { type: String }
});

const examConfigSchema = new mongoose.Schema({
  examType: { type: String, required: true },
  fields: [fieldConfigSchema],
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("ExamConfig", examConfigSchema);
