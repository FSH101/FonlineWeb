import { loadUiConfig } from './ui/configLoader.js';

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
const chatSendButtonEl = chatFormEl?.querySelector('button[type="submit"]') ?? null;
const commandBarEl = document.getElementById('commandBar');
const commandButtonsContainer =
  commandBarEl?.querySelector('[data-role="command-buttons"]') ?? null;
const commandBarTitleEl = commandBarEl?.querySelector('.panel__title') ?? null;
const hudTitleEl = document.querySelector('.hud-top__title');
const chatTitleEl = document.querySelector('.chat .panel__title');
const overlayLayerEl = document.getElementById('overlayLayer');

let overlayPanels = new Map();
let activeOverlay = null;

const actions = new Map();
const actionHotkeys = new Map();

const fallbackUiConfig = {
  Meta: {
    Title: 'Fonline Web — прототип интерфейса',
    Subtitle: 'Тестовый стенд HUD',
  },
  HUD: {
    Padding: '24',
    BottomGap: '18',
    OverlayWidth: '520',
    OverlayMaxHeight: '420',
  },
  Chat: {
    Title: 'Чат',
    Width: '640',
    MaxHeight: '260',
    InputHeight: '48',
    Placeholder: 'Напишите сообщение...',
    SendLabel: 'Отправить',
  },
  CommandBar: {
    Title: 'Действия',
    Width: '320',
    ButtonHeight: '48',
    ButtonSpacing: '12',
    Buttons: 'inventory, map, settings, character, equipment',
  },
  Action: {
    inventory: {
      Label: 'Инвентарь',
      Panel: 'inventory',
      Hotkey: 'KeyI',
      Feedback: 'Инвентарь пока пуст — наполните его предметами из прототипа.',
    },
    map: {
      Label: 'Карта',
      Panel: 'map',
      Hotkey: 'KeyM',
      Feedback: 'Карта будет доступна после интеграции глобальной карты.',
    },
    settings: {
      Label: 'Настройки',
      Panel: 'settings',
      Hotkey: 'KeyO',
      Feedback: 'Настройки появятся, когда подключим управление и звук.',
    },
    character: {
      Label: 'Персонаж',
      Panel: 'character',
      Hotkey: 'KeyC',
      Feedback: 'Характеристика героя появится после интеграции данных с сервера.',
    },
    equipment: {
      Label: 'Экипировка',
      Panel: 'equipment',
      Hotkey: 'KeyP',
      Feedback: 'Окно экипировки будет активно при появлении предметов.',
    },
  },
  Overlay: {
    inventory: {
      Title: 'Инвентарь',
      Description:
        'Здесь будет список предметов и управление экипировкой персонажа.',
      Notes:
        'Перетащите сюда предметы, чтобы экипировать героя; Поддержка категорий добавится позже.',
    },
    map: {
      Title: 'Карта',
      Description: 'Заготовка для отображения глобальной и локальной карт мира.',
      Notes:
        'Запланировано масштабирование и фильтры уровней; Интеграция с серверными инстансами локаций в процессе.',
    },
    settings: {
      Title: 'Настройки',
      Description: 'Позже здесь появятся параметры графики, управления и звука.',
      Notes:
        'Добавим переключатели качества и громкости; Управление горячими клавишами будет редактируемым.',
    },
    character: {
      Title: 'Персонаж',
      Description: 'Здесь появятся характеристики, навыки и активные эффекты героя.',
      Notes:
        'Отображение S.P.E.C.I.A.L. и перков в разработке; Будет добавлена панель состояний и травм.',
    },
    equipment: {
      Title: 'Экипировка',
      Description:
        'Планируется управление слотами брони, оружия и быстрого доступа.',
      Notes:
        'Поддержка быстрого доступа к предметам; Виджет прочности и состояния экипировки.',
    },
  },
};

let uiConfig = null;

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = deepClone(val);
      return acc;
    }, {});
  }
  return value;
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

function mergeConfigs(base, override) {
  const result = deepClone(base);
  if (override) {
    deepMerge(result, override);
  }
  return result;
}

function parseList(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return String(value)
    .split(/[,;\n]/)
    .flatMap(part => part.split(' '))
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeDimension(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    return `${str}px`;
  }
  return str;
}

function setCssVariable(name, value) {
  const normalized = normalizeDimension(value);
  if (!normalized) {
    return;
  }
  document.documentElement.style.setProperty(name, normalized);
}

