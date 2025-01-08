import bcrypt from "bcrypt";
import pool from "../db/connection.js"; // .js 확장자를 명시적으로 추가

const register = async (req, res) => {
  const {
    institution_name,
    institution_address,
    representative_name,
    email,
    password,
    member_type, // 기존 role → member_type로 변경
  } = req.body;

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM User WHERE email = ?", // 테이블 이름 수정
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO User 
      (institution_name, institution_address, representative_name, email, password, member_type) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        institution_name,
        institution_address,
        representative_name,
        email,
        hashedPassword,
        member_type || "기관회원", // ENUM 값 중 기본값 설정
      ]
    );

    res.status(201).json({ message: "회원가입 성공!" });
  } catch (err) {
    res.status(500).json({ message: "회원가입 실패", error: err });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  console.log(`[${requestId}] 로그인 요청: `, { email });

  try {
    // 데이터베이스에서 사용자 찾기
    const [rows] = await pool.query("SELECT * FROM user WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      console.log(`[${requestId}] 사용자 없음: 이메일 - ${email}`);
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    const user = rows[0];

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`[${requestId}] 비밀번호 불일치: 이메일 - ${email}`);
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // 세션 설정
    if (req.session) {
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    } else {
      console.error(`[${requestId}] 세션 설정 실패: 세션이 정의되지 않음.`);
      return res
        .status(500)
        .json({ message: "로그인 중 세션 오류가 발생했습니다." });
    }

    // 로그인 성공
    console.log(`[${requestId}] 로그인 성공: 사용자 ID - ${user.id}`);
    res.status(200).json({
      message: "로그인 성공!",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(`[${requestId}] 로그인 실패: `, err);
    res.status(500).json({ message: "로그인 실패", error: err.message });
  }
};

// 로그아웃 함수
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "로그아웃 실패" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "로그아웃 성공!" });
  });
};

export { register, login, logout };
