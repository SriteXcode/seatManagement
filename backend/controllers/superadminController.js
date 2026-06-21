// controllers/superadminController.js
import Inquiry from "../models/Inquiry.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Room from "../models/Room.js";
import FormConfig from "../models/FormConfig.js";

// Public: Submit inquiry/bug report from landing page
export const submitInquiry = async (req, res) => {
  try {
    const { name, email, type, message } = req.body;
    if (!name || !email || !type || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const inquiry = new Inquiry({ name, email, type, message });
    await inquiry.save();
    res.status(201).json({ ok: true, message: "Your message has been sent successfully!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Superadmin only: List all inquiries
export const listInquiries = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).lean();
    res.json(inquiries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Superadmin only: Toggle resolve status of an inquiry
export const toggleResolveInquiry = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
    inquiry.isResolved = !inquiry.isResolved;
    await inquiry.save();
    res.json(inquiry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Superadmin only: Delete an inquiry
export const deleteInquiry = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    const { id } = req.params;
    const result = await Inquiry.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: "Inquiry not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Superadmin only: List all registered organizations and their statistics
export const listOrganisations = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    
    // Find all users with role "admin"
    const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 }).lean();
    
    // Aggregate stats per admin code
    const orgs = await Promise.all(admins.map(async (admin) => {
      const adminCode = admin.adminCode;
      
      const studentCount = await Student.countDocuments({ orgCode: adminCode });
      const roomCount = await Room.countDocuments({ orgCode: adminCode });
      const staffCount = await User.countDocuments({ staffCode: adminCode, role: "staff" });
      const formCount = await FormConfig.countDocuments({ orgCode: adminCode });
      
      return {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        orgName: admin.orgName || "Unnamed Organisation",
        adminCode,
        createdAt: admin.createdAt,
        studentCount,
        roomCount,
        staffCount,
        formCount
      };
    }));
    
    res.json(orgs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Superadmin only: Get overall system statistics
export const getSystemStats = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    
    const totalOrgs = await User.countDocuments({ role: "admin" });
    const totalStaff = await User.countDocuments({ role: "staff" });
    const totalStudents = await Student.countDocuments();
    const totalRooms = await Room.countDocuments();
    const totalInquiries = await Inquiry.countDocuments();
    const pendingInquiries = await Inquiry.countDocuments({ isResolved: false });
    const resolvedInquiries = await Inquiry.countDocuments({ isResolved: true });
    
    res.json({
      totalOrgs,
      totalStaff,
      totalStudents,
      totalRooms,
      totalInquiries,
      pendingInquiries,
      resolvedInquiries
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
