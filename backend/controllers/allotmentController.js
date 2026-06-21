import Allotment from "../models/Allotment.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import InvigAssignment from "../models/InvigAssignment.js";
import { generateAllotments as generateAlgo } from "../services/seatGenerator.js";

const cleanupExpiredStudents = async (orgCode) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    
    const allAllottedStudentIds = await Allotment.find({ orgCode }).distinct("student");
    if (allAllottedStudentIds.length === 0) return;

    const activeStudentIds = await Allotment.find({
      orgCode,
      date: { $gte: todayStr }
    }).distinct("student");
    const activeSet = new Set(activeStudentIds.map(id => String(id)));

    const toDeleteIds = allAllottedStudentIds.filter(id => !activeSet.has(String(id)));

    if (toDeleteIds.length > 0) {
      await Student.deleteMany({ _id: { $in: toDeleteIds }, orgCode });
      await Allotment.deleteMany({ student: { $in: toDeleteIds }, orgCode });
    }
  } catch (error) {
    console.error("Error cleaning up expired students:", error);
  }
};

const cleanupDeletedStudents = async (studentIds, orgCode) => {
  try {
    if (!studentIds || studentIds.length === 0) return;

    const remainingStudentIds = await Allotment.find({
      student: { $in: studentIds },
      orgCode
    }).distinct("student");
    const remainingSet = new Set(remainingStudentIds.map(id => String(id)));

    const toDeleteIds = studentIds.filter(id => !remainingSet.has(String(id)));

    if (toDeleteIds.length > 0) {
      await Student.deleteMany({ _id: { $in: toDeleteIds }, orgCode });
    }
  } catch (error) {
    console.error("Error cleaning up deleted students:", error);
  }
};

