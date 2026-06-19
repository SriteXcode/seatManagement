import { parse } from "csv-parse/sync";
import Student from "../models/Student.js";
import Allotment from "../models/Allotment.js";

export const importCSV = async (req, res) => {
  try {
    const csvText = req.body.csv;
    const examType = req.body.examType || "College";
    if (!csvText) return res.status(400).json({ error: "csv required" });
    const records = parse(csvText, { trim: true, skip_empty_lines: true });
    if (records.length === 0) return res.status(400).json({ error: "no rows" });

    if (req.body.cleanImport === true || req.body.cleanImport === "true") {
      const studentIds = (await Student.find({ examType, orgCode: req.user.adminCode }).select('_id')).map(s => s._id);
      await Student.deleteMany({ examType, orgCode: req.user.adminCode });
      await Allotment.deleteMany({ student: { $in: studentIds }, orgCode: req.user.adminCode });
    }

    const originalHeaders = records[0];
    const cleanHeaders = originalHeaders.map(h => (h || "").toString().trim().toLowerCase());
    let hasHeader = cleanHeaders.includes("roll");
    if (hasHeader) records.shift();
    const rollIdx = hasHeader ? cleanHeaders.indexOf("roll") : 0;
    const nameIdx = hasHeader ? cleanHeaders.indexOf("name") : 1;
    const deptIdx = hasHeader ? cleanHeaders.indexOf("dept") : 2;
    const semIdx = hasHeader ? cleanHeaders.indexOf("sem") : 3;
    const subjectIdx = hasHeader ? cleanHeaders.indexOf("subject") : -1;
    const metaFields = [];
    if (hasHeader) cleanHeaders.forEach((h, idx) => { if (![rollIdx, nameIdx, deptIdx, semIdx, subjectIdx].includes(idx) && h !== "") metaFields.push({ idx, label: originalHeaders[idx] }); });
    const ops = records.map(row => {
      const roll = (row[rollIdx] || "").toString().trim();
      if (!roll) return null;
      const sem = (row[semIdx] || "").toString().trim();
      const semNum = Number(sem);
      const shift = !isNaN(semNum) && semNum > 0 ? (semNum % 2 === 1 ? 1 : 2) : (sem.split('').reduce((h, c) => h + c.charCodeAt(0), 0) % 2 === 0 ? 1 : 2);
      return { updateOne: { filter: { roll, orgCode: req.user.adminCode }, update: { $set: { roll, name: (row[nameIdx] || "").toString().trim(), dept: (row[deptIdx] || "").toString().trim(), sem, shift, examType, subject: (subjectIdx !== -1 && row[subjectIdx]) ? row[subjectIdx].toString().trim().split(/[,;|]+/).map(s => s.trim()).filter(Boolean) : [], metadata: metaFields.reduce((m, f) => { if (row[f.idx] !== undefined) m[f.label] = row[f.idx].toString().trim(); return m; }, {}), orgCode: req.user.adminCode } }, upsert: true } };
    }).filter(Boolean);
    if (ops.length === 0) return res.status(400).json({ error: "no valid rows" });
    const resu = await Student.bulkWrite(ops);
    res.json({
      ok: true,
      upserted: resu.upsertedCount || resu.nUpserted || 0,
      matched: resu.matchedCount || resu.nMatched || 0,
      modified: resu.modifiedCount || resu.nModified || 0,
      inserted: resu.insertedCount || resu.nInserted || 0,
      total: ops.length
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getMeta = async (req, res) => {
  try {
    const examType = req.query.examType || "College";
    const filter = { examType, orgCode: req.user.adminCode };
    if (req.query.dept) filter.dept = req.query.dept;
    if (req.query.sem) filter.sem = req.query.sem;
    const depts = await Student.distinct("dept", { examType, orgCode: req.user.adminCode });
    const sems = await Student.distinct("sem", { examType, orgCode: req.user.adminCode });
    const subjects = await Student.distinct("subject", filter);
    res.json({ depts: depts.filter(Boolean).sort(), sems: sems.filter(Boolean).sort((a, b) => isNaN(a) || isNaN(b) ? String(a).localeCompare(String(b), undefined, { numeric: true }) : a - b), subjects: subjects.filter(Boolean).sort() });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getAll = async (req, res) => { res.json(await Student.find({ orgCode: req.user.adminCode }).lean()); };

export const findByRoll = async (req, res) => {
  const s = await Student.findOne({ roll: req.query.roll, orgCode: req.user.adminCode }).lean();
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
};

export const queryStudents = async (req, res) => {
  const { deptSemCombinations, examType } = req.body;
  if (!deptSemCombinations?.length) return res.json([]);
  res.json(await Student.find({ examType: examType || "College", orgCode: req.user.adminCode, $or: deptSemCombinations.map(c => ({ dept: c.dept, sem: c.sem })) }).lean());
};

const getShift = (sem) => { const n = Number(sem); return !isNaN(n) && n > 0 ? (n % 2 === 1 ? 1 : 2) : (sem.split('').reduce((h, c) => h + c.charCodeAt(0), 0) % 2 === 0 ? 1 : 2); };

export const addStudent = async (req, res) => {
  try {
    const { roll, name, dept, sem, subject, examType } = req.body;
    if (!roll || !sem) return res.status(400).json({ error: "roll+sem required" });
    if (await Student.findOne({ roll, orgCode: req.user.adminCode })) return res.status(400).json({ error: "Exists" });
    const s = new Student({ roll, name, dept, sem, shift: getShift(sem), subject: Array.isArray(subject) ? subject : (subject ? [subject] : []), examType: examType || "College", orgCode: req.user.adminCode });
    await s.save();
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateStudent = async (req, res) => {
  try {
    const { roll, name, dept, sem, subject, examType } = req.body;
    if (await Student.findOne({ roll, orgCode: req.user.adminCode, _id: { $ne: req.params.id } })) return res.status(400).json({ error: "Exists" });
    const s = await Student.findOneAndUpdate({ _id: req.params.id, orgCode: req.user.adminCode }, { roll, name, dept, sem, shift: getShift(sem), subject: Array.isArray(subject) ? subject : (subject ? [subject] : []), examType: examType || "College" }, { new: true });
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteStudent = async (req, res) => {
  try {
    if (!await Student.findOneAndDelete({ _id: req.params.id, orgCode: req.user.adminCode })) return res.status(404).json({ error: "Not found" });
    await Allotment.deleteMany({ student: req.params.id, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
