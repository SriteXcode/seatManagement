import express from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/setup", authController.setupAdmin);
router.post("/login", authController.login);
router.post("/register", authController.register);

router.get("/tawk-config/public", authController.getPublicTawkConfig);
router.get("/tawk-config", authMiddleware, authController.getTawkConfig);
router.post("/tawk-config", authMiddleware, authController.saveTawkConfig);

export default router;
