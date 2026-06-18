import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  shift: { type: Number, required: true },
  text: { type: String, required: true },
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Comment", commentSchema);
