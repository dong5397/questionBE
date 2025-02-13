import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import upload from "./routes/upload.js";
import { register, login, logout, getUserInfo } from "./routes/auth.js";
import {
  registerExpert,
  loginExpert,
  logoutExpert,
  getExpertInfo,
  getAllExperts,
} from "./routes/expert.js";
import { postsystem, getsystems, deleteSystem } from "./routes/system.js";
import { sendVerificationCode, verifyCode } from "./routes/email.js";
import {
  handleSelfAssessmentSave,
  getQuantitativeQuestions,
  getQualitativeQuestions,
  submitQuantitativeResponses,
  submitQualitativeResponses,
  getQuantitativeResponses,
  getQualitativeResponses,
  updateQuantitativeQuestion,
  updateQualitativeQuestion,
} from "./routes/selftest.js";
import {
  completeSelfTest,
  getAssessmentResults,
  getAssessmentStatuses,
} from "./routes/result.js";
import {
  getAssignedSystems,
  getSystemAssessmentResult,
  submitQuantitativeFeedback,
  submitQualitativeFeedback,
  SystemsResult,
  updateFeedbackStatus,
  getSystemOwner,
  getFeedbacks,
} from "./routes/feedback.js";
import {
  loginSuperUser,
  matchExpertsToSystem,
  getMatchedExperts,
  getAllSystems,
  logoutSuperUser,
  deleteSystemBySuperUser,
  SupergetQuantitativeQuestions,
  SupergetQualitativeQuestions,
  SupergetQuantitativeResponses,
  SupergetQualitativeResponses,
  getSystemById,
  addQuantitativeQuestion,
  editQuantitativeQuestion,
  deleteQuantitativeQuestion,
  addQualitativeQuestion,
  editQualitativeQuestion,
  deleteQualitativeQuestion,
} from "./routes/superuser.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url); // ✅ 현재 파일 경로 변환
const __dirname = path.dirname(__filename); // ✅ 현재 디렉토리 경로 변환

const app = express();
app.use(express.json()); // 📌 JSON 요청 본문을 해석
app.use(express.urlencoded({ extended: true })); // 📌 URL 인코딩된 데이터 해석

// ✅ 미들웨어 설정
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// ✅ CORS 설정
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ 세션 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3600000, // 1시간
    },
  })
);

// ✅ 인증 미들웨어
const requireAuth = (req, res, next) => {
  if (!req.session?.user && !req.session?.expert && !req.session?.superuser) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
};

// ✅ 슈퍼유저 전용 인증 미들웨어
const requireSuperUser = (req, res, next) => {
  if (!req.session?.superuser) {
    return res.status(403).json({ message: "슈퍼유저 권한이 필요합니다." });
  }
  next();
};

// ✅ 요청 로깅
app.use((req, res, next) => {
  console.log(
    `[${req.method}] ${req.path} - BODY SIZE:`,
    req.headers["content-length"]
  );
  next();
});
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    console.log("❌ 파일이 없습니다.");
    return res.status(400).json({ error: "파일이 없습니다." });
  }

  console.log("✅ 파일 업로드 성공:", req.file.path);

  const imageUrl = `${
    process.env.SERVER_URL || "http://localhost:3000"
  }/uploads/${req.file.filename}`;
  res.json({ url: imageUrl }); // ✅ 클라이언트에 이미지 URL 반환
});

// ✅ 기관회원 라우트
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.get("/user", requireAuth, getUserInfo);

// ✅ 전문가 회원 라우트
app.post("/register/expert", registerExpert);
app.post("/login/expert", loginExpert);
app.post("/logout/expert", logoutExpert);
app.get("/expert", requireAuth, getExpertInfo);
app.get("/all-expert", requireAuth, getAllExperts);

