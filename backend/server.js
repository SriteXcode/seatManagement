// index.js
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import PDFDocument from "pdfkit";
import { parse } from "csv-parse/sync";

import User from "./models/User.js";
import Student from "./models/Student.js";
import Room from "./models/Room.js";
import Allotment from "./models/Allotment.js";
import Invigilator from "./models/Invigilator.js";
import InvigAssignment from "./models/InvigAssignment.js";
import ExamConfig from "./models/ExamConfig.js";
import Library from "./models/Library.js";
import Comment from "./models/Comment.js";
import { generateAllotments, seatCodeFrom } from "./services/seatGenerator.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(morgan("dev"));

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json({ limit: "10mb" }));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("FATAL: MONGO_URI and JWT_SECRET must be defined in .env");
  process.exit(1);
}

// Connect DB
mongoose.connect(MONGO_URI, { autoIndex: true }).then(async () => {
  console.log("Mongo connected");
  await seedDefaultConfigs();
  const migrateRes = await Student.updateMany({ examType: { $exists: false } }, { $set: { examType: "College" } });
  if (migrateRes.modifiedCount > 0) {
    console.log(`Migrated ${migrateRes.modifiedCount} legacy students to examType "College"`);
  }
}).catch(err => { console.error(err); process.exit(1); });

async function seedDefaultConfigs() {
  try {
    const defaults = [
      {
        examType: "College",
        fields: [
          { key: "roll", label: "Roll No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Department", type: "constraint_1", required: true },
          { key: "sem", label: "Semester", type: "constraint_2", required: true },
          { key: "subject", label: "Subject", type: "subject", required: true }
        ]
      },
      {
        examType: "School",
        fields: [
          { key: "roll", label: "Roll No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Section", type: "constraint_1", required: true },
          { key: "sem", label: "Class", type: "constraint_2", required: true },
          { key: "subject", label: "Subject", type: "subject", required: true }
        ]
      },
      {
        examType: "Competitive",
        fields: [
          { key: "roll", label: "Registration No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Stream", type: "constraint_1", required: true },
          { key: "sem", label: "Subject", type: "constraint_2", required: true }
        ]
      }
    ];

    for (const conf of defaults) {
      await ExamConfig.findOneAndUpdate(
        { examType: conf.examType },
        { $set: conf },
        { upsert: true, new: true }
      );
    }
    console.log("Default exam configs upserted/verified");
  } catch (error) {
    console.error("Error seeding default exam configs:", error);
  }
}

/* -------------------------
   Auth helpers
   ------------------------- */
function authMiddleware(req, res, next) {
  const h = req.headers["authorization"];
  if (!h) return res.status(401).json({ error: "Missing auth header" });
  const token = h.split(" ")[1];
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.user = p;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* -------------------------
   Auth endpoints
   ------------------------- */
// POST /auth/setup { username, password }  -> create admin (run once)
// POST /auth/login { username, password } -> get token
app.post("/auth/setup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username+password required" });
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "user exists" });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ username, passwordHash: hash });
  await u.save();
  res.json({ ok: true });
});

