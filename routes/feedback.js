import pool from "../db/connection.js";

/**
 * 🔹 전문가가 배정된 시스템 목록 조회
 */
const getAssignedSystems = async (req, res) => {
  const { expertId } = req.query;

  if (!expertId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "전문가 ID가 필요합니다.",
    });
  }

  try {
    const query = `
      SELECT 
        s.id AS systems_id, 
        s.name AS system_name, 
        u.institution_name, 
        ar.score, 
        ar.grade, 
        ar.feedback_status
      FROM assignment a
      JOIN systems s ON a.systems_id = s.id
      JOIN User u ON s.user_id = u.id
      LEFT JOIN assessment_result ar ON s.id = ar.systems_id 
        AND ar.completed_at = (
          SELECT MAX(completed_at) FROM assessment_result WHERE systems_id = s.id
        )
      WHERE a.expert_id = ?;
    `;

    console.log("🟡 [getAssignedSystems] Running query:", query);
    console.log("🟡 Expert ID:", expertId);

    const [results] = await pool.query(query, [expertId]);

    if (!results.length) {
      console.warn("⚠️ [getAssignedSystems] No assigned systems found.");
    } else {
      console.log("✅ [getAssignedSystems] Query results:", results);
    }

    res.status(200).json({
      resultCode: "S-1",
      msg: "매칭된 시스템 조회 성공",
      data: results,
    });
  } catch (error) {
    console.error(
      "❌ [getAssignedSystems] 배정된 시스템 조회 실패:",
      error.message
    );
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 정량 피드백 제출
 */
const submitQuantitativeFeedback = async (req, res) => {
  const { systemId, expertId, feedbackResponses } = req.body;

  console.log(
    "📡 [피드백 저장 요청] systemId:",
    systemId,
    "expertId:",
    expertId
  );
  console.log("📝 [저장할 데이터]:", feedbackResponses);

  if (!systemId || !expertId || !Array.isArray(feedbackResponses)) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다.",
    });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const { questionNumber, feedback } of feedbackResponses) {
      await connection.query(
        `INSERT INTO feedback (systems_id, user_id, expert_id, quantitative_response_id, feedback, created_at)
         VALUES (?, ?, ?, 
           (SELECT id FROM quantitative_responses WHERE systems_id = ? AND question_id = ? LIMIT 1),
           ?, NOW())`,
        [systemId, expertId, expertId, systemId, questionNumber, feedback]
      );
    }

    await connection.commit();
    connection.release();

    console.log("✅ [피드백 저장 성공]");
    res.status(200).json({ resultCode: "S-1", msg: "피드백 저장 완료" });
  } catch (error) {
    console.error("❌ [ERROR] 피드백 저장 실패:", error.message);
    res
      .status(500)
      .json({ resultCode: "F-1", msg: "서버 오류 발생", error: error.message });
  }
};

/**
 * 🔹 정성 피드백 제출
 */
