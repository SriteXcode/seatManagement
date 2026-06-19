import express from "express";
import * as allotmentController from "../controllers/allotmentController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/allotments", allotmentController.getAll);
router.get("/schedules", allotmentController.getSchedules);
router.get("/export/csv", allotmentController.exportCSV);
router.get("/export/pdf", allotmentController.exportPDF);
router.get("/export/room-grid", allotmentController.exportRoomGrid);
router.post("/generate", adminOnly, allotmentController.generate);
router.post("/allotments/save-manual", adminOnly, allotmentController.saveManual);

export default router;
