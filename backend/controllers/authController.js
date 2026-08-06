import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const login = async (req, res) => {
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
  const token = jwt.sign(
    { id: u._id, username: u.username, role: u.role || "admin", adminCode: orgCode || "" }, 
    process.env.JWT_SECRET, 
    { expiresIn: "7d" }
  );
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.json({ token });
};

export const register = async (req, res) => {
  const { username, password, name, email, phone, address, orgName, staffCode, role } = req.body;
  if (!username || !password || !name || !email || !phone || !address || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }
 
  try {
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ error: "Username already exists" });
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    if (role === "admin") {
      if (!orgName) return res.status(400).json({ error: "Org name required for Admin." });

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
        isApproved: true,
        tawkDepartment: orgName.trim() 
      });
      await user.save();
      return res.status(201).json({ ok: true, message: "Admin registered. Code: " + adminCode, adminCode });
    } else if (role === "staff") {
      if (!staffCode) return res.status(400).json({ error: "Admin code required for Staff." });

      const admin = await User.findOne({ adminCode: staffCode, role: "admin" });
      if (!admin) return res.status(400).json({ error: "Invalid Admin code." });

      const user = new User({ username, passwordHash, role: "staff", name, email, phone, address, staffCode, isApproved: false });
      await user.save();
      return res.status(201).json({ ok: true, message: "Staff registered. Pending approval." });
    }
    res.status(400).json({ error: "Invalid role." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const setupAdmin = async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "user exists" });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ username, passwordHash: hash, role: "admin", isApproved: true });
  await u.save();
  res.json({ ok: true });
};

export const getTawkConfig = async (req, res) => {
  try {
    const role = req.user.role;
    let propertyId = "";
    let widgetId = "";
    let department = "";

    if (role === "superadmin") {
      const superadmin = await User.findOne({ role: "superadmin" }).lean();
      if (superadmin) {
        propertyId = superadmin.tawkPropertyId || "";
        widgetId = superadmin.tawkWidgetId || "default";
        department = superadmin.tawkDepartment || "";
      }
    } else {
      const orgCode = req.user.adminCode;
      if (!orgCode) return res.status(400).json({ error: "Organization code is missing from authentication token" });

      const admin = await User.findOne({ adminCode: orgCode, role: "admin" }).lean();
      propertyId = admin?.tawkPropertyId || "";
      widgetId = admin?.tawkWidgetId || "";
      department = admin?.tawkDepartment || "";

      // Fallback to superadmin if local admin has not set up chat
      if (!propertyId) {
        const superadmin = await User.findOne({ role: "superadmin" }).lean();
        if (superadmin) {
          propertyId = superadmin.tawkPropertyId || "";
          widgetId = superadmin.tawkWidgetId || "default";
          department = department || superadmin.tawkDepartment || "";
        }
      }
    }

    res.json({
      tawkPropertyId: propertyId,
      tawkWidgetId: widgetId,
      tawkDepartment: department
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveTawkConfig = async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === "superadmin") {
      query = { role: "superadmin" };
    } else if (role === "admin") {
      const orgCode = req.user.adminCode;
      if (!orgCode) return res.status(400).json({ error: "Organization code is missing from authentication token" });
      query = { adminCode: orgCode, role: "admin" };
    } else {
      return res.status(403).json({ error: "Permission denied. Only admins and superadmins can configure chat settings." });
    }

    const { tawkPropertyId, tawkWidgetId, tawkDepartment } = req.body;

    const result = await User.findOneAndUpdate(
      query,
      { 
        tawkPropertyId: (tawkPropertyId || "").trim(), 
        tawkWidgetId: (tawkWidgetId || "default").trim(),
        tawkDepartment: (tawkDepartment || "").trim() 
      },
      { returnDocument: "after" }
    ).lean();

    if (!result) return res.status(404).json({ error: "User configuration not found" });

    res.json({
      ok: true,
      tawkPropertyId: result.tawkPropertyId,
      tawkWidgetId: result.tawkWidgetId,
      tawkDepartment: result.tawkDepartment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPublicTawkConfig = async (req, res) => {
  try {
    const superadmin = await User.findOne({ role: "superadmin" }).lean();
    let propertyId = "";
    let widgetId = "";
    let department = "";

    if (superadmin) {
      propertyId = superadmin.tawkPropertyId || "";
      widgetId = superadmin.tawkWidgetId || "default";
      department = superadmin.tawkDepartment || "";
    }

    res.json({
      tawkPropertyId: propertyId,
      tawkWidgetId: widgetId,
      tawkDepartment: department
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