export const generate = async (req, res) => {
  try {
    const shift = Number(req.body.shift) || 1;
    const seed = Number(req.body.seed || 1);
    const { date, time, examType, useDistancing, rowGrouping, colGrouping, excludeStudentIds, gapType, gapAction } = req.body;
    const deptSemCombinations = req.body.deptSemCombinations || req.body.combinations;

    if (!date) return res.status(400).json({ error: "Date is required" });

    const existing = await Allotment.find({ shift, date, orgCode: req.user.adminCode }).populate("student").lean();

    let existingExamType = null;
    for (const a of existing) {
      if (a.student && a.student.examType) {
        existingExamType = a.student.examType;
        break;
      }
    }

    if (existingExamType && examType && existingExamType !== examType) {
      return res.status(400).json({
        error: `Cannot regenerate this arrangement with a different exam type. The initially generated arrangement uses '${existingExamType}', but you requested '${examType}'. Please clear the current allotments first or select the same exam type.`
      });
    }

    const activeExamType = existingExamType || examType || "College";

    if ((activeExamType === "College" || activeExamType === "School") && deptSemCombinations?.some(combo => !combo.subject || !combo.subject.trim())) {
      return res.status(400).json({ error: "Subject is required for all combinations in College and School exams" });
    }
    if (!deptSemCombinations || deptSemCombinations.length === 0) return res.status(400).json({ error: "At least one Department-Semester combination is required" });

    const classSet = new Set();
    for (const combo of deptSemCombinations) {
      const classKey = `${combo.dept}-${combo.sem}`;
      if (classSet.has(classKey)) return res.status(400).json({ error: `Cannot schedule multiple subjects for the same class (${combo.dept} Sem ${combo.sem}) at the same time.` });
      classSet.add(classKey);
    }

    const rooms = await Room.find({ orgCode: req.user.adminCode }).lean();
    
    const query = { 
      examType: activeExamType,
      orgCode: req.user.adminCode,
      $or: deptSemCombinations.map(combo => ({
        dept: combo.dept,
        sem: combo.sem,
        ...(combo.subject ? { $or: [{ subject: combo.subject }, { subject: [] }, { subject: "" }, { subject: null }, { subject: { $exists: false } }] } : {})
      })) 
    };
    
    let students = await Student.find(query).lean();
    if (Array.isArray(excludeStudentIds) && excludeStudentIds.length > 0) {
      const excludeSet = new Set(excludeStudentIds.map(String));
      students = students.filter(s => !excludeSet.has(String(s._id)));
    }

    const toDeleteIds = [];
    const blockers = [];
    for (const a of existing) {
      if (!a.student) continue;
      const isTarget = deptSemCombinations.some(combo => combo.dept === a.student.dept && Number(combo.sem) === Number(a.student.sem));
      if (isTarget) toDeleteIds.push(a._id);
      else blockers.push({ room: String(a.room._id || a.room), row: a.row, col: a.col, student: a.student });
    }

    if (toDeleteIds.length > 0) await Allotment.deleteMany({ _id: { $in: toDeleteIds }, orgCode: req.user.adminCode });

    const { allotments: generatedAllotments, notPlaced } = generateAlgo({ 
      students, rooms, shift, seed, occupied: blockers,
      useDistancing: Boolean(useDistancing && gapAction === 'remove-seats'),
      rowGrouping: Number(rowGrouping) || 0,
      colGrouping: Number(colGrouping) || 0
    });

    const docs = generatedAllotments.map(a => {
      const matchingCombo = deptSemCombinations.find(combo => combo.dept === a.student.dept && String(combo.sem) === String(a.student.sem));
      const allotmentSubject = (matchingCombo ? matchingCombo.subject : "") || (Array.isArray(a.student.subject) ? a.student.subject[0] : a.student.subject) || "";
      
      return {
        student: a.student._id, room: a.room._id, row: a.row, col: a.col, seatCode: a.seatCode, shift: a.shift,
        date, time, subject: allotmentSubject, seatLabel: `${a.room.name}.-${a.seatCode}-StudentRollno(${a.student.roll})`,
        useDistancing: Boolean(useDistancing), rowGrouping: Number(rowGrouping) || 0, colGrouping: Number(colGrouping) || 0,
        gapType: gapType || "", gapAction: gapAction || "", orgCode: req.user.adminCode
      };
    });

    if (Array.isArray(notPlaced) && notPlaced.length > 0) {
      for (const student of notPlaced) {
        const matchingCombo = deptSemCombinations.find(combo => combo.dept === student.dept && String(combo.sem) === String(student.sem));
        const allotmentSubject = (matchingCombo ? matchingCombo.subject : "") || (Array.isArray(student.subject) ? student.subject[0] : student.subject) || "";
        docs.push({
          student: student._id,
          room: null,
          row: null,
          col: null,
          seatCode: "",
          shift: Number(shift),
          date,
          time: time || "",
          subject: allotmentSubject,
          seatLabel: "Staging Bucket",
          useDistancing: Boolean(useDistancing),
          rowGrouping: Number(rowGrouping) || 0,
          colGrouping: Number(colGrouping) || 0,
          gapType: gapType || "",
          gapAction: gapAction || "",
          orgCode: req.user.adminCode
        });
      }
    }

    if (docs.length) await Allotment.insertMany(docs);
    res.json({ ok: true, count: docs.length, notPlaced });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const regenerate = async (req, res) => {
  try {
    const shift = Number(req.body.shift) || 1;
    const { date, seed, useDistancing, rowGrouping, colGrouping, gapType, gapAction } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required" });

    // Find all existing allotments for this date and shift to get their student combinations
    const existing = await Allotment.find({ shift, date, orgCode: req.user.adminCode }).populate("student").lean();
    if (existing.length === 0) return res.status(404).json({ error: "No allotments exist for this slot to regenerate." });

    // Extract unique examType and student combinations
    let examType = "College";
    const comboMap = {};
    for (const a of existing) {
      if (a.student) {
        if (a.student.examType) examType = a.student.examType;
        const key = `${a.student.dept}_${a.student.sem}`;
        comboMap[key] = {
          dept: a.student.dept,
          sem: a.student.sem,
          subject: a.subject || ""
        };
      }
    }
    const deptSemCombinations = Object.values(comboMap);

    // Override req.body params so that generate controller receives them
    req.body.examType = examType;
    req.body.deptSemCombinations = deptSemCombinations;
    return generate(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const saveManual = async (req, res) => {
  try {
    const { shift, date, allotments, useDistancing, rowGrouping, colGrouping, gapType, gapAction } = req.body;
    if (!date || !shift) return res.status(400).json({ error: "Date and Shift are required" });

    const oldStudentIds = await Allotment.find({ shift: Number(shift), date, orgCode: req.user.adminCode }).distinct("student");
    
    await Allotment.deleteMany({ shift: Number(shift), date, orgCode: req.user.adminCode });
    
    if (Array.isArray(allotments) && allotments.length > 0) {
      const docs = allotments.map(a => {
        const student = a.student ? (a.student._id || a.student) : null;
        const room = a.room ? (a.room._id || a.room) : null;
        const roomName = (a.room && a.room.name) || "Staging Bucket";
        const studentRoll = (a.student && a.student.roll) || "";
        
        return {
          student, room, row: a.row, col: a.col, seatCode: a.seatCode, shift: Number(shift), date,
          time: a.time || "", subject: a.subject || "", seatLabel: a.seatLabel || (room ? `${roomName}.-${a.seatCode}-StudentRollno(${studentRoll})` : "Staging Bucket"),
          useDistancing: useDistancing !== undefined ? Boolean(useDistancing) : Boolean(a.useDistancing),
          rowGrouping: rowGrouping !== undefined ? Number(rowGrouping) : Number(a.rowGrouping || 0),
          colGrouping: colGrouping !== undefined ? Number(colGrouping) : Number(a.colGrouping || 0),
          gapType: gapType !== undefined ? (gapType || "") : (a.gapType || ""),
          gapAction: gapAction !== undefined ? (gapAction || "") : (a.gapAction || ""),
          orgCode: req.user.adminCode
        };
      });
      await Allotment.insertMany(docs);
    }

    if (oldStudentIds.length > 0) {
      await cleanupDeletedStudents(oldStudentIds, req.user.adminCode);
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  await cleanupExpiredStudents(req.user.adminCode);
  const shift = Number(req.query.shift) || 1;
  const date = req.query.date;
  const roomId = req.query.roomId || null;
  const q = { shift, orgCode: req.user.adminCode };
  if (date) q.date = date;
  if (roomId) q.room = roomId;
  const data = await Allotment.find(q).populate("student").populate("room").lean();
  res.json(data);
};

import PDFDocument from "pdfkit";

export const exportCSV = async (req, res) => {
  const shift = Number(req.query.shift) || 1;
  const date = req.query.date;
  const q = { shift, orgCode: req.user.adminCode };
  if (date) q.date = date;
  const data = await Allotment.find(q).populate("student").populate("room").lean();
  const rows = [["roll","name","dept","sem","room","row","col","seatCode","shift","date","time","subject","seatLabel"]];
  for (const d of data) {
    rows.push([d.student.roll, d.student.name, d.student.dept, d.student.sem, d.room.name, d.row, d.col, d.seatCode, d.shift, d.date || "", d.time || "", d.subject || "", d.seatLabel]);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  res.setHeader("Content-disposition", `attachment; filename=allotment_shift${shift}.csv`);
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
};

export const exportPDF = async (req, res) => {
  try {
    const { roomId } = req.query;
    const shift = Number(req.query.shift) || 1;
    const date = req.query.date;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    const room = await Room.findOne({ _id: roomId, orgCode: req.user.adminCode }).lean();
    if (!room) return res.status(404).json({ error: "room not found" });

    const q = { room: roomId, shift, orgCode: req.user.adminCode };
    if (date) q.date = date;
    const data = await Allotment.find(q).populate("student").lean();

    const seatMap = {};
    data.forEach(a => { seatMap[`${a.row},${a.col}`] = a; });

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-disposition", `attachment; filename=seating_${room.name}_shift${shift}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(14).text(`Room: ${room.name}   Shift: ${shift === 1 ? "10:00-13:00" : "14:00-17:00"}`, { align: "center" });
    doc.moveDown(0.5);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const seatW = Math.min(60, Math.floor((pageWidth - (room.cols - 1)*8) / room.cols));
    const seatH = 40;
    const startX = doc.page.margins.left;
    let y = doc.y;

    for (let r = 1; r <= room.rows; r++) {
      let x = startX;
      for (let c = 1; c <= room.cols; c++) {
        doc.rect(x, y, seatW, seatH).stroke();
        const key = `${r},${c}`;
        const a = seatMap[key];
        if (a && a.student) {
          const label = `${a.student.roll}`;
          doc.fontSize(8).text(label, x + 4, y + 10, { width: seatW - 8 });
        } else {
          doc.fontSize(8).text("-", x + 4, y + 10);
        }
        x += seatW + 8;
      }
      y += seatH + 10;
      if (y + seatH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }
    doc.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const exportRoomGrid = async (req, res) => {
  const { roomId } = req.query;
  const shift = Number(req.query.shift) || 1;
  const date = req.query.date;
  if (!roomId) return res.status(400).json({ error: "roomId required" });
  const room = await Room.findOne({ _id: roomId, orgCode: req.user.adminCode }).lean();
  if (!room) return res.status(404).json({ error: "room not found" });
  
  const q = { room: roomId, shift, orgCode: req.user.adminCode };
  if (date) q.date = date;
  const data = await Allotment.find(q).populate("student").lean();

  if (req.query.format === "json") return res.json({ room, shift, seats: data });

  const rows = [["roll","name","dept","sem","room","row","col","seatCode","seatLabel"]];
  data.forEach(d => rows.push([d.student.roll, d.student.name, d.student.dept, d.student.sem, d.room.name, d.row, d.col, d.seatCode, d.seatLabel]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  res.setHeader("Content-disposition", `attachment; filename=room_${room.name}_shift${shift}.csv`);
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
};

export const getSchedules = async (req, res) => {
  try {
    await cleanupExpiredStudents(req.user.adminCode);
    const allotments = await Allotment.find({ orgCode: req.user.adminCode }).populate("student").lean();
    const groups = {};
    for (const a of allotments) {
      if (!a.date || !a.shift) continue;
      const key = `${a.date}_${a.shift}`;
      if (!groups[key]) {
        groups[key] = { date: a.date, shift: a.shift, times: new Set(), subjects: new Set(), examTypes: new Set(), depts: new Set(), sems: new Set(), sections: new Set(), combinations: [], combinationKeys: new Set() };
      }
      const g = groups[key];
      if (a.time) g.times.add(a.time);
      if (a.subject) g.subjects.add(a.subject);
      if (a.student) {
        const s = a.student;
        g.examTypes.add(s.examType || "College");
        if (s.dept) g.depts.add(s.dept);
        if (s.sem) g.sems.add(String(s.sem));
        const comboKey = `${s.dept || ""}_${s.sem || ""}_${a.subject || ""}`;
        if (!g.combinationKeys.has(comboKey)) {
          g.combinationKeys.add(comboKey);
          g.combinations.push({ dept: s.dept || "", sem: String(s.sem || ""), subject: a.subject || "" });
        }
        if (s.metadata) {
          for (const [k, v] of Object.entries(s.metadata)) {
            const kl = k.toLowerCase();
            if (["section", "sec", "stream", "class", "division", "div"].includes(kl) && v) g.sections.add(String(v));
          }
        }
      }
    }
    const result = Object.values(groups).map(g => ({
      date: g.date, shift: g.shift, time: Array.from(g.times).filter(Boolean).join(", "),
      subject: Array.from(g.subjects).filter(Boolean).join(", "),
      examType: Array.from(g.examTypes).filter(Boolean).join(", ") || "College",
      depts: Array.from(g.depts).filter(Boolean), sems: Array.from(g.sems).filter(Boolean),
      sections: Array.from(g.sections).filter(Boolean), subjects: Array.from(g.subjects).filter(Boolean), combinations: g.combinations
    }));
    result.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.shift - b.shift);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const shift = Number(req.query.shift) || 1;
    const date = req.query.date;
    if (!date || !shift) return res.status(400).json({ error: "Date and Shift are required" });

    const studentIds = await Allotment.find({ shift, date, orgCode: req.user.adminCode }).distinct("student");

    await Allotment.deleteMany({ shift, date, orgCode: req.user.adminCode });
    await InvigAssignment.deleteMany({ shift, date, orgCode: req.user.adminCode });

    if (studentIds.length > 0) {
      await cleanupDeletedStudents(studentIds, req.user.adminCode);
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const currentShift = Number(req.body.currentShift);
    const currentDate = req.body.currentDate;
    const { date, shift, time, subject, combinations } = req.body;

    if (!currentDate || !currentShift) {
      return res.status(400).json({ error: "Current Date and Shift are required" });
    }
    if (!date || !shift) {
      return res.status(400).json({ error: "New Date and Shift are required" });
    }

    if (String(currentDate) !== String(date) || Number(currentShift) !== Number(shift)) {
      const existing = await Allotment.findOne({
        shift: Number(shift),
        date,
        orgCode: req.user.adminCode
      });
      if (existing) {
        return res.status(400).json({ error: "A schedule already exists for the new Date and Shift." });
      }
    }

    const allotmentUpdate = { date, shift: Number(shift) };
    if (time !== undefined) allotmentUpdate.time = time;
    if (subject !== undefined) allotmentUpdate.subject = subject;

    await Allotment.updateMany(
      { date: currentDate, shift: currentShift, orgCode: req.user.adminCode },
      { $set: allotmentUpdate }
    );

    const invigUpdate = { date, shift: Number(shift) };
    if (time !== undefined) invigUpdate.time = time;

    await InvigAssignment.updateMany(
      { date: currentDate, shift: currentShift, orgCode: req.user.adminCode },
      { $set: invigUpdate }
    );

    if (Array.isArray(combinations)) {
      const currentAllotments = await Allotment.find({
        date,
        shift: Number(shift),
        orgCode: req.user.adminCode
      }).populate("student");

      const examType = currentAllotments[0]?.student?.examType || "College";

      const currentCombos = [];
      const currentComboKeys = new Set();
      for (const a of currentAllotments) {
        if (a.student) {
          const s = a.student;
          const key = `${s.dept || ""}_${s.sem || ""}_${a.subject || ""}`;
          if (!currentComboKeys.has(key)) {
            currentComboKeys.add(key);
            currentCombos.push({ dept: s.dept || "", sem: String(s.sem || ""), subject: a.subject || "" });
          }
        }
      }

      const newComboKeys = new Set();
      for (const c of combinations) {
        const key = `${c.dept || ""}_${c.sem || ""}_${c.subject || ""}`;
        newComboKeys.add(key);
      }

      const combosToRemove = currentCombos.filter(c => {
        const key = `${c.dept || ""}_${c.sem || ""}_${c.subject || ""}`;
        return !newComboKeys.has(key);
      });

      const deletedStudentIds = [];

      for (const c of combosToRemove) {
        const studentsToRemove = await Student.find({
          dept: c.dept,
          sem: Number(c.sem) || c.sem,
          orgCode: req.user.adminCode
        }).distinct("_id");

        if (studentsToRemove.length > 0) {
          const matchingAllotments = await Allotment.find({
            date,
            shift: Number(shift),
            student: { $in: studentsToRemove },
            subject: c.subject,
            orgCode: req.user.adminCode
          }).distinct("student");

          deletedStudentIds.push(...matchingAllotments);

          await Allotment.deleteMany({
            date,
            shift: Number(shift),
            student: { $in: studentsToRemove },
            subject: c.subject,
            orgCode: req.user.adminCode
          });
        }
      }

      if (deletedStudentIds.length > 0) {
        await cleanupDeletedStudents(deletedStudentIds, req.user.adminCode);
      }

      const combosToAdd = combinations.filter(c => {
        const key = `${c.dept || ""}_${c.sem || ""}_${c.subject || ""}`;
        return !currentComboKeys.has(key);
      });

      const existingStudentIdsInSlot = new Set(
        (await Allotment.find({
          date,
          shift: Number(shift),
          orgCode: req.user.adminCode
        }).distinct("student")).map(id => String(id))
      );

      const newAllotments = [];
      for (const c of combosToAdd) {
        const studentsToAdd = await Student.find({
          dept: c.dept,
          sem: Number(c.sem) || c.sem,
          examType,
          orgCode: req.user.adminCode
        });

        for (const student of studentsToAdd) {
          if (!existingStudentIdsInSlot.has(String(student._id))) {
            newAllotments.push({
              student: student._id,
              room: null,
              row: null,
              col: null,
              seatCode: "",
              shift: Number(shift),
              date,
              time: time || "",
              subject: c.subject || subject || "",
              seatLabel: "Staging Bucket",
              orgCode: req.user.adminCode
            });
            existingStudentIdsInSlot.add(String(student._id));
          }
        }
      }

      if (newAllotments.length > 0) {
        await Allotment.insertMany(newAllotments);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
