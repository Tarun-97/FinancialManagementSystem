import dotenv from "dotenv";
dotenv.config();

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT || 8080),
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGIN: required("CORS_ORIGIN", "http://localhost:5173"),
  DB_HOST: required("DB_HOST", "127.0.0.1"),
  DB_PORT: Number(required("DB_PORT", "3306")),
  DB_USER: required("DB_USER", "root"),
  DB_PASSWORD: required("DB_PASSWORD", "Sudharshan7791"),
  DB_DATABASE: required("DB_DATABASE", "fms")
};
