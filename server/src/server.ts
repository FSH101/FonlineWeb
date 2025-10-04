import http from 'http';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { config } from './config';
import { logger } from './logger';
import { GameWebSocketServer } from './network/websocketServer';
import { ScriptManager } from './scripts/scriptManager';
import { checkDatabaseConnection } from './database';
import { GameWorld } from './world/gameWorld';

export class GameServer {
  private readonly app = express();
  private readonly httpServer = http.createServer(this.app);
  private readonly world = new GameWorld();
  private readonly wsServer: GameWebSocketServer;
  private readonly scriptManager: ScriptManager;
  private readonly publicDir: string | null;

  constructor() {
    this.wsServer = new GameWebSocketServer(this.httpServer, this.world);
    this.publicDir = this.resolvePublicDir();
    this.configureMiddleware();
    const scriptsDir = path.join(process.cwd(), 'game-scripts');
    this.scriptManager = new ScriptManager(scriptsDir);
    this.registerRoutes();
    this.registerStaticFallback();
  }

  private configureMiddleware() {
    this.app.use(express.json());
    if (this.publicDir) {
      logger.info(`Статические файлы обслуживаются из ${this.publicDir}`);
      this.app.use(express.static(this.publicDir));
    } else {
      logger.warn('Каталог со статическими файлами не найден, клиент недоступен');
    }
  }

  private registerRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', time: Date.now() });
    });

    this.app.get('/world', (_req, res) => {
      res.json(this.world.getSnapshot());
    });
  }

  private registerStaticFallback() {
    if (!this.publicDir) {
      return;
    }

    const indexHtmlPath = path.join(this.publicDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      logger.warn(
        `Файл index.html не найден в каталоге ${this.publicDir}, SPA-фоллбек отключён`
      );
      return;
    }

    this.app.get('*', (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  private resolvePublicDir(): string | null {
    const candidates = [
      config.publicDir,
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'client'),
      path.join(process.cwd(), '..', 'public'),
      path.join(process.cwd(), '..', 'client'),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        const stats = fs.statSync(candidate);
        if (stats.isDirectory()) {
          return candidate;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          const description = error instanceof Error ? error.message : String(error);
          logger.warn(
            `Не удалось проверить каталог статических файлов ${candidate}: ${description}`
          );
        }
      }
    }

    return null;
  }

  async start() {
    try {
      await checkDatabaseConnection();
      if (config.databaseUrl) {
        logger.info('Подключение к базе данных успешно установлено');
      } else {
        logger.info('Сервер запущен в режиме без внешней базы данных');
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : String(error);
      logger.error(`Не удалось установить подключение к базе данных: ${description}`, error);

      if (config.requireDatabase) {
        throw error;
      }

      logger.warn('Режим работы без базы данных активирован (REQUIRE_DATABASE=false)');
    }

    await this.scriptManager.loadAll();

    return new Promise<void>(resolve => {
      this.httpServer.listen(config.port, config.host, () => {
        logger.info(`HTTP/WebSocket сервер запущен на ${config.host}:${config.port}`);
        resolve();
      });
    });
  }
}
