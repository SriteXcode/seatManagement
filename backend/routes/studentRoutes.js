import express from "express";
import * as studentController from "../controllers/studentController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", studentController.getAll);
router.get("/meta", studentController.getMeta);
router.get("/find", studentController.findByRoll);
router.post("/query", studentController.queryStudents);
router.post("/import-csv", adminOnly, studentController.importCSV);
router.post("/", adminOnly, studentController.addStudent);
router.put("/:id", adminOnly, studentController.updateStudent);
router.delete("/:id", adminOnly, studentController.deleteStudent);

export default router;