// ✅ 슈퍼유저 라우트
app.post("/login/superuser", loginSuperUser);
app.post("/match-experts", requireSuperUser, matchExpertsToSystem);
app.get("/matched-experts", requireSuperUser, getMatchedExperts);
app.post("/logout/SuperUser", requireSuperUser, logoutSuperUser);
app.delete("/system/superuser/:id", requireSuperUser, deleteSystemBySuperUser);
app.get("/system/:id", requireSuperUser, getSystemById);
app.get(
  "/super/selftest/quantitative",
  requireSuperUser,
  SupergetQuantitativeQuestions
);
app.get(
  "/super/selftest/qualitative",
  requireSuperUser,
  SupergetQualitativeQuestions
);
app.get(
  "/super/selftest/quantitative/responses/systemId/:id",
  requireSuperUser,
  SupergetQuantitativeResponses
);
app.get(
  "/super/selftest/qualitative/responses/systemId/:id",
  requireSuperUser,
  SupergetQualitativeResponses
);

// 정량 문항 API
// ✅ 정량 문항 관리 (슈퍼유저 전용)
app.post(
  "/super/selftest/quantitative/add",
  requireSuperUser,
  addQuantitativeQuestion
);
app.put(
  "/super/selftest/quantitative/put/:id",
  requireSuperUser,
  editQuantitativeQuestion
);
app.delete(
  "/super/selftest/quantitative/del/:id",
  requireSuperUser,
  deleteQuantitativeQuestion
);

// 정성 문항 API
app.post("/super/selftest/qualitative/add", addQualitativeQuestion);
app.put("/super/selftest/qualitative/put/:id", editQualitativeQuestion);
app.delete("/super/selftest/qualitative/del/:id", deleteQualitativeQuestion);

// ✅ 이메일 인증 라우트
app.post("/email/send-verification-code", sendVerificationCode);
app.post("/email/verify-code", verifyCode);

// ✅ 시스템 라우트
app.post("/systems", requireAuth, postsystem);
app.get("/systems", requireAuth, getsystems);
app.get("/all-systems", requireSuperUser, getAllSystems);
app.delete("/system/:id", requireAuth, deleteSystem);

// ✅ 자가진단(자가평가) 라우트
app.post(
  "/user/selftest/quantitative",
  requireAuth,
  submitQuantitativeResponses
);
app.post("/user/selftest/qualitative", requireAuth, submitQualitativeResponses);
app.post("/selftest", requireAuth, handleSelfAssessmentSave);
app.get("/selftest/quantitative", requireAuth, getQuantitativeQuestions);
app.get("/selftest/qualitative", requireAuth, getQualitativeQuestions);
app.get(
  "/selftest/quantitative/responses/:systemId/:userId",
  requireAuth,
  getQuantitativeResponses
);
app.get(
  "/selftest/qualitative/responses/:systemId/:userId",
  requireAuth,
  getQualitativeResponses
);
app.put("/update-quantitative", updateQuantitativeQuestion);
app.put("/update-qualitative", updateQualitativeQuestion);
// ✅ 평가 결과 라우트
app.post("/assessment/complete", requireAuth, completeSelfTest);
app.get("/assessment/result", requireAuth, getAssessmentResults);
app.get("/assessment/status", requireAuth, getAssessmentStatuses);

// ✅ 전문가 관련 라우트
app.get("/assigned-systems", requireAuth, getAssignedSystems);
app.get("/system-result", requireAuth, getSystemAssessmentResult);
app.get("/systems-results", requireAuth, SystemsResult);
app.get("/system-owner", getSystemOwner);

// ✅ 피드백 라우트
app.post(
  "/selftest/quantitative/feedback",
  requireAuth,
  submitQuantitativeFeedback
);
app.post(
  "/selftest/qualitative/feedback",
  requireAuth,
  submitQualitativeFeedback
);
app.post(
  "/selftest/qualitative/update-status",
  requireAuth,
  updateFeedbackStatus
);
app.get("/selftest/feedback", requireAuth, getFeedbacks);

// ✅ 평가 결과 API 라우트
app.post("/assessment/complete", requireAuth, completeSelfTest);
app.get("/assessment/result", requireAuth, getAssessmentResults);
app.get("/assessment/status", requireAuth, getAssessmentStatuses);
// ✅ 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(`서버 에러 발생 [${req.method} ${req.path}]:`, err);
  res
    .status(500)
    .json({ message: "서버 오류가 발생했습니다.", error: err.message });
});

// ✅ 404 에러 처리
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `요청한 경로를 찾을 수 없습니다: ${req.path}` });
});

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
