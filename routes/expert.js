import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/connection.js"; // DB 연결

const router = express.Router();

// 🔹 전문가 회원가입
const registerExpert = async (req, res) => {
  const {
    email,
    name,
    institution_name,
    ofcps,
    phone_number,
    major_carrea,
    password,
  } = req.body;

  if (
    !email ||
    !name ||
    !institution_name ||
    !ofcps ||
    !phone_number ||
    !password
  ) {
    return res
      .status(400)
      .json({ resultCode: "F-1", msg: "필수 입력 값이 누락되었습니다." });
  }

  try {
    // 이메일 중복 확인
    const [existingUser] = await pool.query(
      "SELECT * FROM expert WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ resultCode: "F-2", msg: "이미 가입된 이메일입니다." });
    }

    // 비밀번호 해싱 후 저장
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO expert (name, institution_name, ofcps, phone_number, email, major_carrea, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        institution_name,
        ofcps,
        phone_number,
        email,
        major_carrea,
        hashedPassword,
      ]
    );

    const [newUser] = await pool.query(
      "SELECT id, name, email FROM expert WHERE email = ?",
      [email]
    );

    res
      .status(201)
      .json({ resultCode: "S-1", msg: "회원가입 성공", data: newUser[0] });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res
      .status(500)
      .json({ resultCode: "F-1", msg: "서버 에러 발생", error: error.message });
  }
};

const loginExpert = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ resultCode: "F-1", msg: "이메일과 비밀번호를 입력해주세요." });
  }

  try {
    console.log("🔍 [EXPERT LOGIN] 로그인 시도 이메일:", email); // ✅ 디버깅 로그 추가
    const [rows] = await pool.query("SELECT * FROM expert WHERE email = ?", [
      email,
    ]);

    if (!rows || rows.length === 0) {
      console.log("⚠️ [EXPERT LOGIN] 이메일을 찾을 수 없음:", email); // ✅ 디버깅 로그 추가
      return res.status(400).json({
        resultCode: "F-2",
        msg: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    const expert = rows[0];
    console.log("✅ [EXPERT LOGIN] 찾은 전문가 데이터:", expert); // ✅ 디버깅 로그 추가

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, expert.password);
    if (!isMatch) {
      console.log("❌ [EXPERT LOGIN] 비밀번호 불일치:", email); // ✅ 디버깅 로그 추가
      return res.status(400).json({
        resultCode: "F-2",
        msg: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    // 세션 저장
    req.session.expert = {
      id: expert.id,
      email: expert.email,
      name: expert.name,
      member_type: "expert",
    };
    console.log("✅ [EXPERT LOGIN] 세션 저장 완료:", req.session.expert); // ✅ 디버깅 로그 추가

    res.status(200).json({
      resultCode: "S-1",
      msg: "로그인 성공",
      data: req.session.expert,
    });
  } catch (error) {
    console.error("❌ [EXPERT LOGIN] 로그인 오류:", error);
    res
      .status(500)
      .json({ resultCode: "F-1", msg: "서버 에러 발생", error: error.message });
  }
};
// 🔹 전문가 로그아웃
const logoutExpert = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ resultCode: "F-1", msg: "로그아웃 실패" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ resultCode: "S-1", msg: "로그아웃 성공" });
  });
};

// 🔹 전문가 정보 가져오기 (로그인 상태 유지)
const getExpertInfo = (req, res) => {
  if (!req.session || !req.session.expert) {
    return res
      .status(401)
      .json({ resultCode: "F-1", msg: "로그인이 필요합니다." });
  }
  res.status(200).json({ resultCode: "S-1", expert: req.session.expert });
};
// 🔹 모든 관리자(전문가) 데이터 가져오기
const getAllExperts = async (req, res) => {
  try {
    const [experts] = await pool.query(
      `SELECT 
          id AS expert_id,
          name AS expert_name,
          institution_name,
          ofcps AS position,
          phone_number,
          email,
          major_carrea AS major_experience
       FROM expert
       ORDER BY id ASC`
    );

    console.log("✅ [DB] 모든 관리자 데이터 조회 성공:", experts);
    res.status(200).json({
      resultCode: "S-1",
      msg: "모든 관리자 데이터를 성공적으로 가져왔습니다.",
      data: experts,
    });
  } catch (error) {
    console.error("❌ [DB] 모든 관리자 데이터 조회 실패:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "관리자 데이터 조회 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

export {
  registerExpert,
  loginExpert,
  logoutExpert,
  getExpertInfo,
  getAllExperts,
};
export default router;
