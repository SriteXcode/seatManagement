import express from "express";
import * as aiController from "../controllers/aiController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/suggest", authMiddleware, adminOnly, aiController.getSuggestions);
router.post("/feedback", authMiddleware, adminOnly, aiController.submitFeedback);
router.post("/compare-and-learn", authMiddleware, adminOnly, aiController.compareAndLearn);
router.get("/rules", authMiddleware, adminOnly, aiController.getRules);
router.delete("/rules/:id", authMiddleware, adminOnly, aiController.deleteRule);

export default router;
