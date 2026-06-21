// routes/formRoutes.js
import express from "express";
import * as formController from "../controllers/formController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes for student self-registration
router.get("/public/by-id/:orgCode/:id", formController.getPublicFormConfigById);
router.post("/public/register/by-id/:orgCode/:id", formController.registerStudentPublicById);
router.get("/public/:orgCode/:examType", formController.getPublicFormConfig);
router.post("/public/register/:orgCode/:examType", formController.registerStudentPublic);

// Admin-only management routes
router.get("/", authMiddleware, adminOnly, formController.listFormConfigs);
router.post("/save", authMiddleware, adminOnly, formController.saveFormConfigById);
router.delete("/:id", authMiddleware, adminOnly, formController.deleteFormConfigById);
router.get("/:examType", authMiddleware, adminOnly, formController.getFormConfig);
router.post("/:examType", authMiddleware, adminOnly, formController.saveFormConfig);

export default router;
