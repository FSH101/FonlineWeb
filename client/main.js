const HEX_SIZE = 12;
const SQRT3 = Math.sqrt(3);

const DIRECTION_VECTORS = {
  east: { q: 1, r: 0 },
  northEast: { q: 1, r: -1 },
  northWest: { q: 0, r: -1 },
  west: { q: -1, r: 0 },
  southWest: { q: -1, r: 1 },
  southEast: { q: 0, r: 1 },
};

const vectorDirectionLookup = new Map(
  Object.entries(DIRECTION_VECTORS).map(([direction, vector]) => [
    `${vector.q}:${vector.r}`,
    direction,
  ])
);

const connectionStatusEl = document.getElementById('connectionStatus');
const chatLogEl = document.getElementById('chatLog');
const chatFormEl = document.getElementById('chatForm');
const chatInputEl = document.getElementById('chatInput');
const commandBarEl = document.getElementById('commandBar');

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
  offsetX: 0,
  offsetY: 0,
};

let socket;

function axialKey(q, r) {
  return `${q}:${r}`;
}

function axialToPixelRaw(q, r) {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
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

function drawHexTile(centerX, centerY, variant = 0) {
  const basePalette = ['#2a2417', '#322a1c', '#3b311f'];
  const overlayPalette = ['#4b4126', '#5a4b2a', '#463c26'];
  const detailPalette = ['#756036', '#7f6a3a', '#6d5731'];
  const idx = Math.abs(variant) % basePalette.length;

  ctx.save();

  hexPath(centerX, centerY, HEX_SIZE);
  ctx.fillStyle = basePalette[idx];
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1a1208';
  ctx.stroke();

  hexPath(centerX, centerY, HEX_SIZE * 0.82);
  ctx.fillStyle = overlayPalette[idx];
  ctx.fill();

  const insetWidth = HEX_SIZE * 0.9;
  const insetHeight = HEX_SIZE * 0.4;
  ctx.fillStyle = detailPalette[idx];
  ctx.globalAlpha = 0.45;
  ctx.fillRect(
    centerX - insetWidth / 2,
    centerY - insetHeight / 2,
    insetWidth,
    insetHeight
  );

  ctx.restore();
}

function drawHighlight(centerX, centerY, color, lineWidth = 2.5) {
  ctx.save();
  hexPath(centerX, centerY, HEX_SIZE * 0.94);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(centerX, centerY, isSelf) {
  const radius = HEX_SIZE * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = isSelf ? '#c0ff56' : '#64a9ff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0d1208';
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
  const padding = HEX_SIZE * 2.5;

  canvas.width = Math.ceil(maxX - minX + padding * 2);
  canvas.height = Math.ceil(maxY - minY + padding * 2);

  const offsetX = padding - minX;
  const offsetY = padding - minY;

  layout.tileCenters.clear();
  layout.orderedTiles = rawPositions.map(({ tile, x, y }) => {
    const centerX = x + offsetX;
    const centerY = y + offsetY;
    layout.tileCenters.set(axialKey(tile.q, tile.r), {
      x: centerX,
      y: centerY,
      tile,
    });
    return { tile, centerX, centerY };
  });

  layout.offsetX = offsetX;
  layout.offsetY = offsetY;
}

function renderWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!layout.orderedTiles.length) {
    return;
  }

  ctx.fillStyle = '#010101';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const { tile, centerX, centerY } of layout.orderedTiles) {
    drawHexTile(centerX, centerY, tile.q - tile.r);
  }

  const self = getSelfPlayer();
  if (self) {
    const key = axialKey(self.position.axial.q, self.position.axial.r);
    const center = layout.tileCenters.get(key);
    if (center) {
      drawHighlight(center.x, center.y, '#89ff3c', 3);
    }
  }

  for (const player of worldState.players.values()) {
    const key = axialKey(player.position.axial.q, player.position.axial.r);
    const center = layout.tileCenters.get(key);
    if (!center) continue;
    drawPlayer(center.x, center.y, player.id === worldState.selfId);
  }
}

function setConnectionStatus(text, variant = 'default') {
  connectionStatusEl.textContent = text;
  connectionStatusEl.dataset.variant = variant;
}

