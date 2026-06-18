import mongoose from "mongoose";

const librarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  shift: { type: Number, required: true },
  time: String,
  examType: String,
  subject: String,
  combinations: [{
    dept: String,
    sem: String,
    subject: String
  }],
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Library", librarySchema);
