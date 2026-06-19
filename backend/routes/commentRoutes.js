import express from "express";
import * as commentController from "../controllers/commentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", commentController.getComments);
router.post("/", commentController.addComment);

export default router;
