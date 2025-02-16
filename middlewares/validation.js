import { body, validationResult } from "express-validator";

// ✅ 입력값 검증 미들웨어
const validateUserInput = [
  body("email")
    .isEmail()
    .withMessage("올바른 이메일 형식을 입력하세요.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8, max: 15 })
    .withMessage("비밀번호는 8~15자여야 합니다.")
    .matches(/[A-Z]/)
    .withMessage("비밀번호에는 최소 하나의 대문자가 포함되어야 합니다.")
    .matches(/[0-9]/)
    .withMessage("비밀번호에는 최소 하나의 숫자가 포함되어야 합니다."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export { validateUserInput };
