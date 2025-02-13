import pool from "../db/connection.js";

// 점수 및 등급 계산 함수
const calculateAssessmentScore = async (systemId) => {
  console.log("Calculating score for systemId:", systemId);

  // ✅ 변경된 테이블 구조 반영
  const queryQuantitative = `SELECT response FROM quantitative_responses WHERE systems_id = ?`;
  const queryQualitative = `SELECT response FROM qualitative_responses WHERE systems_id = ?`;

  try {
    const [quantitativeResults] = await pool.query(queryQuantitative, [
      systemId,
    ]);
    const [qualitativeResults] = await pool.query(queryQualitative, [systemId]);

    console.log("Quantitative results:", quantitativeResults);
    console.log("Qualitative results:", qualitativeResults);

    let score = 0;

    // ✅ 정량 평가 점수 계산
    quantitativeResults.forEach((item) => {
      if (item.response === "이행") score += 1;
      else if (item.response === "자문필요") score += 0.3;
    });

    // ✅ 정성 평가 점수 계산
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

  console.log(
    "🔄 [DEBUG] completeSelfTest 실행 - systemId:",
    systemId,
    "userId:",
    userId
  );

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [selfAssessmentResult] = await connection.query(
      "SELECT id FROM self_assessment WHERE systems_id = ? AND user_id = ?",
      [systemId, userId]
    );

    if (selfAssessmentResult.length === 0) {
      await connection.rollback();
      console.error("⚠️ [WARNING] self_assessment에 데이터 없음:", {
        systemId,
        userId,
      });
      return res.status(404).json({
        message: "자가진단 입력 데이터가 없습니다.",
      });
    }

    const assessmentId = selfAssessmentResult[0].id;
    console.log("✅ [DEBUG] Retrieved assessment_id:", assessmentId);

    const { score, grade } = await calculateAssessmentScore(systemId);
    console.log("✅ [DEBUG] 계산된 점수 및 등급:", { score, grade });

    const query = `
      INSERT INTO assessment_result (systems_id, user_id, assessment_id, score, feedback_status, completed_at, grade)
      VALUES (?, ?, ?, ?, '전문가 자문이 반영되기전입니다', NOW(), ?)
      ON DUPLICATE KEY UPDATE
      score = VALUES(score),
      feedback_status = VALUES(feedback_status),
      completed_at = VALUES(completed_at),
      grade = VALUES(grade);
    `;

    const values = [systemId, userId, assessmentId, score, grade];
    console.log("📡 [DEBUG] 실행할 쿼리:", query, "params:", values);

    await connection.query(query, values);

    await connection.commit();
    console.log("✅ [DEBUG] 자가진단 결과가 성공적으로 저장됨");

    res.status(200).json({
      message: "자가진단 결과가 성공적으로 저장되었습니다.",
      score,
      grade,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ [ERROR] 자가진단 완료 실패:", error.message);
    res.status(500).json({
      message: "서버 내부 오류 발생",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

const getAssessmentResults = async (req, res) => {
  try {
    const { userId, systemId } = req.query;

    console.log("📡 [DEBUG] 결과 데이터 요청 수신:", { userId, systemId });

    if (!userId || !systemId) {
      return res.status(400).json({ message: "필수 정보가 누락되었습니다." });
    }

    // 🛑 Debug: 쿼리를 실행하기 전에 MySQL 연결 확인
    console.log("📡 [DEBUG] MySQL 연결 확인 중...");

    const query = `
      SELECT * FROM assessment_result
      WHERE user_id = ? AND systems_id = ?
      ORDER BY completed_at DESC
    `;

    console.log("📡 [DEBUG] 실행할 쿼리:", query, "params:", [
      userId,
      systemId,
    ]);

    const [results] = await pool.query(query, [userId, systemId]);

    if (results.length === 0) {
      console.warn("⚠️ [WARNING] 결과 데이터 없음:", { userId, systemId });
      return res.status(404).json({ message: "진단 결과가 없습니다." });
    }

    console.log("✅ [DEBUG] 결과 데이터 반환:", results);
    res.status(200).json(results);
  } catch (error) {
    console.error("❌ [ERROR] 결과 데이터 조회 실패:", error);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

const getAssessmentStatuses = async (req, res) => {
  try {
    const query = `
      SELECT systems_id, COUNT(*) > 0 AS is_completed
      FROM assessment_result
      GROUP BY systems_id
    `;
    const [results] = await pool.query(query);

    // 결과를 객체 형태로 변환
    const statusMap = results.reduce((acc, row) => {
      acc[row.systems_id] = row.is_completed;
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
