// models/FormConfig.js
import mongoose from "mongoose";

const formFieldConfigSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  placeholder: { type: String, default: "" }, // Sample value
  formatHelp: { type: String, default: "" } // Helper text / instructions
});

const formConfigSchema = new mongoose.Schema({
  orgCode: { type: String, required: true },
  examType: { type: String, required: true },
  title: { type: String, default: "Student Registration Form" },
  description: { type: String, default: "Please enter your details carefully to register." },
  isActive: { type: Boolean, default: false },
  dueDate: { type: Date },
  fields: [formFieldConfigSchema]
}, { timestamps: true });

// Ensure unique configuration per organization and exam type
// formConfigSchema.index({ orgCode: 1, examType: 1 }, { unique: true });

const model = mongoose.model("FormConfig", formConfigSchema);

// Programmatically drop index to transition existing databases without data loss
model.collection.dropIndex("orgCode_1_examType_1").catch(() => {});

export default model;
