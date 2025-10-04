import crypto from 'crypto';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { GameWorld, SerializedPlayerState } from '../world/gameWorld';
import { HexDirection, isHexDirection } from '../world/hex';

export type ClientContext = {
  id: string;
  socket: WebSocket;
};

type ServerMessage =
  | {
      type: 'world:init';
      payload: {
        self: SerializedPlayerState;
        world: ReturnType<GameWorld['getSnapshot']>;
      };
    }
  | { type: 'world:playerMoved'; payload: { player: SerializedPlayerState } }
  | { type: 'world:playerJoined'; payload: { player: SerializedPlayerState } }
  | { type: 'world:playerLeft'; payload: { playerId: string } }
  | { type: 'world:playerRenamed'; payload: { player: SerializedPlayerState } }
  | { type: 'world:error'; payload: { message: string } };

export class GameWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, ClientContext>();

  constructor(server: Server, private readonly world: GameWorld) {
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', socket => this.handleConnection(socket));
  }

  private handleConnection(socket: WebSocket) {
    const id = crypto.randomUUID();
    const context: ClientContext = { id, socket };
    this.clients.set(id, context);

    const player = this.world.addPlayer(id);
    this.send(context, {
      type: 'world:init',
      payload: {
        self: player,
        world: this.world.getSnapshot(),
      },
    });

    this.broadcastExcept(id, {
      type: 'world:playerJoined',
      payload: { player },
    });

    logger.info(`Клиент ${id} подключен`);

    socket.on('message', data => this.handleMessage(context, data));
    socket.on('close', () => this.handleClose(id));
    socket.on('error', error => logger.error(`Ошибка сокета у клиента ${id}`, error));
  }

  private handleMessage(context: ClientContext, data: RawData) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch (error) {
      logger.warn(`Некорректный JSON от ${context.id}: ${data}`);
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Некорректный формат сообщения' },
      });
      return;
    }

    if (!this.isValidPayload(parsed)) {
      logger.warn(`Некорректное сообщение от ${context.id}: ${data}`);
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Некорректное сообщение' },
      });
      return;
    }

    if (parsed.type === 'player:move') {
      this.handleMove(context, parsed.payload?.direction);
      return;
    }

    if (parsed.type === 'player:setName') {
      this.handleRename(context, parsed.payload?.name);
      return;
    }

    logger.warn(`Неизвестный тип сообщения от ${context.id}: ${parsed.type}`);
    this.send(context, {
      type: 'world:error',
      payload: { message: 'Неизвестный тип сообщения' },
    });
  }

  private isValidPayload(
    message: unknown
  ): message is
    | {
        type: 'player:move';
        payload?: { direction?: unknown };
      }
    | {
        type: 'player:setName';
        payload?: { name?: unknown };
      } {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const typed = message as Record<string, unknown>;
    if (typeof typed.type !== 'string') {
      return false;
    }
    switch (typed.type) {
      case 'player:move':
      case 'player:setName':
        return true;
      default:
        return false;
    }
  }

  private handleMove(context: ClientContext, direction: unknown) {
    if (!isHexDirection(direction)) {
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Неизвестное направление' },
      });
      return;
    }

    const result = this.world.movePlayer(context.id, direction);
    if (!result) {
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Перемещение невозможно' },
      });
      return;
    }

    const message: ServerMessage = {
      type: 'world:playerMoved',
      payload: { player: result },
    };
    this.broadcast(message);
  }

  private handleRename(context: ClientContext, name: unknown) {
    if (typeof name !== 'string') {
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Некорректное имя персонажа' },
      });
      return;
    }

    const result = this.world.setPlayerName(context.id, name);
    if (!result) {
      this.send(context, {
        type: 'world:error',
        payload: { message: 'Изменение имени недоступно' },
      });
      return;
    }

    this.broadcast({
      type: 'world:playerRenamed',
      payload: { player: result },
    });
  }

  private handleClose(id: string) {
    this.clients.delete(id);
    this.world.removePlayer(id);
    this.broadcast({
      type: 'world:playerLeft',
      payload: { playerId: id },
    });
    logger.info(`Клиент ${id} отключен`);
  }

  private broadcast(message: ServerMessage) {
    for (const client of this.clients.values()) {
      this.send(client, message);
    }
  }

  private broadcastExcept(exceptId: string, message: ServerMessage) {
    for (const client of this.clients.values()) {
      if (client.id === exceptId) continue;
      this.send(client, message);
    }
  }

  private send(context: ClientContext, message: ServerMessage) {
    if (context.socket.readyState === context.socket.OPEN) {
      context.socket.send(JSON.stringify(message));
    }
  }
}
