import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import allotmentRoutes from "./routes/allotmentRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import formRoutes from "./routes/formRoutes.js";

dotenv.config();

const app = express();

// Enable trust proxy if running behind a proxy like Nginx/Heroku
app.set("trust proxy", 1);

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window (generous for active dashboard usage)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again after 15 minutes." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit login/register requests per IP to 150
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again after 15 minutes." }
});

// Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json({ limit: "10mb" }));

// Routes
app.use("/auth", authLimiter, authRoutes);

// Cache-Control headers for api GET calls (e.g. cache distinct depts/sems and config for 2s)
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "private, max-age=2");
  } else {
    res.set("Cache-Control", "no-store");
  }
  next();
});

// Global Rate Limiting for other routes
app.use(globalLimiter);

app.use("/students", studentRoutes);
app.use("/rooms", roomRoutes);
app.use("/staff", staffRoutes);
app.use("/library", libraryRoutes);
app.use("/comments", commentRoutes);
app.use("/exam-configs", configRoutes);
app.use("/form-configs", formRoutes);
app.use("/", allotmentRoutes); // Mounted at root for /generate, /allotments, etc.


app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "UP",
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date()
  });
});

app.get("/", (req, res) => res.json({ ok: true, message: "Exam Seat Management API Modularized" }));

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
