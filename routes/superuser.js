import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/connection.js"; // 데이터베이스 연결

const router = express.Router();

/**
 * 🔹 슈퍼유저 로그인
 */
const loginSuperUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "이메일과 비밀번호를 입력해주세요." });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM SuperUser WHERE email = ?", [
      email,
    ]);
    if (!rows || rows.length === 0) {
      return res
        .status(400)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    const superuser = rows[0];
    const isMatch = password === superuser.password; // 단순 비교로 변경

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    req.session.superuser = {
      id: superuser.id,
      email: superuser.email,
      name: superuser.name,
      member_type: superuser.member_type,
    };

    res.status(200).json({
      message: "로그인 성공",
      data: req.session.superuser,
    });
  } catch (error) {
    console.error("슈퍼유저 로그인 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 🔹 전문가와 시스템 매칭
 */
const matchExpertsToSystem = async (req, res) => {
  const { systemId, expertIds } = req.body;

  console.log("📩 [REQUEST BODY]:", { systemId, expertIds });

  if (
    !systemId ||
    !expertIds ||
    !Array.isArray(expertIds) ||
    expertIds.length === 0
  ) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID와 전문가 ID 리스트를 제공해야 합니다.",
    });
  }

  try {
    // 시스템 ID 유효성 검사
    const [systemCheck] = await pool.query(
      `SELECT id FROM systems WHERE id = ?`,
      [systemId]
    );
    console.log("🔍 [SYSTEM CHECK]:", systemCheck);

    if (systemCheck.length === 0) {
      return res.status(400).json({
        resultCode: "F-1",
        msg: "유효하지 않은 시스템 ID입니다.",
      });
    }

    // 기타 로직...
  } catch (error) {
    console.error("❌ [ERROR]:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 시스템에 매칭된 전문가 조회
 */
const getMatchedExperts = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID를 제공해야 합니다.",
    });
  }

  try {
    const query = `
      SELECT e.id AS expert_id, e.name AS expert_name, e.institution_name, e.email
      FROM assignment a
      JOIN expert e ON a.expert_id = e.id
      WHERE a.systems_id = ?;
    `;

    const [rows] = await pool.query(query, [systemId]);

    res.status(200).json({
      resultCode: "S-1",
      msg: "시스템에 매칭된 전문가 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ [GET MATCHED EXPERTS] 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 모든 시스템 조회 (슈퍼유저 전용)
 */
const getAllSystems = async (req, res) => {
  try {
    const query = `
      SELECT s.id AS system_id, s.name AS system_name, u.institution_name, u.email AS user_email
      FROM systems s
      JOIN User u ON s.user_id = u.id;
    `;

    const [rows] = await pool.query(query);

    res.status(200).json({
      resultCode: "S-1",
      msg: "모든 시스템 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ [GET ALL SYSTEMS] 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

export {
  getAllSystems,
  getMatchedExperts,
  loginSuperUser,
  matchExpertsToSystem,
};
