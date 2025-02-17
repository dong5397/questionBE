import multer from "multer";
import path from "path";
import fs from "fs";

const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 파일 필터를 다르게 적용할 수 있도록 설정
const getFileFilter = (type) => {
  return (req, file, cb) => {
    let allowedTypes;
    if (type === "image") {
      allowedTypes = ["image/jpeg", "image/png"];
    } else if (type === "document") {
      allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
    } else {
      return cb(new Error("지원하지 않는 파일 형식입니다."), false);
    }

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("지원하지 않는 파일 형식입니다."), false);
    }
  };
};

// 업로드 설정을 동적으로 적용
const getUploadMiddleware = (type) => {
  const uploadDir =
    type === "image" ? "uploads/questions/" : "uploads/responses/";
  createUploadDir(uploadDir);

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: type === "image" ? 5 * 1024 * 1024 : 10 * 1024 * 1024 }, // 이미지 5MB, 문서 10MB 제한
    fileFilter: getFileFilter(type),
  });
};

export { getUploadMiddleware };
