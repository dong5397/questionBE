import express from "express";
import pool from "../db/connection.js"; // DB 연결 파일

const router = express.Router();

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
      ON DUPLICATE KEY UPDATE
        organization = VALUES(organization),
        user_scale = VALUES(user_scale),
        personal_info_system = VALUES(personal_info_system),
        member_info_homepage = VALUES(member_info_homepage),
        external_data_provision = VALUES(external_data_provision),
        cctv_operation = VALUES(cctv_operation),
        task_outsourcing = VALUES(task_outsourcing),
        personal_info_disposal = VALUES(personal_info_disposal)
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

// 정량 데이터 저장
const handleQuantitativeSave = async (req, res) => {
  const { quantitativeResponses } = req.body;

  if (!quantitativeResponses || !Array.isArray(quantitativeResponses)) {
    return res
      .status(400)
      .json({ message: "Invalid quantitative responses format." });
  }

  try {
    const query = `
      INSERT INTO quantitative (
        question_number, unit, evaluation_method, score, question,
        legal_basis, criteria_and_references, file_upload, response,
        additional_comment, feedback, system_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        unit = VALUES(unit),
        evaluation_method = VALUES(evaluation_method),
        score = VALUES(score),
        legal_basis = VALUES(legal_basis),
        criteria_and_references = VALUES(criteria_and_references),
        file_upload = VALUES(file_upload),
        response = VALUES(response),
        additional_comment = VALUES(additional_comment),
        feedback = VALUES(feedback)
    `;

    for (const {
      questionNumber,
      unit,
      evaluationMethod,
      score,
      question,
      legalBasis,
      criteriaAndReferences,
      fileUpload,
      response: answer,
      additionalComment,
      feedback,
      systemId,
    } of quantitativeResponses) {
      // 기본값 설정
      await pool.query(query, [
        questionNumber, // 필수
        unit || "단위 없음", // 기본값
        evaluationMethod || "정량평가", // 기본값
        score || 0, // 기본값
        question || "질문 없음", // 기본값
        legalBasis || "근거 법령 없음", // 기본값
        criteriaAndReferences || "평가기준 없음", // 기본값
        fileUpload || null, // 파일 업로드는 null 허용
        answer || "응답 없음", // 기본값
        additionalComment || "추가 의견 없음", // 기본값
        feedback || "피드백 없음", // 기본값
        systemId, // 필수
      ]);
    }

    res
      .status(200)
      .json({ message: "Quantitative responses saved successfully." });
  } catch (error) {
    console.error("Error saving quantitative responses:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

const handleQualitativeSave = async (req, res) => {
  const { qualitativeResponses } = req.body;

  // 데이터 유효성 검사
  if (!qualitativeResponses || !Array.isArray(qualitativeResponses)) {
    return res
      .status(400)
      .json({ message: "Invalid qualitative responses format." });
  }

  try {
    // SQL 쿼리 정의
    const query = `
      INSERT INTO qualitative (
        question_number, response, additional_comment, system_id, user_id, 
        indicator, indicator_definition, evaluation_criteria, reference_info, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        response = VALUES(response),
        additional_comment = VALUES(additional_comment),
        indicator = VALUES(indicator),
        indicator_definition = VALUES(indicator_definition),
        evaluation_criteria = VALUES(evaluation_criteria),
        reference_info = VALUES(reference_info),
        file_path = VALUES(file_path)
    `;

    // 반복적으로 데이터베이스 작업 수행
    for (const {
      questionNumber,
      response,
      additionalComment,
      systemId,
      userId,
      indicator,
      indicatorDefinition,
      evaluationCriteria,
      referenceInfo,
      filePath,
    } of qualitativeResponses) {
      // 데이터 삽입/업데이트
      await pool.query(query, [
        questionNumber,
        response,
        additionalComment || "", // 기본값: 빈 문자열
        systemId,
        userId,
        indicator || "", // 기본값: 빈 문자열
        indicatorDefinition || "", // 기본값: 빈 문자열
        evaluationCriteria || "", // 기본값: 빈 문자열
        referenceInfo || "", // 기본값: 빈 문자열
        filePath || null, // 기본값: null
      ]);
    }

    // 성공 응답
    res
      .status(200)
      .json({ message: "All qualitative responses saved successfully." });
  } catch (error) {
    // 에러 처리
    console.error("Error saving qualitative responses:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// 정량 데이터 가져오기
const getQuantitativeData = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({ message: "System ID is required." });
  }

  try {
    const query = `
      SELECT question_number, unit, evaluation_method, score, question,
             legal_basis, criteria_and_references, file_upload, response,
             additional_comment, feedback
      FROM quantitative
      WHERE system_id = ?
    `;
    const [results] = await pool.query(query, [systemId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching quantitative data:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// 정성 데이터 가져오기
const getQualitativeData = async (req, res) => {
  const { systemId } = req.query;

  if (!systemId) {
    return res.status(400).json({ message: "System ID is required." });
  }

  try {
    const query = `
      SELECT question_number, indicator, indicator_definition, evaluation_criteria,
             reference_info, response, additional_comment, file_path
      FROM qualitative
      WHERE system_id = ?
    `;
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
