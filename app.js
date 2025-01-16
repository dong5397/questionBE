import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import { register, login, logout, getUserInfo } from "./routes/auth.js";
import { postsystem, getsystems } from "./routes/system.js";
import { sendVerificationCode, verifyCode } from "./routes/email.js";
import {
  handleQuantitativeSave,
  handleQualitativeSave,
  handleSelfAssessmentSave,
  getQuantitativeData,
  getQualitativeData,
} from "./routes/selftest.js";
import {
  completeSelfTest,
  getAssessmentResults,
  getAssessmentStatuses,
} from "./routes/result.js";
import { registerExpert, loginExpert, logoutExpert } from "./routes/expert.js";

dotenv.config();

const app = express();

// Middleware configuration
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3600000,
    },
  })
);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
};

// Routes
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.get("/user", requireAuth, getUserInfo); // User 정보는 로그인 상태에서만 접근 가능

// Email verification routes
app.post("/email/send-verification-code", sendVerificationCode);
app.post("/email/verify-code", verifyCode);

// Systems routes
app.post("/systems", requireAuth, postsystem);
app.get("/systems", requireAuth, getsystems);

// Self-assessment routes
app.post("/selftest/quantitative", requireAuth, handleQuantitativeSave);
app.post("/selftest/qualitative", requireAuth, handleQualitativeSave);
app.post("/selftest", requireAuth, handleSelfAssessmentSave);
app.get("/selftest/quantitative", requireAuth, getQuantitativeData);
app.get("/selftest/qualitative", requireAuth, getQualitativeData);

// Assessment result routes
app.post("/assessment/complete", requireAuth, completeSelfTest);
app.get("/assessment/result", requireAuth, getAssessmentResults);
app.get("/assessment/status", requireAuth, getAssessmentStatuses);

// 전문가 회원관리 Route
app.post("/register/expert", registerExpert);
app.post("/login/expert", loginExpert);
app.post("/logout/expert", logoutExpert);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("서버 에러 발생:", err);
  res
    .status(500)
    .json({ message: "서버 오류가 발생했습니다.", error: err.message });
});

// Server initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