const submitQualitativeFeedback = async (req, res) => {
  const { systemId, expertId, feedbackResponses } = req.body;

  if (!systemId || !expertId || !Array.isArray(feedbackResponses)) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다.",
    });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const { questionNumber, feedback } of feedbackResponses) {
      // ✅ 정성 응답 ID 가져오기
      const [responseResult] = await connection.query(
        `SELECT id FROM qualitative_responses 
         WHERE systems_id = ? AND question_id = ? 
         ORDER BY updated_at DESC LIMIT 1`,
        [systemId, questionNumber]
      );

      if (responseResult.length === 0) {
        console.warn(`⚠️ 문항 ${questionNumber}에 대한 응답을 찾을 수 없음.`);
        continue;
      }

      const qualitativeResponseId = responseResult[0].id;

      // ✅ 새로운 피드백 추가
      await connection.query(
        `INSERT INTO feedback (systems_id, user_id, expert_id, qualitative_response_id, feedback, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [systemId, expertId, expertId, qualitativeResponseId, feedback]
      );
    }

    await connection.commit();
    connection.release();

    res.status(200).json({
      resultCode: "S-1",
      msg: "정성 피드백 저장 완료.",
    });
  } catch (error) {
    console.error("❌ [submitQualitativeFeedback] 저장 오류:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 피드백 조회
 */
const getFeedbacks = async (req, res) => {
  const { systemId, questionNumber } = req.query;

  console.log(
    "📡 [API 요청] 피드백 조회 - systemId:",
    systemId,
    "questionNumber:",
    questionNumber
  );

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "System ID가 필요합니다.",
    });
  }

  try {
    const query = `
      SELECT f.id AS feedback_id, f.feedback, f.created_at, 
             qr.question_id AS quantitative_question_id,
             qlr.question_id AS qualitative_question_id,
             e.name AS expert_name
      FROM feedback f
      JOIN expert e ON f.expert_id = e.id
      LEFT JOIN quantitative_responses qr ON f.quantitative_response_id = qr.id
      LEFT JOIN qualitative_responses qlr ON f.qualitative_response_id = qlr.id
      WHERE f.systems_id = ? 
      ORDER BY f.created_at DESC;
    `;

    console.log("🟡 [QUERY 실행] Query:", query);
    console.log("🟡 [QUERY PARAMS] systemId:", systemId);

    const [results] = await pool.query(query, [systemId]);

    console.log("✅ [API 응답] 피드백 데이터:", results);

    res.status(200).json({
      resultCode: "S-1",
      msg: "피드백 조회 성공",
      data: results,
    });
  } catch (error) {
    console.error("❌ [ERROR] 피드백 조회 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 피드백 상태 업데이트
 */
const updateFeedbackStatus = async (req, res) => {
  const { systemId } = req.body;

  console.log("🟡 [updateFeedbackStatus] 요청 수신 - systemId:", systemId);

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID가 필요합니다.",
    });
  }

  const query = `
    UPDATE assessment_result
    SET feedback_status = '전문가 자문이 반영되었습니다'
    WHERE systems_id = ?;
  `;

  try {
    const [result] = await pool.query(query, [systemId]);

    console.log(
      "✅ [updateFeedbackStatus] 업데이트된 행 개수:",
      result.affectedRows
    );

    if (result.affectedRows === 0) {
      console.warn("⚠️ [updateFeedbackStatus] 업데이트된 데이터가 없음.");
      return res.status(404).json({
        resultCode: "F-1",
        msg: "해당 시스템 ID에 대한 결과를 찾을 수 없습니다.",
      });
    }

    res.status(200).json({
      resultCode: "S-1",
      msg: "피드백 상태 업데이트 성공",
    });
  } catch (error) {
    console.error(
      "❌ [updateFeedbackStatus] 피드백 상태 업데이트 실패:",
      error.message
    );
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

const getSystemAssessmentResult = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID가 필요합니다.",
    });
  }

  try {
    const query = `
      SELECT ar.id AS assessment_id, ar.systems_id, ar.user_id, ar.score, 
             ar.grade, ar.feedback_status, ar.completed_at, u.institution_name
      FROM assessment_result ar
      JOIN systems s ON ar.systems_id = s.id
      JOIN User u ON s.user_id = u.id
      WHERE ar.systems_id = ?;
    `;

    const [results] = await pool.query(query, [systemId]);

    if (results.length === 0) {
      return res.status(404).json({
        resultCode: "F-1",
        msg: "자가진단 결과를 찾을 수 없습니다.",
      });
    }

    res.status(200).json({
      resultCode: "S-1",
      msg: "자가진단 결과 조회 성공",
      data: results[0],
    });
  } catch (error) {
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

const SystemsResult = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "기관회원 ID가 필요합니다.",
    });
  }

  try {
    const query = `
      SELECT s.id AS systems_id, s.name AS system_name, 
             ar.score, ar.grade, ar.feedback_status, ar.completed_at,
             f.feedback_content, e.name AS expert_name
      FROM systems s
      LEFT JOIN assessment_result ar ON s.id = ar.systems_id
      LEFT JOIN assignment a ON s.id = a.systems_id
      LEFT JOIN feedback f ON ar.id = f.assessment_result_id
      LEFT JOIN expert e ON a.expert_id = e.id
      WHERE s.user_id = ?;
    `;

    const [results] = await pool.query(query, [userId]);

    res.status(200).json({
      resultCode: "S-1",
      msg: "시스템 결과 조회 성공",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};
const getSystemOwner = async (req, res) => {
  const { systemId } = req.query;

  console.log("✅ [getSystemOwner] Received systemId:", systemId);

  if (!systemId) {
    return res
      .status(400)
      .json({ resultCode: "F-1", msg: "systemId가 필요합니다." });
  }

  try {
    const query = "SELECT user_id FROM systems WHERE id = ?";
    const [result] = await pool.query(query, [systemId]);

    if (result.length === 0) {
      return res
        .status(404)
        .json({ resultCode: "F-2", msg: "해당 시스템을 찾을 수 없습니다." });
    }

    res.status(200).json({
      resultCode: "S-1",
      msg: "기관회원 조회 성공",
      userId: result[0].user_id,
    });
  } catch (error) {
    console.error(
      "❌ [getSystemOwner] 시스템 소유자 조회 실패:",
      error.message
    );
    res
      .status(500)
      .json({ resultCode: "F-1", msg: "서버 오류 발생", error: error.message });
  }
};

// ✅ `SystemsResult` export 추가
export {
  getAssignedSystems,
  submitQuantitativeFeedback,
  submitQualitativeFeedback,
  updateFeedbackStatus,
  getFeedbacks,
  SystemsResult,
  getSystemAssessmentResult,
  getSystemOwner,
};
