// models/Room.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., A1
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
  location: String,
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Room", roomSchema);
