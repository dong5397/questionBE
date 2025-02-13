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

  if (!systemId || !expertId || !Array.isArray(feedbackResponses)) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const { questionNumber, feedback } of feedbackResponses) {
      if (!questionNumber) {
        console.warn("⚠️ [정량] 잘못된 questionNumber:", questionNumber);
        continue;
      }

      // ✅ `question_number`로 `question_id` 찾기
      const [questionResult] = await connection.query(
        `SELECT id FROM quantitative_questions WHERE question_number = ?`,
        [questionNumber]
      );

      if (questionResult.length === 0) {
        console.warn(`⚠️ [정량] ${questionNumber}번 문항이 존재하지 않습니다.`);
        continue;
      }

      const { id: questionId } = questionResult[0];

      // ✅ 정량 응답 조회
      const [responseResult] = await connection.query(
        `SELECT id, user_id 
         FROM quantitative_responses 
         WHERE systems_id = ? AND question_id = ? 
         ORDER BY updated_at DESC LIMIT 1`,
        [systemId, questionId]
      );

      // ✅ 응답 없으면 자동 생성
      let quantitativeResponseId, user_id;
      if (responseResult.length === 0) {
        const [insertResult] = await connection.query(
          `INSERT INTO quantitative_responses 
           (systems_id, user_id, question_id, response) 
           VALUES (?, ?, ?, ?)`,
          [systemId, expertId, questionId, "이행"]
        );
        quantitativeResponseId = insertResult.insertId;
        user_id = expertId;
      } else {
        quantitativeResponseId = responseResult[0].id;
        user_id = responseResult[0].user_id;
      }

      // ✅ 정량 피드백 추가 (created_at 제거)
      await connection.query(
        `INSERT INTO feedback 
         (systems_id, user_id, expert_id, quantitative_response_id, feedback)
         VALUES (?, ?, ?, ?, ?)`,
        [systemId, user_id, expertId, quantitativeResponseId, feedback]
      );

      console.log(`✅ [정량] ${questionNumber}번 피드백 저장 완료`);
    }

    await connection.commit();
    res.status(200).json({ resultCode: "S-1", msg: "정량 피드백 저장 완료" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ [ERROR] 정량 피드백 저장 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * 🔹 정성 피드백 제출 (question_number -> question_id 매핑)
 */
const submitQualitativeFeedback = async (req, res) => {
  const { systemId, expertId, feedbackResponses } = req.body;

  if (!systemId || !expertId || !Array.isArray(feedbackResponses)) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "잘못된 요청 형식입니다.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const { questionNumber, feedback } of feedbackResponses) {
      if (!questionNumber) {
        console.warn("⚠️ [정성] 잘못된 questionNumber:", questionNumber);
        continue;
      }

      // ✅ `question_number`로 `question_id` 찾기
      const [questionResult] = await connection.query(
        `SELECT id FROM qualitative_questions WHERE question_number = ?`,
        [questionNumber]
      );

      if (questionResult.length === 0) {
        console.warn(`⚠️ [정성] ${questionNumber}번 문항이 존재하지 않습니다.`);
        continue;
      }

      const { id: questionId } = questionResult[0];

      // ✅ 정성 응답 조회
      const [responseResult] = await connection.query(
        `SELECT id, user_id FROM qualitative_responses 
         WHERE systems_id = ? AND question_id = ? 
         ORDER BY updated_at DESC LIMIT 1`,
        [systemId, questionId]
      );

      // ✅ 응답 없으면 새로 생성
      let qualitativeResponseId, user_id;
      if (responseResult.length === 0) {
        const [insertResult] = await connection.query(
          `INSERT INTO qualitative_responses 
           (systems_id, user_id, question_id, response) 
           VALUES (?, ?, ?, ?)`,
          [systemId, expertId, questionId, "해당없음"]
        );
        qualitativeResponseId = insertResult.insertId;
        user_id = expertId;
      } else {
        qualitativeResponseId = responseResult[0].id;
        user_id = responseResult[0].user_id;
      }

      // ✅ 정성 피드백 추가 (created_at 제거)
      await connection.query(
        `INSERT INTO feedback 
         (systems_id, user_id, expert_id, qualitative_response_id, feedback)
         VALUES (?, ?, ?, ?, ?)`,
        [systemId, user_id, expertId, qualitativeResponseId, feedback]
      );

      console.log(`✅ [정성] ${questionNumber}번 피드백 저장 완료`);
    }

    await connection.commit();
    res.status(200).json({ resultCode: "S-1", msg: "정성 피드백 저장 완료" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ [ERROR] 정성 피드백 저장 실패:", error.message);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류 발생",
      error: error.message,
    });
  } finally {
    connection.release();
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

  let query = `
  SELECT 
    f.id AS feedback_id, 
    f.feedback, 
    f.created_at, 
    COALESCE(qq.question_number, qlq.question_number) AS question_number,
    e.name AS expert_name,
    CASE 
      WHEN qr.id IS NOT NULL THEN '정량'
      WHEN qlr.id IS NOT NULL THEN '정성'
      ELSE '알 수 없음'
    END AS feedback_type
  FROM feedback f
  JOIN expert e ON f.expert_id = e.id
  LEFT JOIN quantitative_responses qr ON f.quantitative_response_id = qr.id
  LEFT JOIN quantitative_questions qq ON qr.question_id = qq.id
  LEFT JOIN qualitative_responses qlr ON f.qualitative_response_id = qlr.id
  LEFT JOIN qualitative_questions qlq ON qlr.question_id = qlq.id
  WHERE f.systems_id = ?
`;

  const queryParams = [systemId];

  if (questionNumber) {
    query += ` AND COALESCE(qq.question_number, qlq.question_number) = ?`;
    queryParams.push(questionNumber);
  }

  query += ` ORDER BY f.created_at DESC;`;

  console.log("🟡 [QUERY 실행] SQL:", query);
  console.log("🟡 [QUERY PARAMS] Params:", queryParams);

  try {
    const [results] = await pool.query(query, queryParams);

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
