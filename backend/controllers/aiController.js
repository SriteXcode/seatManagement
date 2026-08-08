import Room from "../models/Room.js";
import Student from "../models/Student.js";
import AiFeedback from "../models/AiFeedback.js";
import { getAiSeatingSuggestions, recordAiFeedback, compareAndLearnLayouts } from "../services/aiSeatAdvisor.js";

export const getSuggestions = async (req, res) => {
  try {
    const { 
      deptSemCombinations, 
      examType = "College", 
      selectedRoomIds,
      useDistancing,
      rowGrouping,
      colGrouping
    } = req.body;

    const orgCode = req.user.adminCode;

    // Fetch rooms
    let rooms = [];
    if (Array.isArray(selectedRoomIds) && selectedRoomIds.length > 0) {
      rooms = await Room.find({ _id: { $in: selectedRoomIds }, orgCode }).lean();
    } else {
      rooms = await Room.find({ orgCode }).lean();
    }

    // Fetch relevant students
    let students = [];
    if (Array.isArray(deptSemCombinations) && deptSemCombinations.length > 0) {
      const query = {
        orgCode,
        $or: deptSemCombinations.map(combo => ({
          dept: combo.dept,
          $or: [{ sem: Number(combo.sem) }, { sem: String(combo.sem) }],
          ...(combo.subject ? { $or: [{ subject: combo.subject }, { subject: [] }, { subject: "" }, { subject: null }, { subject: { $exists: false } }] } : {})
        }))
      };
      if (examType) {
        query.examType = examType;
      }
      students = await Student.find(query).lean();

      // Fallback if examType mismatch on legacy student records
      if (students.length === 0) {
        const fallbackQuery = {
          orgCode,
          $or: deptSemCombinations.map(combo => ({
            dept: combo.dept,
            $or: [{ sem: Number(combo.sem) }, { sem: String(combo.sem) }]
          }))
        };
        students = await Student.find(fallbackQuery).lean();
      }
    } else {
      // If no combo specified, fetch all active students for exam type
      const query = { orgCode };
      if (examType) query.examType = examType;
      students = await Student.find(query).lean();
      if (students.length === 0) {
        students = await Student.find({ orgCode }).lean();
      }
    }

    const suggestions = await getAiSeatingSuggestions({
      students,
      rooms,
      deptSemCombinations: deptSemCombinations || [],
      examType,
      useDistancing,
      rowGrouping,
      colGrouping,
      orgCode
    });

    res.json(suggestions);
  } catch (error) {
    console.error("[AI Controller getSuggestions Error]", error);
    res.status(500).json({ error: error.message });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment, ruleType, customRule } = req.body;
    const orgCode = req.user.adminCode;

    if (!rating && !comment && !customRule) {
      return res.status(400).json({ error: "Rating, comment, or custom rule is required" });
    }

    const doc = await recordAiFeedback({
      orgCode,
      rating,
      comment,
      ruleType,
      customRule
    });

    res.json({ ok: true, feedback: doc });
  } catch (error) {
    console.error("[AI Controller submitFeedback Error]", error);
    res.status(500).json({ error: error.message });
  }
};

export const compareAndLearn = async (req, res) => {
  try {
    const { originalAllotments, reorganizedAllotments } = req.body;
    const orgCode = req.user.adminCode;

    if (!Array.isArray(reorganizedAllotments)) {
      return res.status(400).json({ error: "Reorganized allotments list is required." });
    }

    const result = await compareAndLearnLayouts({
      orgCode,
      originalAllotments: originalAllotments || [],
      reorganizedAllotments
    });

    res.json(result);
  } catch (error) {
    console.error("[AI Controller compareAndLearn Error]", error);
    res.status(500).json({ error: error.message });
  }
};

export const getRules = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    const rules = await AiFeedback.find({ orgCode, isActive: true }).sort({ createdAt: -1 }).lean();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const orgCode = req.user.adminCode;

    await AiFeedback.findOneAndUpdate(
      { _id: id, orgCode },
      { $set: { isActive: false } }
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