async function adminOnly(req, res, next) {
  try {
    const u = await User.findById(req.user.id);
    if (!u || u.role !== "admin") {
      return res.status(403).json({ error: "Permission denied. Admin role required." });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: "Server error checking permissions" });
  }
}

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
  const u = await User.findOne({ username });
  if (!u) return res.status(401).json({ error: "Invalid username or password" });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });
  
  if (u.role === "staff" && !u.isApproved) {
    return res.status(403).json({ error: "Your account is pending Admin approval." });
  }
  
  const orgCode = u.role === "admin" ? u.adminCode : u.staffCode;
  const token = jwt.sign({ id: u._id, username: u.username, role: u.role || "admin", adminCode: orgCode || "" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

app.post("/auth/register", async (req, res) => {
  console.log("POST /auth/register payload received:", req.body);
  const { username, password, name, email, phone, address, orgName, staffCode, role } = req.body;
  if (!username || !password || !name || !email || !phone || !address || !role) {
    return res.status(400).json({ error: "All fields are required (username, password, name, email, phone, address, role)." });
  }
 
  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    
    if (role === "admin") {
      if (!orgName) {
        return res.status(400).json({ error: "Organization/School/College name is required for Admin registration." });
      }

      // Generate 6-digit unique admin code
      let adminCode;
      let codeExists = true;
      while (codeExists) {
        adminCode = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await User.findOne({ adminCode });
        if (!existing) codeExists = false;
      }

      const user = new User({
        username,
        passwordHash,
        role: "admin",
        name,
        email,
        phone,
        address,
        orgName,
        adminCode,
        isApproved: true
      });

      await user.save();
      return res.status(201).json({ 
        ok: true, 
        message: "Admin registered successfully. Your unique staff registration code is: " + adminCode,
        adminCode 
      });
    } else if (role === "staff") {
      if (!staffCode) {
        return res.status(400).json({ error: "Admin unique code is required for Staff registration." });
      }

      // Verify admin unique code
      const admin = await User.findOne({ adminCode: staffCode, role: "admin" });
      if (!admin) {
        return res.status(400).json({ error: "Invalid Admin unique code. Please verify it and try again." });
      }

      const user = new User({
        username,
        passwordHash,
        role: "staff",
        name,
        email,
        phone,
        address,
        staffCode,
        isApproved: false
      });

      await user.save();
      return res.status(201).json({ 
        ok: true, 
        message: "Staff registered successfully. Your request has been sent to the Admin for approval." 
      });
    } else {
      return res.status(400).json({ error: "Invalid role selected." });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


/* -------------------------
   Exam Config endpoints
   ------------------------- */
app.get("/exam-configs", authMiddleware, async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    let configs = await ExamConfig.find({ orgCode }).lean();
    if (configs.length === 0) {
      const defaults = [
        {
          examType: "College",
          orgCode,
          fields: [
            { key: "roll", label: "Roll No", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Department", type: "constraint_1", required: true },
            { key: "sem", label: "Semester", type: "constraint_2", required: true },
            { key: "subject", label: "Subject", type: "subject", required: true }
          ]
        },
        {
          examType: "School",
          orgCode,
          fields: [
            { key: "roll", label: "Roll No", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Section", type: "constraint_1", required: true },
            { key: "sem", label: "Class", type: "constraint_2", required: true },
            { key: "subject", label: "Subject", type: "subject", required: true }
          ]
        },
        {
          examType: "Competitive",
          orgCode,
          fields: [
            { key: "roll", label: "Registration No", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Stream", type: "constraint_1", required: true },
            { key: "sem", label: "Subject", type: "constraint_2", required: true }
          ]
        }
      ];
      await ExamConfig.insertMany(defaults);
      configs = await ExamConfig.find({ orgCode }).lean();
    }
    res.json(configs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/exam-configs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { examType, fields } = req.body;
    if (!examType || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: "examType and fields (array) are required" });
    }
    const config = await ExamConfig.findOneAndUpdate(
      { examType, orgCode: req.user.adminCode },
      { examType, fields, orgCode: req.user.adminCode },
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/exam-configs/:examType", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { examType } = req.params;
    await ExamConfig.deleteOne({ examType, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/* -------------------------
   Students endpoints
   ------------------------- */
/**
 * POST /students/import-csv
 * body: { csv: string } - CSV lines "roll,name,dept,sem"
 */
app.post("/students/import-csv", authMiddleware, adminOnly, async (req, res) => {
  try {
    const csvText = req.body.csv;
    const examType = req.body.examType || "College";
    if (!csvText) return res.status(400).json({ error: "csv required" });
    const records = parse(csvText, { trim: true, skip_empty_lines: true });
    if (records.length === 0) return res.status(400).json({ error: "no rows" });
    
    const originalHeaders = records[0];
    const cleanHeaders = originalHeaders.map(h => (h || "").toString().trim().toLowerCase());
    
    let hasHeader = false;
    if (cleanHeaders.includes("roll")) {
      hasHeader = true;
      records.shift();
    }
    
    const rollIdx = hasHeader ? cleanHeaders.indexOf("roll") : 0;
    const nameIdx = hasHeader ? cleanHeaders.indexOf("name") : 1;
    const deptIdx = hasHeader ? cleanHeaders.indexOf("dept") : 2;
    const semIdx = hasHeader ? cleanHeaders.indexOf("sem") : 3;
    const subjectIdx = hasHeader ? cleanHeaders.indexOf("subject") : -1;
    
    const metaFields = [];
    if (hasHeader) {
      cleanHeaders.forEach((h, idx) => {
        if (idx !== rollIdx && idx !== nameIdx && idx !== deptIdx && idx !== semIdx && idx !== subjectIdx && h !== "") {
          metaFields.push({ idx, label: originalHeaders[idx] });
        }
      });
    }
    
    const ops = [];
    for (const row of records) {
      const roll = (row[rollIdx] || "").toString().trim();
      if (!roll) continue;
      
      const name = (row[nameIdx] || "").toString().trim();
      const dept = (row[deptIdx] || "").toString().trim();
      const sem = (row[semIdx] || "").toString().trim();
      const rawSubject = (subjectIdx !== -1 && row[subjectIdx] !== undefined) ? row[subjectIdx].toString().trim() : "";
      const subject = rawSubject ? rawSubject.split(/[,;|]+/).map(s => s.trim()).filter(Boolean) : [];
      
      let shift = 1;
      const semNum = Number(sem);
      if (!isNaN(semNum) && semNum > 0) {
        shift = (semNum % 2 === 1) ? 1 : 2;
      } else if (sem) {
        let hash = 0;
        for (let i = 0; i < sem.length; i++) {
          hash += sem.charCodeAt(i);
        }
        shift = (hash % 2 === 0) ? 1 : 2;
      }
      
      const metadata = {};
      for (const field of metaFields) {
        if (row[field.idx] !== undefined) {
          metadata[field.label] = row[field.idx].toString().trim();
        }
      }
      
      ops.push({
        updateOne: {
          filter: { roll, orgCode: req.user.adminCode },
          update: { 
            $set: { 
              roll, 
              name, 
              dept, 
              sem, 
              shift,
              examType,
              subject,
              metadata,
              orgCode: req.user.adminCode
            } 
          },
          upsert: true
        }
      });
    }
    
    if (ops.length === 0) return res.status(400).json({ error: "no valid rows" });
    const resu = await Student.bulkWrite(ops);
    res.json({ ok: true, upserted: resu.nUpserted || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/students/meta", authMiddleware, async (req, res) => {
  try {
    const examType = req.query.examType || "College";
    const { dept, sem } = req.query;
    const filter = { examType, orgCode: req.user.adminCode };
    if (dept) filter.dept = dept;
    if (sem) filter.sem = sem;

    const depts = await Student.distinct("dept", { examType, orgCode: req.user.adminCode });
    const sems = await Student.distinct("sem", { examType, orgCode: req.user.adminCode });
    const subjects = await Student.distinct("subject", filter);
    res.json({ 
      depts: depts.filter(Boolean).sort(), 
      sems: sems.filter(Boolean).sort((a, b) => {
        const aNum = Number(a);
        const bNum = Number(b);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      }),
      subjects: subjects.filter(Boolean).sort()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/students", authMiddleware, async (req, res) => {
  const s = await Student.find({ orgCode: req.user.adminCode }).lean();
  res.json(s);
});

app.get("/students/find", authMiddleware, async (req, res) => {
  try {
    const { roll } = req.query;
    if (!roll) return res.status(400).json({ error: "Roll number is required" });
    const student = await Student.findOne({ roll, orgCode: req.user.adminCode }).lean();
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/students/query", authMiddleware, async (req, res) => {
  try {
    const { deptSemCombinations, examType } = req.body;
    if (!deptSemCombinations || deptSemCombinations.length === 0) {
      return res.json([]);
    }
    const query = {
      examType: examType || "College",
      orgCode: req.user.adminCode,
      $or: deptSemCombinations.map(combo => ({ dept: combo.dept, sem: combo.sem }))
    };
    const students = await Student.find(query).lean();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/students", authMiddleware, adminOnly, async (req, res) => {
  const { roll, name, dept, sem, subject, examType } = req.body;
  if (!roll || !sem) return res.status(400).json({ error: "roll+sem required" });
  
  let shift = 1;
  const semNum = Number(sem);
  if (!isNaN(semNum) && semNum > 0) {
    shift = (semNum % 2 === 1) ? 1 : 2;
  } else if (sem) {
    let hash = 0;
    for (let i = 0; i < sem.length; i++) {
      hash += sem.charCodeAt(i);
    }
    shift = (hash % 2 === 0) ? 1 : 2;
  }
  
  const existing = await Student.findOne({ roll, orgCode: req.user.adminCode });
  if (existing) return res.status(400).json({ error: "Student roll number already exists in this organization" });

  const st = new Student({ 
    roll, 
    name, 
    dept, 
    sem, 
    shift, 
    subject: Array.isArray(subject) ? subject : (subject ? [subject] : []),
    examType: examType || "College",
    orgCode: req.user.adminCode 
  });
  await st.save();
  res.json(st);
});

app.put("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { roll, name, dept, sem, subject, examType } = req.body;
    if (!roll || !sem) return res.status(400).json({ error: "roll and sem are required" });

    const existing = await Student.findOne({ roll, orgCode: req.user.adminCode, _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ error: "Student roll number already exists in this organization" });

    let shift = 1;
    const semNum = Number(sem);
    if (!isNaN(semNum) && semNum > 0) {
      shift = (semNum % 2 === 1) ? 1 : 2;
    } else if (sem) {
      let hash = 0;
      for (let i = 0; i < sem.length; i++) {
        hash += sem.charCodeAt(i);
      }
      shift = (hash % 2 === 0) ? 1 : 2;
    }

    const updated = await Student.findOneAndUpdate(
      { _id: req.params.id, orgCode: req.user.adminCode },
      { 
        roll, 
        name, 
        dept, 
        sem, 
        shift, 
        subject: Array.isArray(subject) ? subject : (subject ? [subject] : []),
        examType: examType || "College"
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Student not found" });
    
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const studentId = req.params.id;
    const st = await Student.findOneAndDelete({ _id: studentId, orgCode: req.user.adminCode });
    if (!st) return res.status(404).json({ error: "Student not found" });

    await Allotment.deleteMany({ student: studentId, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------------
   Rooms endpoints
   ------------------------- */
app.post("/rooms", authMiddleware, adminOnly, async (req, res) => {
  const { name, rows, cols, location } = req.body;
  if (!name || !rows || !cols) return res.status(400).json({ error: "name rows cols required" });
  const rm = new Room({ name, rows, cols, location, orgCode: req.user.adminCode });
  await rm.save();
  res.json(rm);
});

app.get("/rooms", authMiddleware, async (req, res) => {
  const r = await Room.find({ orgCode: req.user.adminCode }).lean();
  res.json(r);
});

app.put("/rooms/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, rows, cols, location } = req.body;
    if (!name || !rows || !cols) return res.status(400).json({ error: "name, rows, and cols are required" });
    const rm = await Room.findOneAndUpdate(
      { _id: req.params.id, orgCode: req.user.adminCode },
      { name, rows: Number(rows), cols: Number(cols), location },
      { new: true }
    );
    if (!rm) return res.status(404).json({ error: "Room not found" });
    res.json(rm);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/rooms/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const roomId = req.params.id;
    const rm = await Room.findOneAndDelete({ _id: roomId, orgCode: req.user.adminCode });
    if (!rm) return res.status(404).json({ error: "Room not found" });
    // Clean up associated allotments and invigilator assignments
    await Allotment.deleteMany({ room: roomId, orgCode: req.user.adminCode });
    await InvigAssignment.deleteMany({ room: roomId, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------------
   Generate allotment
   ------------------------- */
/**
 * POST /generate
 * body: { shift: 1|2, seed: number (opt), date: string, time: string, depts: [], sems: [] }
 * Behavior: deletes existing allotments for shift+date, generates fresh ones and stores them.
 */
app.post("/generate", authMiddleware, adminOnly, async (req, res) => {
  try {
    const shift = Number(req.body.shift) || 1;
    const seed = Number(req.body.seed || 1);
    const { date, time, subject, examType, deptSemCombinations, useDistancing, rowGrouping, colGrouping, excludeStudentIds, gapType, gapAction } = req.body;

    if (!date) return res.status(400).json({ error: "Date is required" });

    // 1. Fetch existing allotments for this Date+Shift to check and enforce examType
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

    if (activeExamType === "College" || activeExamType === "School") {
      const missingSubject = deptSemCombinations?.some(combo => !combo.subject || !combo.subject.trim());
      if (missingSubject) {
        return res.status(400).json({ error: "Subject is required for all combinations in College and School exams" });
      }
    }
    if (!deptSemCombinations || deptSemCombinations.length === 0) return res.status(400).json({ error: "At least one Department-Semester combination is required" });

    // Validation: A single class (dept + sem) cannot have more than one subject scheduled in the request.
    const classSet = new Set();
    for (const combo of deptSemCombinations) {
      const classKey = `${combo.dept}-${combo.sem}`;
      if (classSet.has(classKey)) {
        return res.status(400).json({ error: `Cannot schedule multiple subjects for the same class (${combo.dept} Sem ${combo.sem}) at the same time.` });
      }
      classSet.add(classKey);
    }

    const rooms = await Room.find({ orgCode: req.user.adminCode }).lean();
    
    const query = { 
      examType: activeExamType,
      orgCode: req.user.adminCode,
      $or: deptSemCombinations.map(combo => {
        const filterObj = { dept: combo.dept, sem: combo.sem };
        if (combo.subject) {
          // A student is applicable if their database subject array contains combo.subject OR if their database subject is empty/not defined
          filterObj.$or = [
            { subject: combo.subject },
            { subject: [] },
            { subject: "" },
            { subject: null },
            { subject: { $exists: false } }
          ];
        }
        return filterObj;
      }) 
    };
    let students = await Student.find(query).lean();
    if (Array.isArray(excludeStudentIds) && excludeStudentIds.length > 0) {
      const excludeSet = new Set(excludeStudentIds.map(String));
      students = students.filter(s => !excludeSet.has(String(s._id)));
    }

    // 2. Filter: Delete matches, Block non-matches
    const toDeleteIds = [];
    const blockers = [];

    for (const a of existing) {
      if (!a.student) continue; // Safety check
      const isTarget = deptSemCombinations.some(combo => 
        combo.dept === a.student.dept && 
        Number(combo.sem) === Number(a.student.sem)
      );

      if (isTarget) {
        toDeleteIds.push(a._id);
      } else {
        blockers.push({
          room: String(a.room._id || a.room), // Handle populated vs unpopulated room just in case, though we usually need ID
          row: a.row,
          col: a.col,
          student: a.student
        });
      }
    }

    // 3. Delete previous for these specific depts/sems
    if (toDeleteIds.length > 0) {
      await Allotment.deleteMany({ _id: { $in: toDeleteIds }, orgCode: req.user.adminCode });
    }

    // 4. Generate with blockers
    const { allotments, notPlaced } = generateAllotments({ 
      students, 
      rooms, 
      shift, 
      seed, 
      occupied: blockers,
      useDistancing: Boolean(useDistancing && gapAction === 'remove-seats'),
      rowGrouping: Number(rowGrouping) || 0,
      colGrouping: Number(colGrouping) || 0
    });

    // persist
    const docs = allotments.map(a => {
      const matchingCombo = deptSemCombinations.find(combo => 
        combo.dept === a.student.dept && 
        String(combo.sem) === String(a.student.sem)
      );
      const allotmentSubject = (matchingCombo ? matchingCombo.subject : "") || (Array.isArray(a.student.subject) ? a.student.subject[0] : a.student.subject) || "";
      
      return {
        student: a.student._id,
        room: a.room._id,
        row: a.row,
        col: a.col,
        seatCode: a.seatCode,
        shift: a.shift,
        date,
        time,
        subject: allotmentSubject,
        seatLabel: `${a.room.name}.-${a.seatCode}-StudentRollno(${a.student.roll})`,
        useDistancing: Boolean(useDistancing),
        rowGrouping: Number(rowGrouping) || 0,
        colGrouping: Number(colGrouping) || 0,
        gapType: gapType || "",
        gapAction: gapAction || "",
        orgCode: req.user.adminCode
      };
    });

    if (docs.length) await Allotment.insertMany(docs);

    res.json({ ok: true, count: docs.length, notPlaced });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/allotments/save-manual", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { shift, date, allotments, useDistancing, rowGrouping, colGrouping, gapType, gapAction } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required" });
    if (!shift) return res.status(400).json({ error: "Shift is required" });
    
    // Delete all existing allotments for this shift + date
    await Allotment.deleteMany({ shift: Number(shift), date, orgCode: req.user.adminCode });
    
    // Insert new allotments
    if (Array.isArray(allotments) && allotments.length > 0) {
      const docs = allotments.map(a => {
        const student = a.student._id || a.student;
        const room = a.room._id || a.room;
        const roomName = (a.room && a.room.name) || "Room";
        const studentRoll = (a.student && a.student.roll) || "";
        
        return {
          student,
          room,
          row: a.row,
          col: a.col,
          seatCode: a.seatCode,
          shift: Number(shift),
          date,
          time: a.time || "",
          subject: a.subject || "",
          seatLabel: a.seatLabel || `${roomName}.-${a.seatCode}-StudentRollno(${studentRoll})`,
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
    console.error("Error saving manual allotments:", error);
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------
   Allotments query / export
   ------------------------- */
app.get("/allotments", authMiddleware, async (req, res) => {
  const shift = Number(req.query.shift) || 1;
  const date = req.query.date;
  const roomId = req.query.roomId || null;
  const q = { shift, orgCode: req.user.adminCode };
  if (date) q.date = date;
  if (roomId) q.room = roomId;
  const data = await Allotment.find(q).populate("student").populate("room").lean();
  res.json(data);
});

app.get("/export/csv", authMiddleware, async (req, res) => {
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
});

/* -------------------------
   Export PDF (movie-ticket style)
   ------------------------- */
app.get("/export/pdf", authMiddleware, async (req, res) => {
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

    // Build seat map
    const seatMap = {};
    data.forEach(a => { seatMap[`${a.row},${a.col}`] = a; });

    // PDF layout using pdfkit
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
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


/* -------------------------
   invigilators endpoints
   ------------------------- */
// (Similar endpoints for invigilators can be added here)

// Create invigilator
app.post("/invigilators", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, empId, dept, phone, email } = req.body;
    if (!name || !empId) return res.status(400).json({ error: "name+empId required" });
    const existing = await Invigilator.findOne({ empId, orgCode: req.user.adminCode });
    if (existing) return res.status(400).json({ error: "empId already exists in this organization" });
    const inv = new Invigilator({ name, empId, dept, phone, email, orgCode: req.user.adminCode });
    await inv.save();
    res.json(inv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List invigilators
app.get("/invigilators", authMiddleware, async (req, res) => {
  const list = await Invigilator.find({ orgCode: req.user.adminCode }).lean();
  res.json(list);
});

// Assign invigilators automatically to rooms for a shift
// Body: { shift: 1, date, time, assignments: [], distributors: [] }
app.post("/assign-invigilators", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { shift, date, time, assignments, distributors } = req.body;

    if (!shift || !date) {
      return res.status(400).json({ error: 'Shift and Date are required.' });
    }

    // 1. Find which rooms actually have students
    const occupiedRoomIds = await Allotment.find({ shift, date, orgCode: req.user.adminCode }).distinct('room');
    const occupiedSet = new Set(occupiedRoomIds.map(id => String(id)));

    // 2. Clear previous assignments for this Shift+Date
    await InvigAssignment.deleteMany({ shift, date, orgCode: req.user.adminCode });

    const newAssignments = [];

    // 3. Process Room Assignments (only if room is occupied)
    if (assignments && Array.isArray(assignments)) {
      for (const assignment of assignments) {
        if (!occupiedSet.has(String(assignment.room))) continue; // Skip empty room

        for (const invigilatorId of assignment.invigilators) {
          newAssignments.push({
            shift,
            date,
            time,
            room: assignment.room,
            invigilator: invigilatorId,
            role: 'room',
            orgCode: req.user.adminCode
          });
        }
      }
    }

    // 4. Process Distributors
    if (distributors && Array.isArray(distributors)) {
      for (const distId of distributors) {
        newAssignments.push({
          shift,
          date,
          time,
          room: null,
          invigilator: distId,
          role: 'distributor',
          orgCode: req.user.adminCode
        });
      }
    }

    if (newAssignments.length > 0) {
      await InvigAssignment.insertMany(newAssignments);
    }

    res.json({ ok: true, assigned: newAssignments.length });
  } catch (error) {
    console.error('Error assigning invigilators:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get("/invigilator-assignments", authMiddleware, async (req, res) => {
  try {
    const { shift, date } = req.query;
    const q = { shift, orgCode: req.user.adminCode };
    if (date) q.date = date;
    
    const assignments = await InvigAssignment.find(q)
      .populate('invigilator')
      .populate('room');
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});







app.get("/schedules", authMiddleware, async (req, res) => {
  try {
    // 1. Fetch all allotments with populated student info for this org
    const allotments = await Allotment.find({ orgCode: req.user.adminCode }).populate("student").lean();

    // 2. Group by date and shift
    const groups = {};
    for (const a of allotments) {
      if (!a.date || !a.shift) continue;
      const key = `${a.date}_${a.shift}`;
      if (!groups[key]) {
        groups[key] = {
          date: a.date,
          shift: a.shift,
          times: new Set(),
          subjects: new Set(),
          examTypes: new Set(),
          depts: new Set(),
          sems: new Set(),
          sections: new Set(),
          combinations: [],
          combinationKeys: new Set()
        };
      }
      
      const g = groups[key];
      if (a.time) g.times.add(a.time);
      if (a.subject) g.subjects.add(a.subject);
      
      if (a.student) {
        const s = a.student;
        if (s.examType) g.examTypes.add(s.examType);
        else g.examTypes.add("College"); // default
        
        if (s.dept) g.depts.add(s.dept);
        if (s.sem) g.sems.add(String(s.sem));
        
        const comboKey = `${s.dept || ""}_${s.sem || ""}_${a.subject || ""}`;
        if (!g.combinationKeys.has(comboKey)) {
          g.combinationKeys.add(comboKey);
          g.combinations.push({
            dept: s.dept || "",
            sem: String(s.sem || ""),
            subject: a.subject || ""
          });
        }
        
        if (s.metadata) {
          // Check for keys that look like section, stream, sec, class etc.
          for (const [k, v] of Object.entries(s.metadata)) {
            const kl = k.toLowerCase();
            if (kl === "section" || kl === "sec" || kl === "stream" || kl === "class" || kl === "division" || kl === "div") {
              if (v) g.sections.add(String(v));
            }
          }
        }
      }
    }

    // 3. Format and sort
    const result = Object.values(groups).map(g => ({
      date: g.date,
      shift: g.shift,
      time: Array.from(g.times).filter(Boolean).join(", "),
      subject: Array.from(g.subjects).filter(Boolean).join(", "),
      examType: Array.from(g.examTypes).filter(Boolean).join(", ") || "College",
      depts: Array.from(g.depts).filter(Boolean),
      sems: Array.from(g.sems).filter(Boolean),
      sections: Array.from(g.sections).filter(Boolean),
      subjects: Array.from(g.subjects).filter(Boolean),
      combinations: g.combinations
    }));

    // Sort by date ascending, then shift ascending
    result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.shift - b.shift;
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/export/room-grid", authMiddleware, async (req, res) => {
  const { roomId } = req.query;
  const shift = Number(req.query.shift) || 1;
  const date = req.query.date;
  if (!roomId) return res.status(400).json({ error: "roomId required" });
  const room = await Room.findOne({ _id: roomId, orgCode: req.user.adminCode }).lean();
  if (!room) return res.status(404).json({ error: "room not found" });
  
  const q = { room: roomId, shift, orgCode: req.user.adminCode };
  if (date) q.date = date;
  const data = await Allotment.find(q).populate("student").lean();

  // if format=json, return json
  if (req.query.format === "json") {
    return res.json({ room, shift, seats: data });
  }

  // otherwise CSV
  const rows = [["roll","name","dept","sem","room","row","col","seatCode","seatLabel"]];
  data.forEach(d => rows.push([d.student.roll, d.student.name, d.student.dept, d.student.sem, d.room.name, d.row, d.col, d.seatCode, d.seatLabel]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  res.setHeader("Content-disposition", `attachment; filename=room_${room.name}_shift${shift}.csv`);
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

app.get("/rooms/schedules", authMiddleware, async (req, res) => {
  try {
    const allotments = await Allotment.find({ orgCode: req.user.adminCode }).populate("student").lean();
    const roomsMap = {};
    for (const a of allotments) {
      if (!a.room) continue;
      const roomId = String(a.room._id || a.room);
      if (!roomsMap[roomId]) {
        roomsMap[roomId] = [];
      }
      
      let group = roomsMap[roomId].find(g => g.date === a.date && g.shift === a.shift);
      if (!group) {
        group = {
          date: a.date,
          shift: a.shift,
          studentCount: 0,
          subjects: new Set(),
          examTypes: new Set()
        };
        roomsMap[roomId].push(group);
      }
      group.studentCount++;
      if (a.subject) group.subjects.add(a.subject);
      if (a.student && a.student.examType) group.examTypes.add(a.student.examType);
    }
    
    // Convert sets to arrays
    const result = {};
    for (const [roomId, groups] of Object.entries(roomsMap)) {
      result[roomId] = groups.map(g => ({
        date: g.date,
        shift: g.shift,
        studentCount: g.studentCount,
        subjects: Array.from(g.subjects),
        examType: Array.from(g.examTypes).join(", ") || "College"
      }));
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- LIBRARY ROUTES ---
app.post("/library", authMiddleware, async (req, res) => {
  try {
    const { date, shift, time, examType, subject, combinations } = req.body;
    if (!date || !shift) {
      return res.status(400).json({ error: "date and shift are required to save a schedule" });
    }

    // Check if it already exists in the organization library
    const existing = await Library.findOne({ orgCode: req.user.adminCode, date, shift });
    if (existing) {
      return res.status(400).json({ error: "This arrangement schedule is already in your library." });
    }

    const newItem = new Library({
      user: req.user.id,
      orgCode: req.user.adminCode,
      date,
      shift,
      time,
      examType,
      subject,
      combinations
    });

    await newItem.save();
    res.json({ ok: true, item: newItem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/library", authMiddleware, async (req, res) => {
  try {
    const items = await Library.find({ orgCode: req.user.adminCode }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/library/:id", authMiddleware, async (req, res) => {
  try {
    const result = await Library.findOneAndDelete({ _id: req.params.id, orgCode: req.user.adminCode });
    if (!result) {
      return res.status(404).json({ error: "Library item not found or unauthorized" });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- STAFF MANAGEMENT ENDPOINTS ---
app.get("/staff/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // Fetch all pending staff who registered with this admin's code
    const pendingStaff = await User.find({
      role: "staff",
      staffCode: currentUser.adminCode,
      isApproved: false
    }).select("-passwordHash");

    res.json(pendingStaff);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/staff/approve/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ error: "Admin not found" });

    const staffMember = await User.findOne({
      _id: req.params.id,
      role: "staff",
      staffCode: currentUser.adminCode
    });

    if (!staffMember) {
      return res.status(404).json({ error: "Staff member not found or registered under a different admin." });
    }

    staffMember.isApproved = true;
    await staffMember.save();

    res.json({ ok: true, message: "Staff member approved successfully." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- COMMENT ENDPOINTS ---
app.post("/comments", authMiddleware, async (req, res) => {
  try {
    const { date, shift, text } = req.body;
    if (!date || !shift || !text || !text.trim()) {
      return res.status(400).json({ error: "date, shift, and text are required" });
    }

    const newComment = new Comment({
      user: req.user.id,
      date,
      shift: Number(shift),
      text: text.trim(),
      orgCode: req.user.adminCode
    });

    await newComment.save();
    const populated = await newComment.populate("user", "name username role");

    res.json({ ok: true, comment: populated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/comments", authMiddleware, async (req, res) => {
  try {
    const { date, shift } = req.query;
    if (!date || !shift) {
      return res.status(400).json({ error: "date and shift query parameters are required" });
    }

    const comments = await Comment.find({ date, shift: Number(shift), orgCode: req.user.adminCode })
      .populate("user", "name username role")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