function registerActions(config) {
  actions.clear();
  actionHotkeys.clear();

  const actionSections = config?.Action ?? {};
  Object.entries(actionSections).forEach(([rawKey, definition]) => {
    if (!definition || typeof definition !== 'object') {
      return;
    }
    const key = rawKey.trim();
    if (!key) {
      return;
    }

    const label = definition.Label ?? definition.label ?? key;
    const hotkey = (definition.Hotkey ?? definition.hotkey ?? '').trim();
    const panelValue =
      definition.Panel ?? definition.panel ?? definition.Target ?? definition.target ?? '';
    const panel = panelValue && typeof panelValue === 'string' ? panelValue.trim() : '';
    const feedback = definition.Feedback ?? definition.feedback ?? '';
    const description = definition.Description ?? definition.description ?? '';

    const entry = {
      key,
      label,
      panel: panel || null,
      hotkey: hotkey || null,
      feedback,
      description,
    };
    actions.set(key, entry);
    if (entry.hotkey) {
      actionHotkeys.set(entry.hotkey, key);
    }
  });
}

function buildCommandButtons(config) {
  if (!commandButtonsContainer) {
    return;
  }

  commandButtonsContainer.innerHTML = '';
  const desiredOrder = parseList(config?.CommandBar?.Buttons);
  const keys = desiredOrder.length > 0 ? desiredOrder : Array.from(actions.keys());
  const fragment = document.createDocumentFragment();

  keys.forEach(actionKey => {
    const definition = actions.get(actionKey);
    if (!definition) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = actionKey;
    if (definition.panel) {
      button.dataset.panel = definition.panel;
    }
    button.textContent = definition.label ?? actionKey;
    if (definition.description) {
      button.title = definition.description;
    }
    fragment.appendChild(button);
  });

  commandButtonsContainer.appendChild(fragment);
}

function createOverlayElement(panelName, panelConfig = {}) {
  const section = document.createElement('section');
  section.className = 'hud-overlay panel';
  section.dataset.panel = panelName;

  const title = panelConfig.Title ?? panelName;
  if (title) {
    section.dataset.title = title;
  }

  section.hidden = true;
  section.setAttribute('aria-hidden', 'true');
  section.tabIndex = -1;

  const header = document.createElement('header');
  header.className = 'panel__title';
  header.textContent = title;
  section.appendChild(header);

  if (panelConfig.Description) {
    const description = document.createElement('p');
    description.className = 'overlay__description';
    description.textContent = panelConfig.Description;
    section.appendChild(description);
  }

  const notes = parseList(panelConfig.Notes);
  if (notes.length > 0) {
    const list = document.createElement('ul');
    list.className = 'overlay__notes';
    notes.forEach(note => {
      const item = document.createElement('li');
      item.textContent = note;
      list.appendChild(item);
    });
    section.appendChild(list);
  }

  if (panelConfig.Footer) {
    const footer = document.createElement('footer');
    footer.className = 'panel__footer';
    footer.textContent = panelConfig.Footer;
    section.appendChild(footer);
  }

  const closeLabel = panelConfig.CloseLabel ?? 'Закрыть';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'overlay__close';
  closeButton.dataset.role = 'close';
  closeButton.textContent = closeLabel;
  section.appendChild(closeButton);

  return section;
}

function buildOverlays(config) {
  if (!overlayLayerEl) {
    return;
  }

  closeOverlay({ silent: true });

  overlayLayerEl.querySelectorAll('[data-panel]').forEach(panel => panel.remove());
  overlayPanels = new Map();

  const overlaySections = config?.Overlay ?? {};
  Object.entries(overlaySections).forEach(([rawName, panelConfig]) => {
    const panelName = rawName.trim();
    if (!panelName) {
      return;
    }
    const panelElement = createOverlayElement(panelName, panelConfig);
    overlayLayerEl.appendChild(panelElement);
    overlayPanels.set(panelName, panelElement);
  });
}

function applyUiConfig(config) {
  if (!config) {
    return;
  }

  uiConfig = config;

  registerActions(config);
  buildOverlays(config);
  buildCommandButtons(config);

  const metaTitle = config.Meta?.Title ?? null;
  if (metaTitle) {
    document.title = metaTitle;
    if (hudTitleEl) {
      hudTitleEl.textContent = metaTitle;
    }
  }

  if (chatTitleEl && config.Chat?.Title) {
    chatTitleEl.textContent = config.Chat.Title;
  }

  if (commandBarTitleEl && config.CommandBar?.Title) {
    commandBarTitleEl.textContent = config.CommandBar.Title;
  }

  if (chatInputEl && config.Chat?.Placeholder) {
    chatInputEl.placeholder = config.Chat.Placeholder;
  }

  if (chatSendButtonEl && config.Chat?.SendLabel) {
    chatSendButtonEl.textContent = config.Chat.SendLabel;
  }

  if (config.HUD) {
    setCssVariable('--hud-gap', config.HUD.Padding);
    setCssVariable('--ui-bottom-gap', config.HUD.BottomGap);
    setCssVariable('--ui-overlay-width', config.HUD.OverlayWidth);
    setCssVariable('--ui-overlay-max-height', config.HUD.OverlayMaxHeight);
    setCssVariable('--ui-overlay-padding', config.HUD.OverlayPadding);
  }

  if (config.Chat) {
    setCssVariable('--ui-chat-width', config.Chat.Width);
    setCssVariable('--ui-chat-max-height', config.Chat.MaxHeight);
    setCssVariable('--ui-chat-input-height', config.Chat.InputHeight);
  }

  if (config.CommandBar) {
    setCssVariable('--ui-command-width', config.CommandBar.Width);
    setCssVariable('--ui-command-button-height', config.CommandBar.ButtonHeight);
    setCssVariable('--ui-command-button-gap', config.CommandBar.ButtonSpacing);
  }
}

