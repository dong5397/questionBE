import bcrypt from "bcrypt";
import pool from "../db/connection.js"; // DB 연결 파일

// 회원가입
const register = async (req, res) => {
  const {
    institution_name,
    institution_address,
    representative_name,
    email,
    password,
    member_type,
    phone,
  } = req.body;

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM User WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO User (institution_name, institution_address, representative_name, email, password, member_type, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        institution_name,
        institution_address,
        representative_name,
        email,
        hashedPassword,
        member_type || "기관회원",
        phone,
      ]
    );

    res.status(201).json({ message: "회원가입 성공!" });
  } catch (err) {
    res.status(500).json({ message: "회원가입 실패", error: err });
  }
};

// 로그인
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 데이터베이스에서 사용자 찾기
    const [rows] = await pool.query("SELECT * FROM User WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // 세션에 사용자 정보 저장
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.member_type, // 데이터베이스 필드에 따라 수정
    };

    // 세션 강제 저장
    req.session.save((err) => {
      if (err) {
        console.error("세션 저장 중 오류:", err);
        return res.status(500).json({ message: "세션 저장 실패" });
      }

      // 로그인 성공
      res.status(200).json({
        message: "로그인 성공!",
        user: { id: user.id, email: user.email, role: user.member_type },
      });
    });
  } catch (err) {
    console.error("로그인 실패:", err);
    res.status(500).json({ message: "로그인 실패", error: err.message });
  }
};

// 로그아웃
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "로그아웃 실패" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "로그아웃 성공!" });
  });
};
// 사용자 정보 가져오기
const getUserInfo = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  res.status(200).json(req.session.user); // 세션에서 사용자 정보 반환
};

export { register, login, logout, getUserInfo };
