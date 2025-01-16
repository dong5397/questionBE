import pool from "../db/connection.js";

// Save Data Helper Function
const saveData = async (query, values) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(query, values);
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Self-assessment 저장
const handleSelfAssessmentSave = async (req, res) => {
  const {
    organization,
    userGroup,
    personalInfoSystem,
    memberInfoHomepage,
    externalDataProvision = "없음",
    cctvOperation,
    taskOutsourcing,
    personalInfoDisposal,
    systemId,
  } = req.body;

  const user_id = req.session.user?.id;
  if (!user_id) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  if (!organization || !userGroup || !systemId) {
    return res
      .status(400)
      .json({ message: "필수 입력 항목이 누락되었습니다." });
  }

  try {
    const query = `
      INSERT INTO self_assessment (
        user_id, system_id, organization, user_scale, personal_info_system,
        member_info_homepage, external_data_provision, cctv_operation,
        task_outsourcing, personal_info_disposal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user_id,
      systemId,
      organization,
      userGroup,
      personalInfoSystem,
      memberInfoHomepage,
      externalDataProvision,
      cctvOperation,
      taskOutsourcing,
      personalInfoDisposal,
    ];

    await pool.query(query, values);
    res.status(201).json({ message: "Self-assessment saved successfully." });
  } catch (err) {
    console.error("Self-assessment 저장 실패:", err.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: err.message });
  }
};

const handleQuantitativeSave = async (req, res) => {
  const { quantitativeResponses } = req.body;

  // 필수 데이터 검증
  if (!quantitativeResponses || !Array.isArray(quantitativeResponses)) {
    return res
      .status(400)
      .json({ message: "Invalid quantitative responses format." });
  }

  const query = `
    INSERT INTO quantitative (
      question_number, response, additional_comment, system_id
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      response = VALUES(response),
      additional_comment = VALUES(additional_comment)
  `;

  try {
    for (const response of quantitativeResponses) {
      const {
        questionNumber,
        response: answer,
        additionalComment,
        systemId,
      } = response;

      // 필수 필드 검증
      if (!questionNumber || !answer || !systemId) {
        console.error("Invalid response:", response);
        return res.status(400).json({
          message: "Missing required fields in quantitative response.",
        });
      }

      const values = [
        questionNumber,
        answer,
        additionalComment || null,
        systemId,
      ];

      console.log("Saving quantitative response:", values); // 디버깅 로그
      await saveData(query, values);
    }

    res.status(200).json({ message: "Quantitative data saved successfully." });
  } catch (error) {
    console.error("Error saving quantitative data:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// Save Qualitative Data
const handleQualitativeSave = async (req, res) => {
  const { questionNumber, response, additionalComment, systemId, userId } =
    req.body;

  // 필수 필드 확인
  const missingFields = [];
  if (!questionNumber) missingFields.push("questionNumber");
  if (!systemId) missingFields.push("systemId");
  if (!userId) missingFields.push("userId");
  if (!response && !additionalComment) {
    missingFields.push("response or additionalComment");
  }

  if (missingFields.length > 0) {
    console.error("필수 필드가 누락되었습니다.", missingFields);
    return res.status(400).json({
      message: "필수 필드가 누락되었습니다.",
      missingFields,
    });
  }

  // ENUM 값 검증
  const validResponses = ["자문필요", "해당없음"];
  if (response && !validResponses.includes(response)) {
    console.error("Invalid response value:", response);
    return res.status(400).json({
      message: "Invalid response value.",
      validResponses,
    });
  }

  // `systemId`와 `userId` 숫자 확인
  if (isNaN(systemId) || isNaN(userId)) {
    console.error("Invalid systemId or userId:", { systemId, userId });
    return res.status(400).json({
      message: "Invalid systemId or userId. Both should be numeric.",
    });
  }

  // SQL 쿼리와 값
  const query = `
    INSERT INTO qualitative (
      question_number, response, additional_comment, system_id, user_id
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      response = VALUES(response),
      additional_comment = VALUES(additional_comment)
  `;
  const values = [
    questionNumber || null,
    response || null,
    additionalComment || null,
    systemId,
    userId,
  ];

  // 쿼리 실행
  try {
    console.log("Executing query:", query, "with values:", values);
    await pool.query(query, values);
    res.status(200).json({ message: "정성 설문 저장 성공." });
  } catch (error) {
    console.error("정성 설문 저장 실패:", error.message);
    res.status(500).json({
      message: "서버 오류로 저장에 실패했습니다.",
      error: error.message,
    });
  }
};

// Get Quantitative Data
const getQuantitativeData = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({ message: "System ID is required." });
  }

  const query = `
    SELECT question_number, unit, question, legal_basis, evaluation_criteria,
           reference_info, response, additional_comment, file_upload
    FROM quantitative
    WHERE system_id = ?
  `;

  try {
    const [results] = await pool.query(query, [systemId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching quantitative data:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// Get Qualitative Data
const getQualitativeData = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({ message: "System ID is required." });
  }

  const query = `
    SELECT question_number, indicator, response, additional_comment
    FROM qualitative
    WHERE system_id = ?
  `;

  try {
    const [results] = await pool.query(query, [systemId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching qualitative data:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

export {
  handleSelfAssessmentSave,
  handleQuantitativeSave,
  handleQualitativeSave,
  getQuantitativeData,
  getQualitativeData,
};
