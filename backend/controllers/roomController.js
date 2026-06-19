import Room from "../models/Room.js";
import Allotment from "../models/Allotment.js";

export const getAll = async (req, res) => {
  try {
    const rooms = await Room.find({ orgCode: req.user.adminCode }).sort({ name: 1 });
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const allotments = await Allotment.find({ orgCode: req.user.adminCode }).populate("student").lean();
    const roomsMap = {};
    for (const a of allotments) {
      if (!a.room) continue;
      const roomId = String(a.room._id || a.room);
      if (!roomsMap[roomId]) roomsMap[roomId] = [];
      
      let group = roomsMap[roomId].find(g => g.date === a.date && g.shift === a.shift);
      if (!group) {
        group = { date: a.date, shift: a.shift, studentCount: 0, subjects: new Set(), examTypes: new Set() };
        roomsMap[roomId].push(group);
      }
      group.studentCount++;
      if (a.subject) group.subjects.add(a.subject);
      if (a.student && a.student.examType) group.examTypes.add(a.student.examType);
    }
    
    const result = {};
    for (const [roomId, groups] of Object.entries(roomsMap)) {
      result[roomId] = groups.map(g => ({
        date: g.date, shift: g.shift, studentCount: g.studentCount,
        subjects: Array.from(g.subjects), examType: Array.from(g.examTypes).join(", ") || "College"
      }));
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const addRoom = async (req, res) => {
  try {
    const { name, rows, cols } = req.body;
    if (!name || !rows || !cols) return res.status(400).json({ error: "name, rows, cols required" });
    const room = new Room({ name, rows, cols, orgCode: req.user.adminCode });
    await room.save();
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rows, cols } = req.body;
    const room = await Room.findOneAndUpdate(
      { _id: id, orgCode: req.user.adminCode },
      { name, rows, cols },
      { new: true }
    );
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    await Room.deleteOne({ _id: id, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
