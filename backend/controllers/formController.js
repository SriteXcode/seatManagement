// controllers/formController.js
import FormConfig from "../models/FormConfig.js";
import ExamConfig from "../models/ExamConfig.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

const getShift = (sem) => {
  if (!sem) return 1;
  const n = Number(sem);
  return !isNaN(n) && n > 0
    ? (n % 2 === 1 ? 1 : 2)
    : (sem.split('').reduce((h, c) => h + c.charCodeAt(0), 0) % 2 === 0 ? 1 : 2);
};

export const getFormConfig = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const { examType } = req.params;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    let config = await FormConfig.findOne({ orgCode, examType }).lean();

    if (!config) {
      // If no custom FormConfig exists yet, let's load default fields based on ExamConfig or system defaults
      const examConfig = await ExamConfig.findOne({ orgCode, examType }).lean();
      
      let fields = [];
      if (examConfig && examConfig.fields && examConfig.fields.length > 0) {
        fields = examConfig.fields.map(f => ({
          key: f.key,
          label: f.label,
          required: f.required || false,
          visible: true,
          placeholder: f.sampleValue || `Enter ${f.label}`,
          formatHelp: ""
        }));
      } else {
        // Fallback defaults
        if (examType === "School") {
          fields = [
            { key: "roll", label: "Roll No", required: true, visible: true, placeholder: "e.g. 25", formatHelp: "Enter digits only" },
            { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. Alex Johnson", formatHelp: "" },
            { key: "dept", label: "Section", required: true, visible: true, placeholder: "e.g. A or B", formatHelp: "" },
            { key: "sem", label: "Class", required: true, visible: true, placeholder: "e.g. 10", formatHelp: "Grade number" },
            { key: "subject", label: "Subject", required: true, visible: true, placeholder: "e.g. Math, Science", formatHelp: "Comma separated" }
          ];
        } else if (examType === "Competitive") {
          fields = [
            { key: "roll", label: "Registration No", required: true, visible: true, placeholder: "e.g. COMP-2026-987", formatHelp: "Unique candidate ID" },
            { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. Sarah Smith", formatHelp: "" },
            { key: "dept", label: "Stream", required: true, visible: true, placeholder: "e.g. Engineering", formatHelp: "" },
            { key: "sem", label: "Subject", required: true, visible: true, placeholder: "e.g. Physics", formatHelp: "" }
          ];
        } else {
          // College Default
          fields = [
            { key: "roll", label: "Roll No", required: true, visible: true, placeholder: "e.g. 2023-CS-101", formatHelp: "Format: YYYY-DEPT-ID" },
            { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. John Doe", formatHelp: "" },
            { key: "dept", label: "Department", required: true, visible: true, placeholder: "e.g. CSE", formatHelp: "Use uppercase code" },
            { key: "sem", label: "Semester", required: true, visible: true, placeholder: "e.g. V", formatHelp: "Roman numerals" },
            { key: "subject", label: "Subject", required: true, visible: true, placeholder: "e.g. Computer Networks", formatHelp: "" }
          ];
        }
      }

      config = {
        orgCode,
        examType,
        title: `${examType} Registration Form`,
        description: `Please fill out this form to register your details for the upcoming ${examType} exams.`,
        isActive: false,
        dueDate: null,
        fields
      };
    }

    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const saveFormConfig = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const { examType } = req.params;
    const { title, description, isActive, fields, dueDate } = req.body;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: "fields must be an array" });
    }

    const config = await FormConfig.findOneAndUpdate(
      { orgCode, examType },
      { orgCode, examType, title, description, isActive, fields, dueDate },
      { returnDocument: "after", upsert: true }
    ).lean();

    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getPublicFormConfig = async (req, res) => {
  try {
    const { orgCode, examType } = req.params;

    if (!orgCode || !examType) {
      return res.status(400).json({ error: "orgCode and examType are required" });
    }

    // Find the FormConfig
    let config = await FormConfig.findOne({ orgCode, examType }).lean();

    // Find organization name from Admin User
    const admin = await User.findOne({ adminCode: orgCode, role: "admin" }).lean();
    const orgName = admin ? admin.orgName : "Unknown Institution";

    if (!config) {
      // If admin hasn't created a FormConfig yet, return standard inactive response with default fields
      return res.json({
        orgCode,
        examType,
        orgName,
        title: `${examType} Registration Form`,
        description: `Registration is not configured or active for this exam type.`,
        isActive: false,
        fields: []
      });
    }

    res.json({
      ...config,
      orgName
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const registerStudentPublic = async (req, res) => {
  try {
    const { orgCode, examType } = req.params;
    const studentData = req.body;

    if (!orgCode || !examType) {
      return res.status(400).json({ error: "orgCode and examType are required" });
    }

    // 1. Check if form is active and not past due date
    const config = await FormConfig.findOne({ orgCode, examType }).lean();
    if (!config || !config.isActive) {
      return res.status(400).json({ error: "Registration is currently closed or inactive for this exam." });
    }

    if (config.dueDate && new Date() > new Date(config.dueDate)) {
      return res.status(400).json({ error: "Registration has closed because the due date has passed." });
    }

    // 2. Validate input against FormConfig fields
    const activeFields = config.fields.filter(f => f.visible);
    for (const f of activeFields) {
      if (f.required && (studentData[f.key] === undefined || studentData[f.key] === null || studentData[f.key].toString().trim() === "")) {
        return res.status(400).json({ error: `${f.label} is required.` });
      }
    }

    // 3. Roll number duplicate check inside this organization
    const roll = (studentData.roll || "").toString().trim();
    if (!roll) {
      return res.status(400).json({ error: "Roll number is required." });
    }
    const sem = (studentData.sem || "").toString().trim();
    const name = (studentData.name || "").toString().trim();
    const dept = (studentData.dept || "").toString().trim();

    const existing = await Student.findOne({ roll, sem, dept, orgCode });
    if (existing) {
      return res.status(400).json({ error: "A student with this Roll No, Class/Semester and Section/Department is already registered." });
    }
    
    // Subject processing
    let finalSubjects = [];
    if (studentData.subject) {
      if (Array.isArray(studentData.subject)) {
        finalSubjects = studentData.subject;
      } else {
        finalSubjects = studentData.subject.toString().split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
      }
    }

    // 5. Handle metadata if any other fields were submitted
    const metadata = {};
    const defaultKeys = ["roll", "name", "dept", "sem", "subject"];
    Object.keys(studentData).forEach(k => {
      if (!defaultKeys.includes(k) && typeof studentData[k] === "string") {
        metadata[k] = studentData[k].trim();
      }
    });

    const newStudent = new Student({
      roll,
      name,
      dept,
      sem,
      shift: getShift(sem),
      subject: finalSubjects,
      examType,
      orgCode,
      metadata
    });

    await newStudent.save();

    res.status(201).json({
      success: true,
      message: "Student registered successfully!",
      student: {
        id: newStudent._id,
        roll: newStudent.roll,
        name: newStudent.name,
        dept: newStudent.dept,
        sem: newStudent.sem,
        examType: newStudent.examType
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const listFormConfigs = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const configs = await FormConfig.find({ orgCode }).lean();
    res.json(configs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const saveFormConfigById = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const { _id, examType, title, description, isActive, fields, dueDate } = req.body;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: "fields must be an array" });
    }

    let config;
    if (_id) {
      config = await FormConfig.findOneAndUpdate(
        { _id, orgCode },
        { examType, title, description, isActive, fields, dueDate },
        { returnDocument: "after" }
      ).lean();
    } else {
      config = new FormConfig({
        orgCode,
        examType,
        title,
        description,
        isActive,
        fields,
        dueDate
      });
      await config.save();
      config = config.toObject();
    }

    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteFormConfigById = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const { id } = req.params;
    const result = await FormConfig.findOneAndDelete({ _id: id, orgCode });
    if (!result) return res.status(404).json({ error: "Form not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getPublicFormConfigById = async (req, res) => {
  try {
    const { orgCode, id } = req.params;

    if (!orgCode || !id) {
      return res.status(400).json({ error: "orgCode and form ID are required" });
    }

    let config = await FormConfig.findOne({ _id: id, orgCode }).lean();
    if (!config) {
      return res.status(404).json({ error: "Form configuration not found" });
    }

    const admin = await User.findOne({ adminCode: orgCode, role: "admin" }).lean();
    const orgName = admin ? admin.orgName : "Unknown Institution";

    res.json({
      ...config,
      orgName
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const registerStudentPublicById = async (req, res) => {
  try {
    const { orgCode, id } = req.params;
    const studentData = req.body;

    if (!orgCode || !id) {
      return res.status(400).json({ error: "orgCode and form ID are required" });
    }

    const config = await FormConfig.findOne({ _id: id, orgCode }).lean();
    if (!config) {
      return res.status(404).json({ error: "Form configuration not found or deleted." });
    }

    if (!config.isActive) {
      return res.status(400).json({ error: "Registration is currently closed or inactive for this form." });
    }

    if (config.dueDate && new Date() > new Date(config.dueDate)) {
      return res.status(400).json({ error: "Registration has closed because the due date has passed." });
    }

    // Validate input against FormConfig fields
    const activeFields = config.fields.filter(f => f.visible);
    for (const f of activeFields) {
      if (f.required && (studentData[f.key] === undefined || studentData[f.key] === null || studentData[f.key].toString().trim() === "")) {
        return res.status(400).json({ error: `${f.label} is required.` });
      }
    }

    const roll = (studentData.roll || "").toString().trim();
    if (!roll) {
      return res.status(400).json({ error: "Roll number is required." });
    }
    const sem = (studentData.sem || "").toString().trim();
    const name = (studentData.name || "").toString().trim();
    const dept = (studentData.dept || "").toString().trim();

    const existing = await Student.findOne({ roll, sem, dept, orgCode, examType: config.examType });
    if (existing) {
      return res.status(400).json({ error: "A student with this Roll No, Class/Semester and Section/Department is already registered for this exam type." });
    }

    // Subject processing
    let finalSubjects = [];
    if (studentData.subject) {
      if (Array.isArray(studentData.subject)) {
        finalSubjects = studentData.subject;
      } else {
        finalSubjects = studentData.subject.toString().split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
      }
    }

    const metadata = {};
    const defaultKeys = ["roll", "name", "dept", "sem", "subject"];
    Object.keys(studentData).forEach(k => {
      if (!defaultKeys.includes(k) && typeof studentData[k] === "string") {
        metadata[k] = studentData[k].trim();
      }
    });

    const newStudent = new Student({
      roll,
      name,
      dept,
      sem,
      shift: getShift(sem),
      subject: finalSubjects,
      examType: config.examType,
      orgCode,
      metadata
    });

    await newStudent.save();

    res.status(201).json({
      success: true,
      message: "Student registered successfully!",
      student: {
        id: newStudent._id,
        roll: newStudent.roll,
        name: newStudent.name,
        dept: newStudent.dept,
        sem: newStudent.sem,
        examType: newStudent.examType
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
