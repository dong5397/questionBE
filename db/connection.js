import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); // .env 파일에서 환경 변수 로드

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
