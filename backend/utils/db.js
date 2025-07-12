import pkg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.PGUSER || process.env.POSTGRES_USER,
  host: process.env.PGHOST || process.env.POSTGRES_HOST,
  database: process.env.PGDATABASE || process.env.POSTGRES_DB,
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
  port: process.env.PGPORT || process.env.POSTGRES_PORT || 5432,
});

export const connectDB = async () => {
  try {
    await pool.connect();
    console.log("Connected to PostgreSQL");
    await initializeTables();
  } catch (err) {
    console.error("PostgreSQL connection error:", err);
    process.exit(1);
  }
};

const initializeTables = async () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const initSQLPath = path.join(__dirname, "..", "init.sql");
    
    const initSQL = fs.readFileSync(initSQLPath, "utf8");
    await pool.query(initSQL);
    console.log("Database tables initialized successfully");
  } catch (err) {
    console.error("Error initializing tables:", err);
  }
};