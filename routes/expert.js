import bcrypt from "bcrypt";
import pool from "../db/connection.js";

const registerExpert = async (req, res) => {
  const {
    email,
    name,
    institution_name,
    ofcps,
    phone_number,
    major_carrea,
    password,
    role,
  } = req.body;

  try {
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "필수 입력 값이 누락되었습니다." });
    }

    const existingExpert = await pool.query(
      "SELECT email FROM expert WHERE email = ?",
      [email]
    );
    if (existingExpert[0].length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO expert (name, institution_name, ofcps, phone_number, email, major_carrea, password, member_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        institution_name,
        ofcps,
        phone_number,
        email,
        major_carrea,
        hashedPassword,
        role,
      ]
    );

    res.status(201).json({ message: "회원가입 성공!" });
  } catch (error) {
    console.error("Error during expert registration:", error);
    res.status(500).json({ message: "서버 에러 발생" });
  }
};

const loginExpert = async (req, res) => {
  const { email, password } = req.body;

  console.log("Login Request Body:", { email, password });

  if (!email || !password) {
    return res
      .status(400)
      .json({ resultCode: "F-1", msg: "이메일과 비밀번호를 입력해주세요." });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM expert WHERE email = ?", [
      email,
    ]);

    console.log("Query Result:", rows);

    if (rows.length === 0) {
      console.log("Email not found in database");
      return res.status(400).json({
        resultCode: "F-2",
        msg: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    const expert = rows[0];
    const isMatch = await bcrypt.compare(password, expert.password);

    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    req.session.expert = {
      id: expert.id,
      email: expert.email,
      name: expert.name,
      role: "expert",
    };

    console.log("Session Data:", req.session.expert);

    // 클라이언트가 예상하는 형식으로 응답
    res.status(200).json({
      resultCode: "S-1",
      msg: "로그인 성공",
      user: req.session.expert, // 클라이언트에서 user로 접근 가능하도록 설정
    });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ resultCode: "F-1", msg: "서버 에러 발생", error: error.message });
  }
};

const logoutExpert = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ resultCode: "F-1", msg: "로그아웃 실패" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ resultCode: "S-1", msg: "로그아웃 성공" });
  });
};

export { registerExpert, loginExpert, logoutExpert };
