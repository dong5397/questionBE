import pool from "../db/connection.js";

// 점수 및 등급 계산 함수
const calculateAssessmentScore = async (systemId) => {
  console.log("Calculating score for systemId:", systemId);

  const queryQuantitative = `SELECT response FROM quantitative WHERE system_id = ?`;
  const queryQualitative = `SELECT response FROM qualitative WHERE system_id = ?`;

  try {
    const [quantitativeResults] = await pool.query(queryQuantitative, [
      systemId,
    ]);
    const [qualitativeResults] = await pool.query(queryQualitative, [systemId]);

    console.log("Quantitative results:", quantitativeResults);
    console.log("Qualitative results:", qualitativeResults);

    let score = 0;

    quantitativeResults.forEach((item) => {
      if (item.response === "이행") score += 1;
      else if (item.response === "자문 필요") score += 0.3;
    });

    qualitativeResults.forEach((item) => {
      if (item.response === "자문필요") score += 0.3;
    });

    console.log("Calculated score:", score);

    let grade = "D";
    if (score >= 80) grade = "S";
    else if (score >= 60) grade = "A";
    else if (score >= 40) grade = "B";
    else if (score >= 20) grade = "C";

    console.log("Calculated grade:", grade);

    return { score, grade };
  } catch (error) {
    console.error("점수 계산 실패:", error.message);
    throw error;
  }
};

// 자가진단 완료 처리
const completeSelfTest = async (req, res) => {
  const { systemId, userId } = req.body;

  if (!systemId || !userId) {
    return res.status(400).json({
      message: "유효하지 않은 요청입니다. systemId와 userId를 확인하세요.",
    });
  }

  try {
    // Step 1: Verify if self_assessment exists for the system and user
    const [selfAssessment] = await pool.query(
      "SELECT id FROM self_assessment WHERE system_id = ? AND user_id = ?",
      [systemId, userId]
    );

    if (selfAssessment.length === 0) {
      return res.status(400).json({
        message: "해당 systemId 및 userId에 대한 self_assessment가 없습니다.",
      });
    }

    const assessmentId = selfAssessment[0].id;

    // Step 2: Calculate the score and grade
    const { score, grade } = await calculateAssessmentScore(systemId);

    // Step 3: Insert or update assessment_result
    const query = `
          INSERT INTO assessment_result (system_id, user_id, assessment_id, score, feedback_status, grade)
          VALUES (?, ?, ?, ?, '전문가 자문이 반영되기전입니다', ?)
          ON DUPLICATE KEY UPDATE
              score = VALUES(score),
              grade = VALUES(grade),
              feedback_status = '전문가 자문이 반영되기전입니다'
      `;
    const values = [systemId, userId, assessmentId, score, grade];

    await pool.query(query, values);

    res.status(200).json({
      message: "자가진단 결과가 성공적으로 저장되었습니다.",
      score,
      grade,
    });
  } catch (error) {
    console.error("자가진단 완료 실패:", error.message);
    res.status(500).json({
      message: "서버 내부 오류 발생",
      error: error.message,
    });
  }
};

// 결과 조회 처리
const getAssessmentResults = async (req, res) => {
  const { userId, systemId } = req.query;

  console.log("Received query parameters:", { userId, systemId });

  if (!userId || !systemId) {
    return res.status(400).json({
      message: "유효하지 않은 요청입니다. userId와 systemId를 확인하세요.",
    });
  }

  const query = `
    SELECT ar.id, ar.system_id, ar.score, ar.feedback_status, ar.grade, ar.completed_at,
           s.name AS system_name
    FROM assessment_result ar
    JOIN systems s ON ar.system_id = s.id
    WHERE ar.user_id = ? AND ar.system_id = ?
  `;
  const values = [userId, systemId];

  try {
    const [results] = await pool.query(query, values);

    console.log("Query results:", results);

    if (results.length === 0) {
      return res.status(404).json({
        message: "결과가 존재하지 않습니다.",
      });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching assessment results:", error.message);
    res.status(500).json({
      message: "서버 내부 오류 발생",
      error: error.message,
    });
  }
};
const getAssessmentStatuses = async (req, res) => {
  try {
    const query = `
      SELECT system_id, COUNT(*) > 0 AS is_completed
      FROM assessment_result
      GROUP BY system_id
    `;
    const [results] = await pool.query(query);

    // 결과를 객체 형태로 변환
    const statusMap = results.reduce((acc, row) => {
      acc[row.system_id] = row.is_completed;
      return acc;
    }, {});

    res.status(200).json(statusMap);
  } catch (error) {
    console.error("진단 상태 조회 실패:", error.message);
    res.status(500).json({
      message: "서버 오류로 진단 상태를 가져오지 못했습니다.",
      error: error.message,
    });
  }
};
export { completeSelfTest, getAssessmentResults, getAssessmentStatuses };
