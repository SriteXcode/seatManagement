import Library from "../models/Library.js";

export const addToLibrary = async (req, res) => {
  try {
    const { date, shift, time, examType, subject, combinations } = req.body;
    if (!date || !shift) return res.status(400).json({ error: "date and shift are required" });

    const shiftNum = Number(shift);
    const existing = await Library.findOne({ orgCode: req.user.adminCode, date, shift: shiftNum });
    if (existing) return res.status(400).json({ error: "This arrangement schedule is already in your library." });

    const newItem = new Library({
      user: req.user.id,
      orgCode: req.user.adminCode,
      date, shift: shiftNum, time, examType, subject, combinations
    });

    await newItem.save();
    res.json({ ok: true, item: newItem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getLibrary = async (req, res) => {
  try {
    const items = await Library.find({ orgCode: req.user.adminCode }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteLibraryItem = async (req, res) => {
  try {
    const result = await Library.findOneAndDelete({ _id: req.params.id, orgCode: req.user.adminCode });
    if (!result) return res.status(404).json({ error: "Library item not found or unauthorized" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateLibraryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, shift, time, examType, subject, combinations } = req.body;
    if (!date || !shift) return res.status(400).json({ error: "date and shift are required" });

    const shiftNum = Number(shift);
    const existing = await Library.findOne({
      orgCode: req.user.adminCode,
      date,
      shift: shiftNum,
      _id: { $ne: id }
    });
    if (existing) {
      return res.status(400).json({ error: "Another arrangement schedule with this date and shift already exists in your library." });
    }

    const updated = await Library.findOneAndUpdate(
      { _id: id, orgCode: req.user.adminCode },
      { date, shift: shiftNum, time, examType, subject, combinations },
      { returnDocument: "after" }
    );

    if (!updated) return res.status(404).json({ error: "Library item not found or unauthorized" });

    res.json({ ok: true, item: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
