import pool from "../db/connection.js";

/**
 * 🔹 전문가가 배정된 시스템 목록 조회
 */
const getAssignedSystems = async (req, res) => {
  const { expertId } = req.query;

  console.log("✅ [getAssignedSystems] Received expertId:", expertId);

  if (!expertId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "전문가 ID가 필요합니다.",
    });
  }

  try {
    const query = `
        SELECT s.id AS system_id, s.name AS system_name, u.institution_name, 
               ar.score, ar.grade, ar.feedback_status
        FROM assignment a
        JOIN systems s ON a.systems_id = s.id
        JOIN User u ON s.user_id = u.id
        LEFT JOIN assessment_result ar ON s.id = ar.system_id
        WHERE a.expert_id = ?;
      `;

    console.log("🟡 [getAssignedSystems] Running query:", query);

    const [results] = await pool.query(query, [expertId]);

    console.log("✅ [getAssignedSystems] Query results:", results);

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
 * 🔹 특정 시스템의 자가진단 결과 조회
 */
const getSystemAssessmentResult = async (req, res) => {
  const { systemId } = req.query;

  console.log("✅ [getSystemAssessmentResult] Received systemId:", systemId);

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID가 필요합니다.",
    });
  }

  try {
    const query = `
      SELECT ar.id AS assessment_id, ar.system_id, ar.user_id, ar.score, 
             ar.grade, ar.feedback_status, ar.completed_at, u.institution_name
      FROM assessment_result ar
      JOIN systems s ON ar.system_id = s.id
      JOIN User u ON s.user_id = u.id
      WHERE ar.system_id = ?;
    `;

    console.log("🟡 [getSystemAssessmentResult] Running query:", query);

    const [results] = await pool.query(query, [systemId]);

    console.log("✅ [getSystemAssessmentResult] Query results:", results);

    if (results.length === 0) {
      console.warn(
        "⚠️ [getSystemAssessmentResult] No results found for systemId:",
        systemId
      );
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
    console.error(
      "❌ [getSystemAssessmentResult] 자가진단 결과 조회 실패:",
      error.message
    );
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
      SELECT s.id AS system_id, s.name AS system_name, 
             ar.score, ar.grade, ar.feedback_status, ar.completed_at,
             f.feedback_content, e.name AS expert_name
      FROM systems s
      LEFT JOIN assessment_result ar ON s.id = ar.system_id
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
    console.error("기관회원 시스템 결과 조회 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};
const updateQuantitativeFeedback = async (req, res) => {
  const { systemId, feedbackResponses } = req.body;

  if (!systemId || !Array.isArray(feedbackResponses)) {
    console.error("Invalid data format:", { systemId, feedbackResponses });
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다. 'systemId' 및 'feedbackResponses'가 필요합니다.",
    });
  }

  console.log("Received systemId:", systemId);
  console.log("Received feedbackResponses:", feedbackResponses);

  try {
    const query = `
      INSERT INTO quantitative (
        question_number, system_id, feedback
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE feedback = VALUES(feedback);
    `;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const { questionNumber, feedback } of feedbackResponses) {
      await connection.query(query, [
        questionNumber,
        systemId,
        feedback || "피드백 없음", // 기본값 설정
      ]);
    }

    await connection.commit();
    connection.release();

    res.status(200).json({
      resultCode: "S-1",
      msg: "정량 피드백 업데이트 성공",
    });
  } catch (error) {
    console.error("Error updating feedback:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

/**
 * 🔹 정성 피드백 업데이트
 */
const updateQualitativeFeedback = async (req, res) => {
  const { systemId, feedbackResponses } = req.body;

  if (!systemId || !feedbackResponses || !Array.isArray(feedbackResponses)) {
    console.error("Invalid request data:", { systemId, feedbackResponses });
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다. 'systemId' 및 'feedbackResponses'가 필요합니다.",
    });
  }

  const connection = await pool.getConnection();

  try {
    const query = `
      UPDATE qualitative
      SET feedback = ?, additional_comment = ?, response = ?
      WHERE question_number = ? AND system_id = ?
    `;

    await connection.beginTransaction();

    for (const response of feedbackResponses) {
      const {
        questionNumber,
        feedback,
        additionalComment,
        response: userResponse,
      } = response;

      if (
        typeof questionNumber !== "number" ||
        typeof feedback !== "string" ||
        typeof additionalComment !== "string" ||
        typeof userResponse !== "string"
      ) {
        console.error("Invalid feedback response:", response);
        throw new Error("피드백 데이터 형식이 잘못되었습니다.");
      }

      await connection.query(query, [
        feedback,
        additionalComment,
        userResponse,
        questionNumber,
        systemId,
      ]);
    }

    console.log("Feedbacks updated successfully for system_id:", systemId);

    // ✅ 전문가 자문 상태 업데이트
    const updateStatusQuery = `
      UPDATE assessment_result
      SET feedback_status = '전문가 자문이 반영되었습니다'
      WHERE system_id = ?
    `;

    const [updateResult] = await connection.query(updateStatusQuery, [
      systemId,
    ]);
    console.log(
      "Feedback status updated:",
      updateResult.affectedRows,
      "rows affected"
    );

    await connection.commit();
    console.log("Transaction committed successfully");

    res.status(200).json({
      resultCode: "S-1",
      msg: "정성 피드백 및 상태 업데이트 성공",
    });
  } catch (error) {
    await connection.rollback();
    console.error("정성 피드백 업데이트 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const updateFeedbackStatus = async (req, res) => {
  const { systemId } = req.body;

  if (!systemId) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "시스템 ID가 필요합니다.",
    });
  }

  const query = `
    UPDATE assessment_result
    SET feedback_status = '전문가 자문이 반영되었습니다'
    WHERE system_id = ?
  `;

  try {
    const [result] = await pool.query(query, [systemId]);
    console.log(`Feedback status updated:`, result);
    if (result.affectedRows === 0) {
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
    console.error("Error updating feedback status:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  }
};

export {
  getAssignedSystems,
  getSystemAssessmentResult,
  SystemsResult,
  updateQuantitativeFeedback,
  updateQualitativeFeedback,
  updateFeedbackStatus,
};
