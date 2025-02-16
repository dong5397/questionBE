import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/connection.js"; // 데이터베이스 연결

const router = express.Router();
/**
 * 🔹 모든 시스템 조회 (슈퍼유저 전용)
 */
const getAllSystems = async (req, res) => {
  try {
    const query = `
      SELECT s.id AS systems_id, s.name AS system_name, u.institution_name, u.email AS user_email
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
/**
 * 🔹 시스템에 매칭된 전문가 조회
 */
const getMatchedExperts = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res
      .status(400)
      .json({ resultCode: "F-1", msg: "시스템 ID가 필요합니다." });
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

    // 🔥 세션 재생성 (세션 ID 변경)
    req.session.regenerate((err) => {
      if (err) {
        console.error("세션 재생성 오류:", err);
        return res.status(500).json({ message: "서버 오류 발생" });
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
    });
  } catch (error) {
    console.error("슈퍼유저 로그인 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 🔹 슈퍼유저 로그아웃
 */
const logoutSuperUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ [LOGOUT SUPERUSER] 로그아웃 실패:", err);
      return res.status(500).json({ message: "로그아웃 실패" });
    }

    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    res.status(200).json({ message: "로그아웃 성공" });
  });
};

/**
 * 🔹 시스템 삭제 (슈퍼유저 전용)
 */
const deleteSystemBySuperUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "시스템 ID가 필요합니다." });
  }

  try {
    await pool.query("DELETE FROM systems WHERE id = ?", [id]);
    res.status(200).json({ message: "시스템 삭제 성공" });
  } catch (error) {
    console.error("❌ 시스템 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 🔹 슈퍼유저용 정량적 질문 조회
 */
const SupergetQuantitativeQuestions = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM quantitative_questions"); // ✅ 테이블명 수정
    res.status(200).json({
      resultCode: "S-1",
      msg: "정량적 질문 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ 정량적 질문 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 슈퍼유저용 정성적 질문 조회
 */
const SupergetQualitativeQuestions = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM qualitative_questions"); // ✅ 테이블명 수정
    res.status(200).json({
      resultCode: "S-1",
      msg: "정성적 질문 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ 정성적 질문 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 슈퍼유저용 정량적 응답 조회
 */
const SupergetQuantitativeResponses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM quantitative_responses");
    res.status(200).json({
      resultCode: "S-1",
      msg: "정량적 응답 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ 정량적 응답 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 슈퍼유저용 정성적 응답 조회
 */
const SupergetQualitativeResponses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM qualitative_responses"); // ✅ 테이블명 수정
    res.status(200).json({
      resultCode: "S-1",
      msg: "정성적 응답 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("❌ 정성적 응답 조회 오류:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 전문가와 시스템 매칭
 */
const matchExpertsToSystem = async (req, res) => {
  const { systemId, expertIds } = req.body;

  if (!systemId || !Array.isArray(expertIds) || expertIds.length === 0) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID와 전문가 ID 목록을 제공해야 합니다.",
    });
  }

  try {
    // ✅ 시스템 ID가 존재하는지 먼저 확인
    const [systemCheck] = await pool.query(
      "SELECT id FROM systems WHERE id = ?",
      [systemId]
    );

    if (systemCheck.length === 0) {
      return res.status(404).json({
        resultCode: "F-2",
        msg: "해당 시스템이 존재하지 않습니다.",
      });
    }

    // ✅ 중복된 전문가 배정 방지
    const existingAssignments = await pool.query(
      "SELECT expert_id FROM assignment WHERE systems_id = ?",
      [systemId]
    );
    const existingExpertIds = new Set(
      existingAssignments.map((row) => row.expert_id)
    );

    const newExpertIds = expertIds.filter((id) => !existingExpertIds.has(id));
    if (newExpertIds.length === 0) {
      return res.status(409).json({
        resultCode: "F-3",
        msg: "이미 배정된 전문가입니다.",
      });
    }

    // ✅ 새로운 전문가 배정
    const values = newExpertIds.map((expertId) => [expertId, systemId, false]);
    await pool.query(
      "INSERT INTO assignment (expert_id, systems_id, feedback_status) VALUES ?",
      [values]
    );

    res.status(200).json({
      resultCode: "S-1",
      msg: "전문가 매칭 성공",
    });
  } catch (error) {
    console.error("❌ [MATCH EXPERTS TO SYSTEM] 매칭 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "매칭 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

const getSystemById = async (req, res) => {
  const { id } = req.params;

  try {
    const [system] = await pool.query(
      `SELECT 
          systems.id AS systems_id,
          systems.name AS system_name,
          systems.purpose,
          systems.min_subjects,
          systems.max_subjects,
          systems.assessment_status,
          User.institution_name,
          User.representative_name
       FROM systems
       INNER JOIN User ON systems.user_id = User.id
       WHERE systems.id = ?`,
      [id]
    );

    if (system.length === 0) {
      return res.status(404).json({ message: "시스템을 찾을 수 없습니다." });
    }

    res.status(200).json(system[0]);
  } catch (err) {
    console.error("❌ [DB] 시스템 상세 조회 실패:", err);
    res.status(500).json({ message: "시스템 조회 중 오류가 발생했습니다." });
  }
};

// POST /superuser/selftest/quantitative
const addQuantitativeQuestion = async (req, res) => {
  const { question_number, question, evaluation_criteria, legal_basis, score } =
    req.body;

  if (!question_number || !question || !evaluation_criteria || !score) {
    return res.status(400).json({ message: "필수 항목이 누락되었습니다." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO quantitative_questions (question_number, question, evaluation_criteria, legal_basis, score) VALUES (?, ?, ?, ?, ?)",
      [
        question_number,
        question,
        evaluation_criteria,
        legal_basis || null,
        score,
      ]
    );

    res
      .status(201)
      .json({ message: "문항이 추가되었습니다.", id: result.insertId });
  } catch (error) {
    console.error("문항 추가 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// PUT /superuser/selftest/quantitative/:id
const editQuantitativeQuestion = async (req, res) => {
  const { id } = req.params;
  const { question_number, question, evaluation_criteria, legal_basis, score } =
    req.body;

  if (!question_number || !question || !evaluation_criteria || !score) {
    return res.status(400).json({ message: "필수 항목이 누락되었습니다." });
  }

  try {
    const [result] = await pool.query(
      "UPDATE quantitative_questions SET question_number = ?, question = ?, evaluation_criteria = ?, legal_basis = ?, score = ? WHERE id = ?",
      [
        question_number,
        question,
        evaluation_criteria,
        legal_basis || null,
        score,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "문항을 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "문항이 수정되었습니다." });
  } catch (error) {
    console.error("문항 수정 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// DELETE /superuser/selftest/quantitative/:id
const deleteQuantitativeQuestion = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM quantitative_questions WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "문항을 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "문항이 삭제되었습니다." });
  } catch (error) {
    console.error("문항 삭제 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// POST /superuser/selftest/qualitative
const addQualitativeQuestion = async (req, res) => {
  const {
    question_number,
    indicator,
    indicator_definition,
    evaluation_criteria,
    reference_info,
  } = req.body;

  // 필수 항목 검증
  if (!question_number || !indicator || !evaluation_criteria) {
    return res.status(400).json({ message: "필수 항목이 누락되었습니다." });
  }

  try {
    // SQL 쿼리로 정성 문항 추가
    const [result] = await pool.query(
      "INSERT INTO qualitative_questions (question_number, indicator, indicator_definition, evaluation_criteria, reference_info) VALUES (?, ?, ?, ?, ?)",
      [
        question_number,
        indicator,
        indicator_definition || null,
        evaluation_criteria,
        reference_info || null,
      ]
    );

    // 문항 추가 완료
    res.status(201).json({
      message: "문항이 추가되었습니다.",
      id: result.insertId, // 새로 추가된 문항의 ID 반환
    });
  } catch (error) {
    console.error("문항 추가 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// PUT /superuser/selftest/qualitative/:id
const editQualitativeQuestion = async (req, res) => {
  const { id } = req.params;
  const {
    question_number,
    indicator,
    indicator_definition,
    evaluation_criteria,
    reference_info,
  } = req.body;

  // 필수 항목 검증
  if (!question_number || !indicator || !evaluation_criteria) {
    return res.status(400).json({ message: "필수 항목이 누락되었습니다." });
  }

  try {
    // SQL 쿼리로 정성 문항 수정
    const [result] = await pool.query(
      "UPDATE qualitative_questions SET question_number = ?, indicator = ?, indicator_definition = ?, evaluation_criteria = ?, reference_info = ? WHERE id = ?",
      [
        question_number || null,
        indicator || null,
        indicator_definition || null,
        evaluation_criteria || null,
        reference_info || null,
        id,
      ]
    );

    // 수정된 문항이 없으면 404 오류
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "문항을 찾을 수 없습니다." });
    }

    // 문항 수정 완료
    res.status(200).json({ message: "문항이 수정되었습니다." });
  } catch (error) {
    console.error("문항 수정 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// DELETE /superuser/selftest/qualitative/:id
const deleteQualitativeQuestion = async (req, res) => {
  const { id } = req.params;

  try {
    // SQL 쿼리로 정성 문항 삭제
    const [result] = await pool.query(
      "DELETE FROM qualitative_questions WHERE id = ?",
      [id]
    );

    // 삭제된 문항이 없으면 404 오류
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "문항을 찾을 수 없습니다." });
    }

    // 문항 삭제 완료
    res.status(200).json({ message: "문항이 삭제되었습니다." });
  } catch (error) {
    console.error("문항 삭제 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export {
  getAllSystems,
  getMatchedExperts,
  loginSuperUser,
  logoutSuperUser,
  getSystemById,
  matchExpertsToSystem,
  deleteSystemBySuperUser,
  SupergetQuantitativeQuestions,
  SupergetQualitativeQuestions,
  SupergetQuantitativeResponses,
  SupergetQualitativeResponses,
  addQuantitativeQuestion,
  editQuantitativeQuestion,
  deleteQuantitativeQuestion,
  addQualitativeQuestion,
  editQualitativeQuestion,
  deleteQualitativeQuestion,
};
