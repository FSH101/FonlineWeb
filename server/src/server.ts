import http from 'http';
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

  constructor() {
    this.wsServer = new GameWebSocketServer(this.httpServer, this.world);
    this.configureMiddleware();
    const scriptsDir = path.join(process.cwd(), 'game-scripts');
    this.scriptManager = new ScriptManager(scriptsDir);
    this.registerRoutes();
  }

  private configureMiddleware() {
    this.app.use(express.json());
  }

  private registerRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', time: Date.now() });
    });

    this.app.get('/world', (_req, res) => {
      res.json(this.world.getSnapshot());
    });
  }

  async start() {
    await checkDatabaseConnection();
    logger.info('Подключение к базе данных успешно установлено');

    await this.scriptManager.loadAll();

    return new Promise<void>(resolve => {
      this.httpServer.listen(config.port, config.host, () => {
        logger.info(`HTTP/WebSocket сервер запущен на ${config.host}:${config.port}`);
        resolve();
      });
    });
  }
}
