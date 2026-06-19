import Allotment from "../models/Allotment.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import { generateAllotments as generateAlgo } from "../services/seatGenerator.js";

export const generate = async (req, res) => {
  try {
    const shift = Number(req.body.shift) || 1;
    const seed = Number(req.body.seed || 1);
    const { date, time, examType, deptSemCombinations, useDistancing, rowGrouping, colGrouping, excludeStudentIds, gapType, gapAction } = req.body;

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

    if (docs.length) await Allotment.insertMany(docs);
    res.json({ ok: true, count: docs.length, notPlaced });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const saveManual = async (req, res) => {
  try {
    const { shift, date, allotments, useDistancing, rowGrouping, colGrouping, gapType, gapAction } = req.body;
    if (!date || !shift) return res.status(400).json({ error: "Date and Shift are required" });
    
    await Allotment.deleteMany({ shift: Number(shift), date, orgCode: req.user.adminCode });
    
    if (Array.isArray(allotments) && allotments.length > 0) {
      const docs = allotments.map(a => {
        const student = a.student._id || a.student;
        const room = a.room._id || a.room;
        const roomName = (a.room && a.room.name) || "Room";
        const studentRoll = (a.student && a.student.roll) || "";
        
        return {
          student, room, row: a.row, col: a.col, seatCode: a.seatCode, shift: Number(shift), date,
          time: a.time || "", subject: a.subject || "", seatLabel: a.seatLabel || `${roomName}.-${a.seatCode}-StudentRollno(${studentRoll})`,
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
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
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
