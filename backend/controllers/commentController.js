import Comment from "../models/Comment.js";

export const addComment = async (req, res) => {
  try {
    const { date, shift, text } = req.body;
    if (!date || !shift || !text || !text.trim()) return res.status(400).json({ error: "date, shift, and text required" });

    const newComment = new Comment({ user: req.user.id, date, shift: Number(shift), text: text.trim(), orgCode: req.user.adminCode });
    await newComment.save();
    const populated = await newComment.populate("user", "name username role");
    res.json({ ok: true, comment: populated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { date, shift } = req.query;
    if (!date || !shift) return res.status(400).json({ error: "date and shift query parameters required" });
    const comments = await Comment.find({ date, shift: Number(shift), orgCode: req.user.adminCode }).populate("user", "name username role").sort({ createdAt: 1 });
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
