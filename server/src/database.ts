import { Pool } from 'pg';
import { config } from './config';
import { logger } from './logger';

export const dbPool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
    })
  : null;

export async function checkDatabaseConnection() {
  if (!config.databaseUrl) {
    logger.warn(
      'Переменная окружения DATABASE_URL не задана. Сервер стартует без подключения к базе данных.'
    );
    return;
  }

  if (!dbPool) {
    throw new Error('Пул подключений к базе данных не инициализирован');
  }

  const client = await dbPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
