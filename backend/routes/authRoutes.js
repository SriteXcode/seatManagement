import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/setup", authController.setupAdmin);
router.post("/login", authController.login);
router.post("/register", authController.register);

export default router;
