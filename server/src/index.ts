import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

interface ClientContext {
  id: string;
  socket: WebSocket;
  connectedAt: number;
}

interface OnlineUpdatePayload {
  type: 'online';
  online: number;
  players: Array<{ id: string }>;
}

interface WelcomePayload {
  type: 'welcome';
  id: string;
  online: number;
}

interface ErrorPayload {
  type: 'error';
  code: string;
  message: string;
}

const clients = new Map<string, ClientContext>();

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' } satisfies Record<string, unknown>));
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    const payload = {
      online: clients.size,
      players: Array.from(clients.values()).map(({ id, connectedAt }) => ({
        id,
        connectedAt
      }))
    } satisfies Record<string, unknown>;

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' } satisfies Record<string, unknown>));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, request) => {
  const clientId = randomUUID();
  const context: ClientContext = {
    id: clientId,
    socket,
    connectedAt: Date.now()
  };

  clients.set(clientId, context);
  logger.info({ clientId, remoteAddress: request.socket.remoteAddress }, 'client connected');

  const welcome: WelcomePayload = {
    type: 'welcome',
    id: clientId,
    online: clients.size
  };

  socket.send(JSON.stringify(welcome));
  broadcastOnline();

  socket.on('message', (data) => {
    try {
      const raw = data.toString();
      const parsed = JSON.parse(raw) as { type?: string };

      if (parsed.type === 'hello') {
        logger.debug({ clientId }, 'received hello');
        return;
      }

      const payload: ErrorPayload = {
        type: 'error',
        code: 'UNSUPPORTED_MESSAGE',
        message: 'Message type is not supported yet.'
      };

      socket.send(JSON.stringify(payload));
    } catch (error) {
      logger.warn({ clientId, error }, 'failed to handle message');
      const payload: ErrorPayload = {
        type: 'error',
        code: 'INVALID_JSON',
        message: 'Unable to parse the message payload.'
      };
      socket.send(JSON.stringify(payload));
    }
  });

  socket.on('close', (code) => {
    clients.delete(clientId);
    logger.info({ clientId, code }, 'client disconnected');
    broadcastOnline();
  });

  socket.on('error', (error) => {
    logger.error({ clientId, error }, 'socket error');
  });
});

function broadcastOnline() {
  if (clients.size === 0) {
    return;
  }

  const payload: OnlineUpdatePayload = {
    type: 'online',
    online: clients.size,
    players: Array.from(clients.values()).map(({ id }) => ({ id }))
  };

  const message = JSON.stringify(payload);
  for (const client of clients.values()) {
    client.socket.send(message);
  }

  logger.info({ online: payload.online }, 'broadcasted online update');
}

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'server is listening');
});
