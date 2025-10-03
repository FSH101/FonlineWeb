import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT ?? 8080);
const envPublicDir = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : undefined;

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number.isFinite(port) ? port : 8080,
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/fonline',
  publicDir: envPublicDir,
};
