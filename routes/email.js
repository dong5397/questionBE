import nodemailer from "nodemailer";
import dotenv from "dotenv";
import pool from "../db/connection.js"; // DB 연결 파일

dotenv.config();

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 인증 코드 생성
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자
};

// 임시 저장소 (실제 사용 시 Redis 권장)
const tempStorage = {};

// 이메일 형식 검증 함수
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// 인증 코드 전송
const sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "이메일 주소가 필요합니다." });
  }

  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ message: "유효한 이메일 주소를 입력해주세요." });
  }

  try {
    // 이메일 중복 확인
    const [existingUser] = await pool.query(
      "SELECT * FROM User WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    // 요청 제한: 1분 내 3회 이상 요청 방지
    if (!tempStorage[email]) {
      tempStorage[email] = { requestCount: 0, lastRequestTime: Date.now() };
    }
    const elapsedTime = Date.now() - tempStorage[email].lastRequestTime;
    if (elapsedTime < 60 * 1000) {
      // 1분 이내 요청
      if (tempStorage[email].requestCount >= 3) {
        return res
          .status(429)
          .json({ message: "너무 많은 요청입니다. 1분 후 다시 시도하세요." });
      }
      tempStorage[email].requestCount++;
    } else {
      // 1분이 지나면 요청 횟수 초기화
      tempStorage[email].requestCount = 1;
      tempStorage[email].lastRequestTime = Date.now();
    }

    const code = generateCode();
    const expiration = Date.now() + 10 * 60 * 1000; // 10분 유효

    // 임시 저장소에 저장
    tempStorage[email] = { code, expiration };

    // 이메일 내용
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "이메일 인증 코드",
      html: `<p>인증 코드: <b>${code}</b></p><p>10분 안에 입력해주세요.</p>`,
    };

    // 이메일 전송
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "인증 코드가 전송되었습니다." });
  } catch (error) {
    console.error("인증 코드 전송 실패:", error.message);
    res
      .status(500)
      .json({ message: "인증 코드 전송 실패", error: error.message });
  }
};

// 인증 코드 검증
const verifyCode = (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res
      .status(400)
      .json({ message: "이메일과 인증 코드가 필요합니다." });
  }

  try {
    const storedCode = tempStorage[email];
    if (!storedCode) {
      return res
        .status(400)
        .json({ message: "인증 코드가 요청되지 않았습니다." });
    }

    // 인증 코드 실패 횟수 확인
    if (!tempStorage[email].attempts) {
      tempStorage[email].attempts = 0;
    }

    if (tempStorage[email].attempts >= 5) {
      return res
        .status(429)
        .json({ message: "너무 많은 시도! 10분 후 다시 시도하세요." });
    }

    // 인증 코드 만료 확인
    if (storedCode.expiration < Date.now()) {
      delete tempStorage[email];
      return res
        .status(400)
        .json({ message: "유효하지 않거나 만료된 인증 코드입니다." });
    }
    // 인증 코드 검증
    if (tempStorage[email].code !== code) {
      tempStorage[email].attempts += 1;
      return res
        .status(400)
        .json({ message: "인증 코드가 일치하지 않습니다." });
    }

    // 인증 성공 후 데이터 삭제
    delete tempStorage[email]; // 인증 완료 후 삭제
    res.status(200).json({ message: "이메일 인증이 완료되었습니다." });
  } catch (error) {
    console.error("인증 코드 검증 실패:", error.message);
    res
      .status(500)
      .json({ message: "인증 코드 검증 실패", error: error.message });
  }
};

export { verifyCode, sendVerificationCode };