function appendChatMessage(author, text, variant = 'system') {
  if (!chatLogEl) return;
  const item = document.createElement('li');
  item.className = `chat-message chat-message--${variant}`;

  const authorSpan = document.createElement('span');
  authorSpan.className = 'chat-author';
  authorSpan.textContent = `${author}:`;
  item.append(authorSpan);

  const textSpan = document.createElement('span');
  textSpan.className = 'chat-text';
  textSpan.textContent = text;
  item.append(textSpan);

  chatLogEl.append(item);
  while (chatLogEl.children.length > 100) {
    chatLogEl.removeChild(chatLogEl.firstElementChild);
  }
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function addSystemMessage(text) {
  appendChatMessage('Система', text, 'system');
}

function addActionFeedback(action) {
  addSystemMessage(`Действие «${action}» пока не реализовано`);
}

function getSelfPlayer() {
  return worldState.selfId
    ? worldState.players.get(worldState.selfId) ?? null
    : null;
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function pixelToAxial(x, y) {
  const localX = x - layout.offsetX;
  const localY = y - layout.offsetY;

  const q = ((SQRT3 / 3) * localX - (1 / 3) * localY) / HEX_SIZE;
  const r = ((2 / 3) * localY) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q, r) {
  let x = q;
  let z = r;
  let y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

function pickHexFromEvent(event) {
  const { x, y } = pointerToCanvas(event);
  const candidate = pixelToAxial(x, y);
  if (!layout.tileCenters.has(axialKey(candidate.q, candidate.r))) {
    return null;
  }
  return candidate;
}

function axialDeltaToDirection(from, to) {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  if (dq === 0 && dr === 0) {
    return null;
  }
  return vectorDirectionLookup.get(`${dq}:${dr}`) ?? null;
}

function handleCanvasPointerDown(event) {
  const hex = pickHexFromEvent(event);
  if (!hex) {
    return;
  }

  const self = getSelfPlayer();
  if (!self) {
    addSystemMessage('Ожидание соединения с сервером...');
    return;
  }

  const direction = axialDeltaToDirection(self.position.axial, hex);
  if (!direction) {
    addSystemMessage('Можно перемещаться только на соседние гексы');
    return;
  }

  sendMove(direction);
}

function connect() {
  setConnectionStatus('Подключение...', 'default');
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host || 'localhost:8080';
  const url = `${protocol}://${host}`;

  socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    setConnectionStatus('Подключено', 'ok');
    addSystemMessage('Соединение установлено');
  });

  socket.addEventListener('close', () => {
    setConnectionStatus('Отключено', 'error');
    addSystemMessage('Соединение потеряно, попытка переподключения...');
    worldState.players.clear();
    renderWorld();
    setTimeout(connect, 3000);
  });

  socket.addEventListener('error', () => {
    setConnectionStatus('Ошибка подключения', 'error');
    addSystemMessage('Не удалось установить соединение с сервером');
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
      addSystemMessage(
        `Игрок ${message.payload.player.name ?? message.payload.player.id} присоединился`
      );
      break;
    case 'world:playerLeft':
      worldState.players.delete(message.payload.playerId);
      addSystemMessage(`Игрок ${message.payload.playerId} покинул сервер`);
      renderWorld();
      break;
    case 'world:error':
      addSystemMessage(message.payload.message);
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
  addSystemMessage('Вы появились в центре пустоши');
  addSystemMessage('Кликните по соседнему гексу, чтобы переместиться');
}

function updatePlayer(player) {
  worldState.players.set(player.id, player);
  renderWorld();
}

function sendMove(direction) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage('Команда перемещения отклонена: нет соединения');
    return;
  }
  socket.send(
    JSON.stringify({ type: 'player:move', payload: { direction } })
  );
}

window.addEventListener('keydown', event => {
  if (!event.code.startsWith('Key')) return;
  const direction = {
    KeyQ: 'northWest',
    KeyW: 'northEast',
    KeyE: 'east',
    KeyD: 'southEast',
    KeyS: 'southWest',
    KeyA: 'west',
  }[event.code];
  if (!direction) {
    return;
  }
  event.preventDefault();
  sendMove(direction);
});

canvas.addEventListener('pointerdown', handleCanvasPointerDown);

if (chatFormEl && chatInputEl) {
  chatFormEl.addEventListener('submit', event => {
    event.preventDefault();
    const value = chatInputEl.value.trim();
    if (!value) {
      return;
    }
    appendChatMessage('Вы', value, 'self');
    chatInputEl.value = '';
  });
}

if (commandBarEl) {
  commandBarEl.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    if (action) {
      addActionFeedback(button.textContent?.trim() ?? action);
    }
  });
}

window.addEventListener('resize', () => {
  renderWorld();
});

addSystemMessage('Загрузка клиента...');
renderWorld();
connect();
