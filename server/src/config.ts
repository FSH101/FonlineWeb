import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT ?? 8080);

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number.isFinite(port) ? port : 8080,
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/fonline'
};
