import pool from "../db/connection.js";

/**
 * 🔹 전문가가 배정된 시스템 목록 조회
 */
const getAssignedSystems = async (req, res) => {
  const { expertId } = req.query;

  if (!expertId) {
    return res.status(400).json({ message: "전문가 ID가 필요합니다." });
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

    const [results] = await pool.query(query, [expertId]);

    if (results.length === 0) {
      return res.status(200).json([]); // 빈 배열 반환
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("배정된 시스템 조회 실패:", error.message);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

/**
 * 🔹 특정 시스템의 자가진단 결과 조회
 */
const getSystemAssessmentResult = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({ message: "시스템 ID가 필요합니다." });
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

    const [results] = await pool.query(query, [systemId]);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "자가진단 결과를 찾을 수 없습니다." });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    console.error("자가진단 결과 조회 실패:", error.message);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

/**
 * 🔹 자가진단 결과에 피드백 추가
 */
const addFeedback = async (req, res) => {
  const { assessmentId, expertId, feedbackContent } = req.body;

  if (!assessmentId || !expertId || !feedbackContent) {
    return res.status(400).json({ message: "모든 필드를 입력해야 합니다." });
  }

  try {
    const query = `
      INSERT INTO feedback (assessment_result_id, assignment_id, feedback_content)
      VALUES (
        ?, 
        (SELECT id FROM assignment WHERE expert_id = ? AND systems_id = 
         (SELECT system_id FROM assessment_result WHERE id = ?)), 
        ?
      )
      ON DUPLICATE KEY UPDATE feedback_content = VALUES(feedback_content);
    `;

    await pool.query(query, [
      assessmentId,
      expertId,
      assessmentId,
      feedbackContent,
    ]);

    await pool.query(
      `
      UPDATE assessment_result 
      SET feedback_status = '전문가 자문이 반영되었습니다' 
      WHERE id = ?;
    `,
      [assessmentId]
    );

    res.status(200).json({ message: "피드백이 성공적으로 저장되었습니다." });
  } catch (error) {
    console.error("피드백 저장 실패:", error.message);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

/**
 * 🔹 자가진단 결과 피드백 수정
 */
const updateFeedback = async (req, res) => {
  const { assessmentId, expertId, feedbackContent } = req.body;

  if (!assessmentId || !expertId || !feedbackContent) {
    return res.status(400).json({ message: "모든 필드를 입력해야 합니다." });
  }

  try {
    const query = `
      UPDATE feedback 
      SET feedback_content = ? 
      WHERE assessment_result_id = ? 
      AND assignment_id = (
        SELECT id FROM assignment WHERE expert_id = ? 
        AND systems_id = (SELECT system_id FROM assessment_result WHERE id = ?)
      );
    `;

    const [result] = await pool.query(query, [
      feedbackContent,
      assessmentId,
      expertId,
      assessmentId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "피드백을 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "피드백이 성공적으로 수정되었습니다." });
  } catch (error) {
    console.error("피드백 수정 실패:", error.message);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

/**
 * 🔹 기관회원이 등록한 시스템의 자가진단 결과 및 전문가 피드백 조회
 */
const SystemsResult = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "기관회원 ID가 필요합니다." });
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

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "등록된 시스템이 없거나 자가진단 결과가 없습니다." });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("기관회원 시스템 결과 조회 실패:", error.message);
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
};

export {
  getAssignedSystems,
  getSystemAssessmentResult,
  addFeedback,
  updateFeedback,
  SystemsResult,
};
