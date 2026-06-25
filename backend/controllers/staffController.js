import { parse } from "csv-parse/sync";
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

export const importCSV = async (req, res) => {
  try {
    const csvText = req.body.csv;
    if (!csvText) return res.status(400).json({ error: "csv required" });
    const records = parse(csvText, { trim: true, skip_empty_lines: true });
    if (records.length === 0) return res.status(400).json({ error: "no rows" });

    if (req.body.cleanImport === true || req.body.cleanImport === "true") {
      await Invigilator.deleteMany({ orgCode: req.user.adminCode });
      await InvigAssignment.deleteMany({ orgCode: req.user.adminCode });
    }

    const originalHeaders = records[0];
    const cleanHeaders = originalHeaders.map(h => (h || "").toString().trim().toLowerCase());
    
    const hasHeader = cleanHeaders.includes("employee id") || 
                      cleanHeaders.includes("empid") || 
                      cleanHeaders.includes("emp id") || 
                      cleanHeaders.includes("name") || 
                      cleanHeaders.includes("full name");

    if (hasHeader) records.shift();

    let nameIdx = 0;
    let empIdIdx = 1;
    let deptIdx = 2;
    let phoneIdx = 3;
    let emailIdx = 4;

    if (hasHeader) {
      nameIdx = cleanHeaders.findIndex(h => ["name", "full name", "invigilator name", "staff name"].includes(h));
      empIdIdx = cleanHeaders.findIndex(h => ["employee id", "empid", "emp id", "id"].includes(h));
      deptIdx = cleanHeaders.findIndex(h => ["department", "dept"].includes(h));
      phoneIdx = cleanHeaders.findIndex(h => ["phone", "phone number", "mobile", "contact"].includes(h));
      emailIdx = cleanHeaders.findIndex(h => ["email", "email address"].includes(h));
    }

    if (hasHeader) {
      if (nameIdx === -1) nameIdx = 0;
      if (empIdIdx === -1) empIdIdx = 1;
      if (deptIdx === -1) deptIdx = 2;
      if (phoneIdx === -1) phoneIdx = 3;
      if (emailIdx === -1) emailIdx = 4;
    }

    const ops = records.map(row => {
      const name = (row[nameIdx] || "").toString().trim();
      const empId = (row[empIdIdx] || "").toString().trim();
      if (!name || !empId) return null;

      const dept = deptIdx !== -1 && row[deptIdx] ? row[deptIdx].toString().trim() : "";
      const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].toString().trim() : "";
      const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : "";

      return {
        updateOne: {
          filter: { empId, orgCode: req.user.adminCode },
          update: {
            $set: {
              name,
              empId,
              dept,
              phone,
              email,
              orgCode: req.user.adminCode
            }
          },
          upsert: true
        }
      };
    }).filter(Boolean);

    if (ops.length === 0) return res.status(400).json({ error: "no valid rows" });
    const resu = await Invigilator.bulkWrite(ops);

    res.json({
      ok: true,
      upserted: resu.upsertedCount || resu.nUpserted || 0,
      matched: resu.matchedCount || resu.nMatched || 0,
      modified: resu.modifiedCount || resu.nModified || 0,
      inserted: resu.insertedCount || resu.nInserted || 0,
      total: ops.length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
