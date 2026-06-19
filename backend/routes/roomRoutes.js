import express from "express";
import * as roomController from "../controllers/roomController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", roomController.getAll);
router.get("/schedules", roomController.getSchedules);
router.post("/", adminOnly, roomController.addRoom);
router.put("/:id", adminOnly, roomController.updateRoom);
router.delete("/:id", adminOnly, roomController.deleteRoom);

export default router;
