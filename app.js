import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import { register, login, logout, getUserInfo } from "./routes/auth.js";
import { postsystem, getsystems } from "./routes/system.js";

dotenv.config();

const app = express();

// Middleware configuration
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies to be sent
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret", // Use a default if SESSION_SECRET is missing
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 3600000, // 1 hour
    },
  })
);

// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log("세션 상태:", req.session);
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
};

// Routes
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.get("/user", getUserInfo);

// Systems routes
app.post("/systems", requireAuth, postsystem); // 시스템 등록
app.get("/systems", requireAuth, getsystems); // 시스템 목록 조회

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
