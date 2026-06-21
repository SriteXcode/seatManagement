// models/Allotment.js
import mongoose from "mongoose";

const allotSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  row: Number,
  col: Number,
  seatCode: String, // A1, B3 etc
  shift: Number, // 1 or 2
  date: String, // YYYY-MM-DD
  time: String, // HH:mm
  subject: String, // Subject name
  seatLabel: String, // Roomno.-A1-StudentRollno(233143)
  useDistancing: { type: Boolean, default: false },
  rowGrouping: { type: Number, default: 0 },
  colGrouping: { type: Number, default: 0 },
  gapType: { type: String, default: "" },
  gapAction: { type: String, default: "" },
  orgCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Allotment", allotSchema);
