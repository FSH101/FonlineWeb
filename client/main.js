const HEX_SIZE = 12;
const KEY_DIRECTION = {
  KeyQ: 'northWest',
  KeyW: 'northEast',
  KeyE: 'east',
  KeyD: 'southEast',
  KeyS: 'southWest',
  KeyA: 'west',
};

const connectionStatusEl = document.getElementById('connectionStatus');
const positionStatusEl = document.getElementById('positionStatus');
const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');

const worldState = {
  grid: null,
  players: new Map(),
  selfId: null,
};

const layout = {
  tileCenters: new Map(),
  orderedTiles: [],
};

let socket;

function axialToPixelRaw(q, r) {
  const sqrt3 = Math.sqrt(3);
  return {
    x: HEX_SIZE * sqrt3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r,
  };
}

function hexPath(centerX, centerY, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function drawHexTile(centerX, centerY) {
  ctx.save();

  hexPath(centerX, centerY, HEX_SIZE);
  ctx.fillStyle = '#1b2bff';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#04040c';
  ctx.stroke();

  hexPath(centerX, centerY, HEX_SIZE * 0.74);
  ctx.fillStyle = '#e7927f';
  ctx.fill();

  const insetHeight = HEX_SIZE * 0.65;
  const insetWidth = HEX_SIZE * 0.9;
  ctx.fillStyle = '#c77865';
  ctx.fillRect(
    centerX - insetWidth / 2,
    centerY - insetHeight / 2,
    insetWidth,
    insetHeight * 0.55
  );

  const portalWidth = HEX_SIZE * 0.6;
  const portalHeight = HEX_SIZE * 0.6;
  ctx.fillStyle = '#36ff44';
  ctx.fillRect(
    centerX - portalWidth / 2,
    centerY - portalHeight / 2 + insetHeight * 0.1,
    portalWidth,
    portalHeight
  );

  ctx.restore();
}

function drawPlayer(centerX, centerY, isSelf) {
  const radius = HEX_SIZE * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = isSelf ? '#fff43a' : '#ff5622';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#111';
  ctx.stroke();
  ctx.restore();
}

function computeLayout(grid) {
  const rawPositions = grid.tiles.map(tile => ({
    tile,
    ...axialToPixelRaw(tile.q, tile.r),
  }));
  const minX = Math.min(...rawPositions.map(p => p.x));
  const maxX = Math.max(...rawPositions.map(p => p.x));
  const minY = Math.min(...rawPositions.map(p => p.y));
  const maxY = Math.max(...rawPositions.map(p => p.y));
  const padding = HEX_SIZE * 2;

  canvas.width = Math.ceil(maxX - minX + padding * 2);
  canvas.height = Math.ceil(maxY - minY + padding * 2);

  const offsetX = padding - minX;
  const offsetY = padding - minY;

  layout.tileCenters.clear();
  layout.orderedTiles = rawPositions.map(({ tile, x, y }) => {
    const centerX = x + offsetX;
    const centerY = y + offsetY;
    layout.tileCenters.set(`${tile.q}:${tile.r}`, { x: centerX, y: centerY, tile });
    return { tile, centerX, centerY };
  });
}

function renderWorld() {
  if (!layout.orderedTiles.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const { centerX, centerY } of layout.orderedTiles) {
    drawHexTile(centerX, centerY);
  }

  for (const player of worldState.players.values()) {
    const center = layout.tileCenters.get(
      `${player.position.axial.q}:${player.position.axial.r}`
    );
    if (!center) continue;
    drawPlayer(center.x, center.y, player.id === worldState.selfId);
  }
}

function updatePositionStatus() {
  const self = worldState.selfId
    ? worldState.players.get(worldState.selfId)
    : undefined;
  if (!self) {
    positionStatusEl.textContent = 'q: -, r: -';
    return;
  }
  positionStatusEl.textContent = `q: ${self.position.axial.q}, r: ${self.position.axial.r}`;
}

function setConnectionStatus(text, variant = 'default') {
  connectionStatusEl.textContent = text;
  connectionStatusEl.dataset.variant = variant;
}

function connect() {
  setConnectionStatus('Подключение...', 'default');
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host || 'localhost:8080';
  const url = `${protocol}://${host}`;

  socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    setConnectionStatus('Подключено', 'ok');
  });

  socket.addEventListener('close', () => {
    setConnectionStatus('Отключено', 'error');
    worldState.players.clear();
    renderWorld();
    updatePositionStatus();
    setTimeout(connect, 3000);
  });

  socket.addEventListener('error', () => {
    setConnectionStatus('Ошибка подключения', 'error');
  });

  socket.addEventListener('message', event => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error('Ошибка обработки сообщения сервера', error);
    }
  });
}

function handleServerMessage(message) {
  switch (message.type) {
    case 'world:init':
      handleInit(message.payload);
      break;
    case 'world:playerMoved':
    case 'world:playerRenamed':
      updatePlayer(message.payload.player);
      break;
    case 'world:playerJoined':
      updatePlayer(message.payload.player);
      break;
    case 'world:playerLeft':
      worldState.players.delete(message.payload.playerId);
      renderWorld();
      updatePositionStatus();
      break;
    case 'world:error':
      console.warn('Серверное предупреждение:', message.payload.message);
      break;
    default:
      console.warn('Неизвестное сообщение от сервера', message);
  }
}

function handleInit(payload) {
  worldState.selfId = payload.self.id;
  worldState.grid = payload.world.grid;
  worldState.players.clear();
  for (const player of payload.world.players) {
    worldState.players.set(player.id, player);
  }
  computeLayout(worldState.grid);
  renderWorld();
  updatePositionStatus();
}

function updatePlayer(player) {
  worldState.players.set(player.id, player);
  renderWorld();
  updatePositionStatus();
}

function sendMove(direction) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(
    JSON.stringify({ type: 'player:move', payload: { direction } })
  );
}

window.addEventListener('keydown', event => {
  const direction = KEY_DIRECTION[event.code];
  if (!direction) {
    return;
  }
  event.preventDefault();
  sendMove(direction);
});

connect();
