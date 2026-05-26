import dotenv from 'dotenv';
import mysql2 from 'mysql2/promise';

dotenv.config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name]?.trim()
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing database environment variables: ${missingEnvVars.join(', ')}`
  );
}

const pool = mysql2.createPool({
  // Keep runtime config in env vars so local and deployed environments boot
  // the same way.
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const pgPool = pool;

export { pool, pgPool };
