import express from "express";
import * as allotmentController from "../controllers/allotmentController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/allotments", authMiddleware, allotmentController.getAll);
router.get("/schedules", authMiddleware, allotmentController.getSchedules);
router.get("/export/csv", authMiddleware, allotmentController.exportCSV);
router.get("/export/pdf", authMiddleware, allotmentController.exportPDF);
router.get("/export/room-grid", authMiddleware, allotmentController.exportRoomGrid);
router.post("/generate", authMiddleware, adminOnly, allotmentController.generate);
router.post("/allotments/save-manual", authMiddleware, adminOnly, allotmentController.saveManual);

export default router;
