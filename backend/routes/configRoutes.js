import express from "express";
import * as configController from "../controllers/configController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", configController.getConfigs);
router.post("/", adminOnly, configController.saveConfig);
router.delete("/:examType", adminOnly, configController.deleteConfig);

export default router;
