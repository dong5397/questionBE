import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import { register, login, logout, getUserInfo } from "./routes/auth.js";
import {
  registerExpert,
  loginExpert,
  logoutExpert,
  getExpertInfo,
} from "./routes/expert.js";
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

import {
  getAssignedSystems,
  getSystemAssessmentResult,
  addFeedback,
  updateFeedback,
  SystemsResult,
} from "./routes/feedback.js";

dotenv.config();

const app = express();

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// CORS 설정
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // 프론트엔드 출처 설정
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // 쿠키 전송 허용
  })
);

// 세션 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret", // 세션 비밀키 설정
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서만 보안 설정
      httpOnly: true,
      maxAge: 3600000, // 1시간
    },
  })
);

// 인증 미들웨어
const requireAuth = (req, res, next) => {
  if (!req.session || (!req.session.user && !req.session.expert)) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
};

// 기관회원 라우트
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.get("/user", requireAuth, getUserInfo); // 로그인 상태에서만 접근 가능

// 전문가 회원관리 라우트
app.post("/register/expert", registerExpert);
app.post("/login/expert", loginExpert);
app.post("/logout/expert", logoutExpert);
app.get("/expert", requireAuth, getExpertInfo); // 🔹 전문가 로그인 상태 확인

// 이메일 인증 라우트
app.post("/email/send-verification-code", sendVerificationCode);
app.post("/email/verify-code", verifyCode);

// 시스템 라우트
app.post("/systems", requireAuth, postsystem);
app.get("/systems", requireAuth, getsystems);

// 자기 평가 라우트
app.post("/selftest/quantitative", requireAuth, handleQuantitativeSave);
app.post("/selftest/qualitative", requireAuth, handleQualitativeSave);
app.post("/selftest", requireAuth, handleSelfAssessmentSave);
app.get("/selftest/quantitative", requireAuth, getQuantitativeData);
app.get("/selftest/qualitative", requireAuth, getQualitativeData);

// 평가 결과 라우트
app.post("/assessment/complete", requireAuth, completeSelfTest);
app.get("/assessment/result", requireAuth, getAssessmentResults);
app.get("/assessment/status", requireAuth, getAssessmentStatuses);

// 전문가회원 관련(배정된시스템 조회, 자가진단 결과 조회, 피드백 추가, 피드백 수정 ) 라우트
app.get("/assigned-systems", getAssignedSystems);
app.get("/system-result", getSystemAssessmentResult);
app.post("/add-feedback", addFeedback);
app.put("/update-feedback", updateFeedback);
app.get("/systems-results", SystemsResult);
// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error("서버 에러 발생:", err);
  res
    .status(500)
    .json({ message: "서버 오류가 발생했습니다.", error: err.message });
});

// 서버 초기화
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
