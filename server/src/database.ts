import { Pool } from 'pg';
import { config } from './config';

export const dbPool = new Pool({
  connectionString: config.databaseUrl
});

export async function checkDatabaseConnection() {
  const client = await dbPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
