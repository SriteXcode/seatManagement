// models/InvigAssignment.js
import mongoose from "mongoose";

const InvigilatorAssignmentSchema = new mongoose.Schema({
  shift: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: String,
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  invigilator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invigilator',
    required: true,
  },
  role: {
    type: String,
    enum: ['room', 'distributor'],
    default: 'room'
  },
  orgCode: { type: String, required: true }
});

export default mongoose.model('InvigAssignment', InvigilatorAssignmentSchema);
