import Invigilator from "../models/Invigilator.js";
import InvigAssignment from "../models/InvigAssignment.js";
import Allotment from "../models/Allotment.js";
import User from "../models/User.js";

export const addInvigilator = async (req, res) => {
  try {
    const { name, empId, dept, phone, email } = req.body;
    if (!name || !empId) return res.status(400).json({ error: "name+empId required" });
    const existing = await Invigilator.findOne({ empId, orgCode: req.user.adminCode });
    if (existing) return res.status(400).json({ error: "empId already exists" });
    const inv = new Invigilator({ name, empId, dept, phone, email, orgCode: req.user.adminCode });
    await inv.save();
    res.json(inv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getInvigilators = async (req, res) => {
  const list = await Invigilator.find({ orgCode: req.user.adminCode }).lean();
  res.json(list);
};

export const assignInvigilators = async (req, res) => {
  try {
    const { shift, date, time, assignments, distributors } = req.body;
    if (!shift || !date) return res.status(400).json({ error: 'Shift and Date are required.' });

    const shiftNum = Number(shift);

    const occupiedRoomIds = await Allotment.find({ shift: shiftNum, date, orgCode: req.user.adminCode }).distinct('room');
    const occupiedSet = new Set(occupiedRoomIds.map(id => String(id)));

    await InvigAssignment.deleteMany({ shift: shiftNum, date, orgCode: req.user.adminCode });

    const newAssignments = [];
    if (assignments && Array.isArray(assignments)) {
      for (const assignment of assignments) {
        if (!occupiedSet.has(String(assignment.room))) continue;
        for (const invigilatorId of assignment.invigilators) {
          newAssignments.push({ shift: shiftNum, date, time, room: assignment.room, invigilator: invigilatorId, role: 'room', orgCode: req.user.adminCode });
        }
      }
    }

    if (distributors && Array.isArray(distributors)) {
      for (const distId of distributors) {
        newAssignments.push({ shift: shiftNum, date, time, room: null, invigilator: distId, role: 'distributor', orgCode: req.user.adminCode });
      }
    }

    if (newAssignments.length > 0) await InvigAssignment.insertMany(newAssignments);
    res.json({ ok: true, assigned: newAssignments.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { shift, date } = req.query;
    const q = { orgCode: req.user.adminCode };
    if (shift) q.shift = Number(shift);
    if (date) q.date = date;
    const assignments = await InvigAssignment.find(q).populate('invigilator').populate('room');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPendingStaff = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const pendingStaff = await User.find({ role: "staff", staffCode: currentUser.adminCode, isApproved: false }).select("-passwordHash");
    res.json(pendingStaff);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const approveStaff = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const staffMember = await User.findOne({ _id: req.params.id, role: "staff", staffCode: currentUser.adminCode });
    if (!staffMember) return res.status(404).json({ error: "Staff member not found." });
    staffMember.isApproved = true;
    await staffMember.save();
    res.json({ ok: true, message: "Staff member approved." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateInvigilator = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, empId, dept, phone, email } = req.body;
    if (!name || !empId) return res.status(400).json({ error: "name+empId required" });

    const existing = await Invigilator.findOne({ 
      empId, 
      orgCode: req.user.adminCode, 
      _id: { $ne: id } 
    });
    if (existing) return res.status(400).json({ error: "Employee ID already exists" });

    const inv = await Invigilator.findOneAndUpdate(
      { _id: id, orgCode: req.user.adminCode },
      { name, empId, dept, phone, email },
      { returnDocument: "after" }
    );
    if (!inv) return res.status(404).json({ error: "Invigilator not found" });

    res.json(inv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteInvigilator = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Invigilator.findOneAndDelete({ _id: id, orgCode: req.user.adminCode });
    if (!deleted) return res.status(404).json({ error: "Invigilator not found" });

    await InvigAssignment.deleteMany({ invigilator: id, orgCode: req.user.adminCode });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
