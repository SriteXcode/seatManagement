import express from "express";
import * as libraryController from "../controllers/libraryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", libraryController.getLibrary);
router.post("/", libraryController.addToLibrary);
router.put("/:id", libraryController.updateLibraryItem);
router.delete("/:id", libraryController.deleteLibraryItem);

export default router;
