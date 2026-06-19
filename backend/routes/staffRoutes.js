import express from "express";
import * as staffController from "../controllers/staffController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Invigilator management
router.get("/invigilators", staffController.getInvigilators);
router.post("/invigilators", adminOnly, staffController.addInvigilator);

// Assignments
router.get("/assignments", staffController.getAssignments);
router.post("/assign", adminOnly, staffController.assignInvigilators);

// Staff approval (Self-registration)
router.get("/pending", adminOnly, staffController.getPendingStaff);
router.post("/approve/:id", adminOnly, staffController.approveStaff);

export default router;
