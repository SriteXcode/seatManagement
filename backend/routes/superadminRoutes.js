// routes/superadminRoutes.js
import express from "express";
import * as superadminController from "../controllers/superadminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: Submit inquiry/bug report from landing page
router.post("/public/inquiry", superadminController.submitInquiry);

// Superadmin-only dashboard secure routes
router.get("/stats", authMiddleware, superadminController.getSystemStats);
router.get("/organisations", authMiddleware, superadminController.listOrganisations);
router.get("/inquiries", authMiddleware, superadminController.listInquiries);
router.put("/inquiries/:id/resolve", authMiddleware, superadminController.toggleResolveInquiry);
router.delete("/inquiries/:id", authMiddleware, superadminController.deleteInquiry);

export default router;
