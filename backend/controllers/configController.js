import ExamConfig from "../models/ExamConfig.js";

export const getConfigs = async (req, res) => {
  try {
    const orgCode = req.user.adminCode;
    let configs = await ExamConfig.find({ orgCode }).lean();
    if (configs.length === 0) {
      const defaults = [
        {
          examType: "College", orgCode,
          fields: [
            { key: "roll", label: "Roll No", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Department", type: "constraint_1", required: true },
            { key: "sem", label: "Semester", type: "constraint_2", required: true },
            { key: "subject", label: "Subject", type: "subject", required: true }
          ]
        },
        {
          examType: "School", orgCode,
          fields: [
            { key: "roll", label: "Roll No", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Section", type: "constraint_1", required: true },
            { key: "sem", label: "Class", type: "constraint_2", required: true },
            { key: "subject", label: "Subject", type: "subject", required: true }
          ]
        },
        {
          examType: "Competitive", orgCode,
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
};

export const saveConfig = async (req, res) => {
  try {
    const { examType, fields } = req.body;
    if (!examType || !fields || !Array.isArray(fields)) return res.status(400).json({ error: "examType and fields (array) are required" });
    const config = await ExamConfig.findOneAndUpdate(
      { examType, orgCode: req.user.adminCode },
      { examType, fields, orgCode: req.user.adminCode },
      { returnDocument: "after", upsert: true }
    );
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteConfig = async (req, res) => {
  try {
    const { examType } = req.params;
    await ExamConfig.deleteOne({ examType, orgCode: req.user.adminCode });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
