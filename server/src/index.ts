import { GameServer } from './server';
import { logger } from './logger';

async function bootstrap() {
  try {
    const server = new GameServer();
    await server.start();
  } catch (error) {
    logger.error('Критическая ошибка при запуске сервера', error);
    process.exit(1);
  }
}

void bootstrap();
