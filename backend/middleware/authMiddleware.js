import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = (req, res, next) => {
  let token = null;
  const h = req.headers["authorization"];
  if (h && h.startsWith("Bearer ")) {
    token = h.split(" ")[1];
  } else if (h) {
    token = h;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: "Missing auth header" });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = p;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const adminOnly = async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u || u.role !== "admin") {
      return res.status(403).json({ error: "Permission denied. Admin role required." });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: "Server error checking permissions" });
  }
};
