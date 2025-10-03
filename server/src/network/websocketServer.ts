import crypto from 'crypto';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';

export type ClientContext = {
  id: string;
  socket: WebSocket;
};

export class GameWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, ClientContext>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', socket => this.handleConnection(socket));
  }

  private handleConnection(socket: WebSocket) {
    const id = crypto.randomUUID();
    const context: ClientContext = { id, socket };
    this.clients.set(id, context);

    logger.info(`Клиент ${id} подключен`);

    socket.on('message', data => this.handleMessage(context, data));
    socket.on('close', () => this.handleClose(id));
    socket.on('error', error => logger.error(`Ошибка сокета у клиента ${id}`, error));
  }

  private handleMessage(context: ClientContext, data: RawData) {
    logger.info(`Получено сообщение от ${context.id}: ${data}`);
    context.socket.send(JSON.stringify({ type: 'echo', payload: data.toString() }));
  }

  private handleClose(id: string) {
    this.clients.delete(id);
    logger.info(`Клиент ${id} отключен`);
  }
}
