import pool from "../db/connection.js";

// 시스템 등록
const postsystem = async (req, res) => {
  const {
    name,
    min_subjects,
    max_subjects,
    purpose,
    is_private,
    is_unique,
    is_resident,
    reason,
  } = req.body;

  const user_id = req.session.user?.id;
  if (!user_id) {
    console.error("❌ [AUTH] 사용자 세션이 없습니다.");
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    console.log("📩 [POST 요청] 데이터:", req.body);
    console.log("🧑‍💻 [POST 요청] 사용자 ID:", user_id);

    // 시스템 개수 제한 확인
    const [systemCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM systems WHERE user_id = ?",
      [user_id]
    );

    console.log("📊 [DB] 현재 시스템 개수:", systemCount[0].count);

    if (systemCount[0].count >= 10) {
      console.warn("⚠️ [LIMIT] 최대 시스템 개수 초과");
      return res
        .status(400)
        .json({ message: "시스템은 최대 10개까지 등록 가능합니다." });
    }

    // 시스템 등록
    const [result] = await pool.query(
      `INSERT INTO systems (user_id, name, min_subjects, max_subjects, purpose, is_private, is_unique, is_resident, reason, assessment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '시작전')`,
      [
        user_id,
        name,
        min_subjects,
        max_subjects,
        purpose,
        is_private === "포함",
        is_unique === "포함",
        is_resident === "포함",
        reason,
      ]
    );

    console.log("✅ [DB] 시스템 등록 성공:", result);
    res.status(201).json({
      message: "시스템 등록이 완료되었습니다.",
      systemId: result.insertId,
    });
  } catch (err) {
    console.error("❌ [DB] 시스템 등록 실패:", err);
    res
      .status(500)
      .json({ message: "시스템 등록 중 오류가 발생했습니다.", error: err });
  }
};

// 등록된 시스템 목록 조회
const getsystems = async (req, res) => {
  if (!req.session.user) {
    console.error("❌ [AUTH] 사용자 세션이 없습니다.");
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const user_id = req.session.user.id;

  try {
    console.log("📩 [GET 요청] 사용자 ID:", user_id);

    const [systems] = await pool.query(
      `SELECT 
          systems.id AS system_id,
          systems.name AS system_name,
          systems.purpose,
          systems.assessment_status,
          User.institution_name,
          User.representative_name
         FROM systems
         INNER JOIN User ON systems.user_id = User.id
         WHERE systems.user_id = ?
         ORDER BY systems.created_at DESC`,
      [user_id]
    );

    console.log("✅ [DB] 시스템 목록 조회 성공:", systems);
    res.status(200).json(systems);
  } catch (err) {
    console.error("❌ [DB] 시스템 목록 조회 실패:", err);
    res.status(500).json({
      message: "시스템 목록 조회 중 오류가 발생했습니다.",
      error: err,
    });
  }
};

export { postsystem, getsystems };