async function initializeUi() {
  let loadedConfig = null;
  try {
    loadedConfig = await loadUiConfig();
  } catch (error) {
    console.warn('Не удалось загрузить конфигурацию интерфейса, используется дефолт', error);
  }

  const mergedConfig = mergeConfigs(fallbackUiConfig, loadedConfig ?? {});
  applyUiConfig(mergedConfig);
}

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

function addActionFeedback(action, message) {
  addSystemMessage(message ?? `Действие «${action}» пока не реализовано`);
}

function resolveActionPanel(actionKey) {
  const definition = actions.get(actionKey);
  if (definition?.panel) {
    return definition.panel;
  }
  return overlayPanels.has(actionKey) ? actionKey : null;
}

function triggerAction(actionKey, fallbackLabel) {
  if (!actionKey) {
    return;
  }

  const definition = actions.get(actionKey) ?? null;
  const label = definition?.label ?? fallbackLabel ?? actionKey;
  const panelName = resolveActionPanel(actionKey);

  if (panelName && activeOverlay === panelName) {
    const closedTitle = closeOverlay();
    if (closedTitle) {
      addSystemMessage(`Закрыто окно «${closedTitle}»`);
    }
    return;
  }

  if (panelName) {
    const openedTitle = openOverlay(panelName);
    if (openedTitle) {
      addSystemMessage(`Открыто окно «${openedTitle}»`);
      return;
    }
  }

  const feedbackMessage = definition?.feedback ?? null;
  if (feedbackMessage) {
    addActionFeedback(label, feedbackMessage);
  } else {
    addActionFeedback(label);
  }
}

function setOverlayVisibility(isVisible) {
  if (!overlayLayerEl) {
    return;
  }
  overlayLayerEl.classList.toggle('overlay-layer--active', isVisible);
  overlayLayerEl.setAttribute('aria-hidden', String(!isVisible));
}

function closeOverlay({ silent = false } = {}) {
  if (!overlayLayerEl || !activeOverlay) {
    return null;
  }

  const panel = overlayPanels.get(activeOverlay) ?? null;
  overlayPanels.forEach(el => {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  });
  activeOverlay = null;
  setOverlayVisibility(false);

  if (panel && !silent) {
    return panel.dataset.title ?? panel.dataset.panel ?? null;
  }
  return null;
}

function openOverlay(panelName) {
  if (!overlayLayerEl || !panelName) {
    return null;
  }

  const panel = overlayPanels.get(panelName);
  if (!panel) {
    return null;
  }

  overlayPanels.forEach(el => {
    const isTarget = el === panel;
    el.hidden = !isTarget;
    el.setAttribute('aria-hidden', String(!isTarget));
  });

  activeOverlay = panelName;
  setOverlayVisibility(true);

  const focusTarget = panel.querySelector('[data-role="close"]') ?? panel;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus();
  }

  return panel.dataset.title ?? panel.dataset.panel ?? null;
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
  if (activeOverlay) {
    return;
  }

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
  if (event.code === 'Escape' && activeOverlay) {
    const closedTitle = closeOverlay();
    if (closedTitle) {
      addSystemMessage(`Закрыто окно «${closedTitle}»`);
    }
    return;
  }

  const actionKey = actionHotkeys.get(event.code);
  if (actionKey) {
    event.preventDefault();
    triggerAction(actionKey);
    return;
  }

  if (activeOverlay) {
    return;
  }

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
    if (!action) {
      return;
    }
    const label = button.textContent?.trim() ?? action;
    triggerAction(action, label);
  });
}

if (overlayLayerEl) {
  overlayLayerEl.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (
      target.dataset.role === 'close' ||
      target.dataset.role === 'overlay-backdrop'
    ) {
      const closedTitle = closeOverlay();
      if (closedTitle) {
        addSystemMessage(`Закрыто окно «${closedTitle}»`);
      }
    }
  });
}

window.addEventListener('resize', () => {
  renderWorld();
});

await initializeUi();

addSystemMessage('Загрузка клиента...');
renderWorld();
connect();
