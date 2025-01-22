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
  getAllExperts,
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
  updateQualitativeFeedback,
  updateQuantitativeFeedback,
  SystemsResult,
  updateFeedbackStatus,
} from "./routes/feedback.js";
import {
  loginSuperUser,
  matchExpertsToSystem,
  getMatchedExperts,
  getAllSystems,
} from "./routes/superuser.js";

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
  console.log("세션 상태:", req.session); // 디버깅용 로그 추가
  if (
    !req.session ||
    (!req.session.user && !req.session.expert && !req.session.superuser)
  ) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
};

// 슈퍼유저 전용 인증 미들웨어
const requireSuperUser = (req, res, next) => {
  console.log("슈퍼유저 세션 상태:", req.session?.superuser); // 세션 상태 출력
  if (!req.session?.superuser) {
    return res.status(403).json({ message: "슈퍼유저 권한이 필요합니다." });
  }
  next();
};

// 라우트 정리
// 기관회원 라우트
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.get("/user", requireAuth, getUserInfo);

// 전문가 회원관리 라우트
app.post("/register/expert", registerExpert);
app.post("/login/expert", loginExpert);
app.post("/logout/expert", logoutExpert);
app.get("/expert", requireAuth, getExpertInfo);
app.get("/all-expert", requireAuth, getAllExperts);

// 슈퍼유저 라우트
app.post("/login/superuser", loginSuperUser);
app.post("/match-experts", requireSuperUser, matchExpertsToSystem);
app.get("/matched-experts", requireSuperUser, getMatchedExperts);

// 이메일 인증 라우트
app.post("/email/send-verification-code", sendVerificationCode);
app.post("/email/verify-code", verifyCode);

// 시스템 라우트
app.post("/systems", requireAuth, postsystem);
app.get("/systems", requireAuth, getsystems);
app.get("/all-systems", requireSuperUser, getAllSystems);

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

// 전문가 회원 관련 라우트
app.get("/assigned-systems", requireAuth, getAssignedSystems);
app.get("/system-result", requireAuth, getSystemAssessmentResult);
app.get("/systems-results", requireAuth, SystemsResult);

//피드백
app.post(
  "/selftest/quantitative/feedback",
  requireAuth,
  updateQuantitativeFeedback
);
app.post(
  "/selftest/qualitative/feedback",
  requireAuth,
  updateQualitativeFeedback
);
app.post(
  "/selftest/qualitative/update-status",
  requireAuth,
  updateFeedbackStatus
);

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(`서버 에러 발생 [${req.method} ${req.path}]:`, err);
  res
    .status(500)
    .json({ message: "서버 오류가 발생했습니다.", error: err.message });
});

// 404 에러 처리
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `요청한 경로를 찾을 수 없습니다: ${req.path}` });
});

// 서버 초기화
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
