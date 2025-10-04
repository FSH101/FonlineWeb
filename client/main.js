import { loadUiConfig } from './ui/configLoader.js';
import { tryLoadAnimation } from './player/heroSprite.js';

const HEX_SIZE = 24;
const SQRT3 = Math.sqrt(3);
const MAP_TEXTURE_BASE_URLS = [
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main/assets/object/item/BRICK01',
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/master/assets/object/item/BRICK01',
  'assets/object/item/BRICK01',
  '/assets/object/item/BRICK01',
  'client/assets/object/item/BRICK01',
  '/client/assets/object/item/BRICK01',
];
const MAP_TEXTURE_RELATIVE_PATH = 'dir_0/frame_00.png';

const FALLOUT_TILE_WIDTH = 80;
const FALLOUT_TILE_HEIGHT = 36;
const FALLOUT_TILE_EDGE_RADIANS = Math.atan2(FALLOUT_TILE_HEIGHT, FALLOUT_TILE_WIDTH);

const DEFAULT_MAP_TILE_WIDTH = FALLOUT_TILE_WIDTH;
const DEFAULT_MAP_TILE_HEIGHT = FALLOUT_TILE_HEIGHT;

const mapView = {
  zoom: 1,
  minZoom: 0.85,
  maxZoom: 2.4,
  step: 0.12,
};

const DOUBLE_TAP_DELAY_MS = 280;
const TAP_MOVEMENT_THRESHOLD_PX = 22;
const SWIPE_MIN_DISTANCE_PX = 36;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const DIRECTION_VECTORS = {
  southEast: { q: 0, r: 1 },
  east: { q: 1, r: 0 },
  northEast: { q: 1, r: -1 },
  northWest: { q: 0, r: -1 },
  west: { q: -1, r: 0 },
  southWest: { q: -1, r: 1 },
};

const DIRECTION_METADATA = Object.entries(DIRECTION_VECTORS).map(([name, vector]) => {
  const px = SQRT3 * (vector.q + vector.r / 2);
  const py = 1.5 * vector.r;
  const angle = Math.atan2(py, px);
  return { name, angle };
});

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

const coarsePointerMedia = window.matchMedia('(hover: none) and (pointer: coarse)');

function isMobileLikeInput() {
  return coarsePointerMedia.matches || navigator.maxTouchPoints > 0;
}

function updateInputModeClass() {
  if (!document.body) {
    return;
  }
  document.body.classList.toggle('is-mobile', isMobileLikeInput());
}

updateInputModeClass();
if (typeof coarsePointerMedia.addEventListener === 'function') {
  coarsePointerMedia.addEventListener('change', updateInputModeClass);
} else if (typeof coarsePointerMedia.addListener === 'function') {
  coarsePointerMedia.addListener(updateInputModeClass);
}

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
    OverlayWidth: '760',
    OverlayMaxHeight: '620',
    OverlayPadding: '32',
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
  Player: {
    RunAnimation: 'player/assets/human_female/HFCMBTAB',
    IdleAnimation: 'player/assets/human_female/HFCMBTAA',
    DirectionOrder: 'northEast, east, southEast, southWest, west, northWest',
    MoveDuration: '280',
    Scale: '2',
    OffsetX: '0',
    OffsetY: '-28',
    DefaultFacing: 'southEast',
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
      Title: 'Прицельная атака',
      DisplayCaption: 'Сканер цели',
      LeftTargets:
        'head|В голову|95%; eyes|В глаза|85%; rightArm|В правую руку|65%; rightLeg|В правую ногу|60%',
      RightTargets:
        'torso|В корпус|75%; groin|В пах|55%; leftArm|В левую руку|65%; leftLeg|В левую ногу|60%',
      ConsolePrimary: 'Выберите часть тела для точечного удара.',
      ConsoleSecondary:
        'Шанс попадания зависит от навыков, расстояния и состояния оружия.',
      ConsoleStats: 'ОД|4; Шанс|—; Оружие|Прототип',
      ConsoleFooter: 'Доступно только для оружия с прицельной атакой.',
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

const DEFAULT_PLAYER_SETTINGS = {
  runPath: 'player/assets/human_female/HFCMBTAB',
  idlePath: 'player/assets/human_female/HFCMBTAA',
  directionOrder: ['northEast', 'east', 'southEast', 'southWest', 'west', 'northWest'],
  moveDuration: 280,
  scale: 2,
  offsetX: 0,
  offsetY: -28,
  defaultFacing: 'southEast',
};

const playerSettings = { ...DEFAULT_PLAYER_SETTINGS };

const playerAnimations = {
  run: null,
  idle: null,
};

function applyDirectionOrderFromAnimation(animation) {
  if (!animation || !Array.isArray(animation.directionOrder) || animation.directionOrder.length === 0) {
    return;
  }
  if (!arraysEqual(animation.directionOrder, playerSettings.directionOrder)) {
    playerSettings.directionOrder = [...animation.directionOrder];
  }
}

const playerVisuals = new Map();

let animationFrameHandle = null;
let lastFrameTime = null;

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

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function applyPlayerSettings(config) {
  Object.assign(playerSettings, DEFAULT_PLAYER_SETTINGS);

  if (!config || typeof config !== 'object') {
    return;
  }

  playerSettings.runPath = config.RunAnimation?.trim() || DEFAULT_PLAYER_SETTINGS.runPath;
  const idleOverride = config.IdleAnimation?.trim();
  playerSettings.idlePath = idleOverride || DEFAULT_PLAYER_SETTINGS.idlePath || playerSettings.runPath;

  const order = parseList(config.DirectionOrder);
  playerSettings.directionOrder = order.length > 0 ? order : [...DEFAULT_PLAYER_SETTINGS.directionOrder];

  playerSettings.moveDuration = parseNumber(config.MoveDuration, DEFAULT_PLAYER_SETTINGS.moveDuration);
  playerSettings.scale = parseNumber(config.Scale, DEFAULT_PLAYER_SETTINGS.scale);
  playerSettings.offsetX = parseNumber(config.OffsetX, DEFAULT_PLAYER_SETTINGS.offsetX);
  playerSettings.offsetY = parseNumber(config.OffsetY, DEFAULT_PLAYER_SETTINGS.offsetY);

  const defaultFacing = config.DefaultFacing?.trim();
  playerSettings.defaultFacing =
    defaultFacing && playerSettings.directionOrder.includes(defaultFacing)
      ? defaultFacing
      : playerSettings.directionOrder[0] ?? DEFAULT_PLAYER_SETTINGS.defaultFacing;
}

async function loadPlayerAnimationsFromSettings() {
  const loadOptions = { directionOrder: playerSettings.directionOrder };

  const runPromise = playerSettings.runPath
    ? tryLoadAnimation(playerSettings.runPath, loadOptions)
    : Promise.resolve(null);

  let idlePromise = Promise.resolve(null);
  if (playerSettings.idlePath && playerSettings.idlePath !== playerSettings.runPath) {
    idlePromise = tryLoadAnimation(playerSettings.idlePath, loadOptions);
  }

  const [run, idle] = await Promise.all([runPromise, idlePromise]);

  playerAnimations.run = run;
  playerAnimations.idle = idle ?? run;

  if (playerAnimations.run) {
    applyDirectionOrderFromAnimation(playerAnimations.run);
  } else if (playerAnimations.idle) {
    applyDirectionOrderFromAnimation(playerAnimations.idle);
  }
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

function parseTargetList(value, fallback = []) {
  if (value === undefined || value === null || value === '') {
    return fallback.map(target => ({ ...target }));
  }

  return String(value)
    .split(/[\n;]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(entry => {
      const [rawId, rawLabel, rawChance] = entry.split('|').map(piece => piece.trim());
      const label = rawLabel || rawId || '';
      const sanitizedId = rawId || label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'target';
      const chance = rawChance || '';
      return {
        id: sanitizedId,
        label: label || sanitizedId,
        chance,
      };
    });
}

function parseKeyValuePairs(value, fallback = []) {
  if (value === undefined || value === null || value === '') {
    return fallback.map(pair => ({ ...pair }));
  }

  return String(value)
    .split(/[\n;]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(entry => {
      const [rawLabel, rawValue] = entry.split('|').map(piece => piece.trim());
      return {
        label: rawLabel || '',
        value: rawValue || '',
      };
    });
}

function createCharacterTargetButton(definition) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'character-target';
  button.dataset.role = 'body-target';

  if (definition.id) {
    button.dataset.target = definition.id;
  }
  if (definition.label) {
    button.dataset.label = definition.label;
  }
  if (definition.chance) {
    button.dataset.chance = definition.chance;
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = 'character-target__label';
  labelSpan.textContent = definition.label ?? definition.id ?? '';
  button.appendChild(labelSpan);

  if (definition.chance) {
    const chanceSpan = document.createElement('span');
    chanceSpan.className = 'character-target__chance';
    chanceSpan.textContent = definition.chance;
    button.appendChild(chanceSpan);
  }

  return button;
}

function buildCharacterOverlay(section, panelConfig = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'character-overlay';

  const frame = document.createElement('div');
  frame.className = 'character-overlay__frame';

  const caption = panelConfig.DisplayCaption ?? 'Сканер цели';
  if (caption) {
    const captionEl = document.createElement('div');
    captionEl.className = 'character-overlay__display-header';
    captionEl.textContent = caption;
    frame.appendChild(captionEl);
  }

  const display = document.createElement('div');
  display.className = 'character-overlay__display';

  const defaultLeftTargets = [
    { id: 'head', label: 'В голову', chance: '95%' },
    { id: 'eyes', label: 'В глаза', chance: '85%' },
    { id: 'right-arm', label: 'В правую руку', chance: '65%' },
    { id: 'right-leg', label: 'В правую ногу', chance: '60%' },
  ];
  const leftTargets = parseTargetList(panelConfig.LeftTargets, defaultLeftTargets);
  const leftList = document.createElement('div');
  leftList.className = 'character-overlay__targets character-overlay__targets--left';
  leftTargets.forEach(target => {
    leftList.appendChild(createCharacterTargetButton(target));
  });
  display.appendChild(leftList);

  const grid = document.createElement('div');
  grid.className = 'character-overlay__grid';
  const figure = document.createElement('div');
  figure.className = 'character-overlay__figure';
  ['arms', 'legs'].forEach(kind => {
    const limb = document.createElement('span');
    limb.className = `character-overlay__limb character-overlay__limb--${kind}`;
    figure.appendChild(limb);
  });
  grid.appendChild(figure);
  display.appendChild(grid);

  const defaultRightTargets = [
    { id: 'torso', label: 'В корпус', chance: '75%' },
    { id: 'groin', label: 'В пах', chance: '55%' },
    { id: 'left-arm', label: 'В левую руку', chance: '65%' },
    { id: 'left-leg', label: 'В левую ногу', chance: '60%' },
  ];
  const rightTargets = parseTargetList(panelConfig.RightTargets, defaultRightTargets);
  const rightList = document.createElement('div');
  rightList.className = 'character-overlay__targets character-overlay__targets--right';
  rightTargets.forEach(target => {
    rightList.appendChild(createCharacterTargetButton(target));
  });
  display.appendChild(rightList);

  frame.appendChild(display);
  overlay.appendChild(frame);

  const consolePanel = document.createElement('div');
  consolePanel.className = 'character-overlay__console';

  const primaryText = panelConfig.ConsolePrimary ?? 'Выберите часть тела для точечного удара.';
  if (primaryText) {
    const primaryLine = document.createElement('div');
    primaryLine.className = 'character-overlay__console-line character-overlay__console-line--primary';
    primaryLine.textContent = primaryText;
    consolePanel.appendChild(primaryLine);
  }

  const secondaryText =
    panelConfig.ConsoleSecondary ??
    'Шанс попадания зависит от навыков, расстояния и состояния оружия.';
  if (secondaryText) {
    const secondaryLine = document.createElement('div');
    secondaryLine.className = 'character-overlay__console-line';
    secondaryLine.textContent = secondaryText;
    consolePanel.appendChild(secondaryLine);
  }

  const defaultStats = [
    { label: 'ОД', value: '4' },
    { label: 'Шанс', value: '—' },
    { label: 'Оружие', value: 'Прототип' },
  ];
  const stats = parseKeyValuePairs(panelConfig.ConsoleStats, defaultStats);
  if (stats.length > 0) {
    const statsList = document.createElement('dl');
    statsList.className = 'character-overlay__stats';
    stats.forEach(({ label, value }) => {
      const term = document.createElement('dt');
      term.className = 'character-overlay__stat-label';
      term.textContent = label;
      statsList.appendChild(term);

      const data = document.createElement('dd');
      data.className = 'character-overlay__stat-value';
      data.textContent = value;
      statsList.appendChild(data);
    });
    consolePanel.appendChild(statsList);
  }

  const footerText = panelConfig.ConsoleFooter ?? '';
  if (footerText) {
    const footer = document.createElement('div');
    footer.className = 'character-overlay__console-footer';
    footer.textContent = footerText;
    consolePanel.appendChild(footer);
  }

  overlay.appendChild(consolePanel);
  section.appendChild(overlay);

  return true;
}

const overlayCustomBuilders = new Map([
  ['character', buildCharacterOverlay],
]);

function appendGenericOverlayContent(section, panelConfig = {}) {
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

  const builder = overlayCustomBuilders.get(panelName);
  const handled = builder ? builder(section, panelConfig) === true : false;
  if (!handled) {
    appendGenericOverlayContent(section, panelConfig);
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
  applyPlayerSettings(mergedConfig.Player);
  applyUiConfig(mergedConfig);
  await loadPlayerAnimationsFromSettings();
}

const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');

let mapTexturePattern = null;
let mapTextureReady = false;
let mapTextureTileCanvas = null;
let mapTileWidth = DEFAULT_MAP_TILE_WIDTH;
let mapTileHeight = DEFAULT_MAP_TILE_HEIGHT;
let mapGridPattern = null;

function joinUrl(base, path) {
  if (!path) {
    return base;
  }

  if (!base) {
    return path;
  }

  if (/^[a-z]+:\/\//i.test(path) || path.startsWith('/')) {
    return path;
  }

  const normalizedBase = String(base).replace(/\/+$/, '');
  const normalizedPath = String(path).replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function collectMapTextureSources() {
  const uniqueSources = [];
  const seen = new Set();

  for (const candidateBase of MAP_TEXTURE_BASE_URLS) {
    if (typeof candidateBase !== 'string') {
      continue;
    }

    const trimmedBase = candidateBase.trim();
    if (!trimmedBase) {
      continue;
    }

    const resolved = joinUrl(trimmedBase, MAP_TEXTURE_RELATIVE_PATH);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    uniqueSources.push(resolved);
  }

  return uniqueSources;
}

function updateIsometricGridPattern() {
  const tileWidth = mapTileWidth || DEFAULT_MAP_TILE_WIDTH;
  const tileHeight = mapTileHeight || DEFAULT_MAP_TILE_HEIGHT;

  if (!tileWidth || !tileHeight) {
    mapGridPattern = null;
    return;
  }

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = tileWidth;
  patternCanvas.height = tileHeight;

  const patternCtx = patternCanvas.getContext('2d');
  patternCtx.imageSmoothingEnabled = false;

  const midX = tileWidth / 2;
  const midY = tileHeight / 2;
  const isoHalfHeight = Math.tan(FALLOUT_TILE_EDGE_RADIANS) * midX;
  const verticalOffset = midY - isoHalfHeight;

  patternCtx.strokeStyle = 'rgba(12, 9, 6, 0.42)';
  patternCtx.lineWidth = 1;
  patternCtx.lineJoin = 'miter';
  patternCtx.lineCap = 'butt';

  const crispOffset = 0.5;

  patternCtx.beginPath();
  patternCtx.moveTo(midX + crispOffset, verticalOffset + crispOffset);
  patternCtx.lineTo(tileWidth + crispOffset, midY + crispOffset);
  patternCtx.lineTo(midX + crispOffset, tileHeight - verticalOffset + crispOffset);
  patternCtx.lineTo(crispOffset, midY + crispOffset);
  patternCtx.closePath();
  patternCtx.stroke();

  mapGridPattern = ctx.createPattern(patternCanvas, 'repeat');
}

async function fetchImageBitmap(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить карту: ${url} (${response.status})`);
  }

  const blob = await response.blob();

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      bitmap,
      width: bitmap.width ?? 0,
      height: bitmap.height ?? 0,
    };
  }

  return await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        bitmap: image,
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Не удалось декодировать карту: ${url}`));
    };
    image.src = objectUrl;
  });
}

async function loadMapTexture() {
  const sources = collectMapTextureSources();

  for (const source of sources) {
    try {
      const { bitmap, width, height } = await fetchImageBitmap(source);
      const effectiveWidth = Math.max(width || DEFAULT_MAP_TILE_WIDTH, 1);
      const effectiveHeight = Math.max(height || DEFAULT_MAP_TILE_HEIGHT, 1);
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = effectiveWidth;
      tileCanvas.height = effectiveHeight;

      const tileCtx = tileCanvas.getContext('2d');
      tileCtx.imageSmoothingEnabled = false;
      tileCtx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
      tileCtx.drawImage(bitmap, 0, 0, tileCanvas.width, tileCanvas.height);

      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }

      mapTexturePattern = ctx.createPattern(tileCanvas, 'repeat');
      mapTextureTileCanvas = tileCanvas;
      mapTileWidth = tileCanvas.width;
      mapTileHeight = tileCanvas.height;
      updateIsometricGridPattern();
      mapTextureReady = true;
      renderWorld();
      return;
    } catch (error) {
      console.warn('Не удалось загрузить текстуру карты', source, error);
    }
  }

  updateIsometricGridPattern();
  console.error('Все источники текстуры карты недоступны');
}

updateIsometricGridPattern();
loadMapTexture();

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
let hoveredHex = null;

let activeTouchGesture = null;
let pendingTapTimeoutId = null;
let pendingTapHex = null;
let lastTapInfo = { time: 0, x: 0, y: 0 };

function getTileCenter(axial) {
  if (!axial) {
    return null;
  }
  return layout.tileCenters.get(axialKey(axial.q, axial.r)) ?? null;
}

function setVisualAnimation(visual, animationName) {
  if (visual.currentAnimation === animationName) {
    return false;
  }
  visual.currentAnimation = animationName;
  visual.frameIndex = 0;
  visual.frameTimer = 0;
  return true;
}

function ensurePlayerVisual(player, center) {
  let visual = playerVisuals.get(player.id);
  if (!visual) {
    const basePosition = center
      ? { x: center.x, y: center.y }
      : { x: layout.offsetX, y: layout.offsetY };
    visual = {
      id: player.id,
      axial: { ...player.position.axial },
      currentPosition: { ...basePosition },
      startPosition: { ...basePosition },
      targetPosition: { ...basePosition },
      finalPosition: { ...basePosition },
      moveStartTime: performance.now(),
      moveDuration: playerSettings.moveDuration,
      moving: false,
      frameIndex: 0,
      frameTimer: 0,
      currentAnimation: 'idle',
      facingDirection: playerSettings.defaultFacing,
      pendingWaypoints: [],
      currentTargetAxial: null,
      motionAxial: { ...player.position.axial },
    };
    playerVisuals.set(player.id, visual);
  }
  if (!visual.finalPosition) {
    visual.finalPosition = { ...visual.targetPosition };
  }
  if (!Array.isArray(visual.pendingWaypoints)) {
    visual.pendingWaypoints = [];
  }
  if (!visual.motionAxial) {
    visual.motionAxial = { ...player.position.axial };
  }
  if (!('currentTargetAxial' in visual)) {
    visual.currentTargetAxial = null;
  }
  return visual;
}

function advanceVisualWaypoint(visual, timestamp) {
  if (!Array.isArray(visual.pendingWaypoints) || visual.pendingWaypoints.length === 0) {
    visual.moving = false;
    visual.currentTargetAxial = null;
    visual.startPosition = { ...visual.finalPosition };
    visual.targetPosition = { ...visual.finalPosition };
    visual.currentPosition = { ...visual.finalPosition };
    visual.moveStartTime = timestamp;
    visual.motionAxial = { ...visual.axial };
    return false;
  }

  const next = visual.pendingWaypoints.shift();
  visual.currentTargetAxial = { ...next.axial };
  visual.startPosition = { ...visual.currentPosition };
  visual.targetPosition = { ...next.position };
  visual.moveStartTime = timestamp;
  visual.moveDuration = playerSettings.moveDuration;
  visual.moving = true;

  const direction = axialDeltaToDirection(visual.motionAxial, next.axial);
  if (direction) {
    visual.facingDirection = direction;
  }

  return true;
}

function updateVisualForPlayer(player, previous = null) {
  const center = getTileCenter(player.position.axial);
  if (!center) {
    return;
  }

  const visual = ensurePlayerVisual(player, center);
  visual.axial = { ...player.position.axial };
  visual.finalPosition = { x: center.x, y: center.y };

  const now = performance.now();

  if (!previous) {
    visual.pendingWaypoints = [];
    visual.motionAxial = { ...player.position.axial };
    visual.startPosition = { ...visual.finalPosition };
    visual.currentPosition = { ...visual.finalPosition };
    visual.targetPosition = { ...visual.finalPosition };
    visual.moving = false;
    visual.moveDuration = playerSettings.moveDuration;
    setVisualAnimation(visual, 'idle');
    return;
  }

  const moved =
    previous.position.axial.q !== player.position.axial.q ||
    previous.position.axial.r !== player.position.axial.r;

  if (moved) {
    const prevCenter = getTileCenter(previous.position.axial);
    const startPosition = visual.moving
      ? { ...visual.currentPosition }
      : prevCenter
      ? { x: prevCenter.x, y: prevCenter.y }
      : { ...visual.currentPosition };

    const axialPath = computeHexLine(previous.position.axial, player.position.axial);
    const waypoints = [];
    for (const axial of axialPath) {
      const waypointCenter = getTileCenter(axial);
      if (!waypointCenter) {
        continue;
      }
      waypoints.push({
        axial,
        position: { x: waypointCenter.x, y: waypointCenter.y },
      });
    }

    if (waypoints.length === 0) {
      visual.pendingWaypoints = [];
      visual.motionAxial = { ...player.position.axial };
      visual.startPosition = startPosition;
      visual.currentPosition = { ...startPosition };
      visual.targetPosition = { ...visual.finalPosition };
      visual.currentTargetAxial = null;
      visual.moveStartTime = now;
      const steps = Math.max(
        axialDistance(previous.position.axial, player.position.axial),
        1
      );
      visual.moveDuration = playerSettings.moveDuration * steps;
      visual.moving = true;
      const fallbackDirection = axialDeltaToDirection(
        previous.position.axial,
        player.position.axial
      );
      if (fallbackDirection) {
        visual.facingDirection = fallbackDirection;
      }
      setVisualAnimation(visual, 'run');
      return;
    }

    visual.pendingWaypoints = waypoints;
    visual.motionAxial = { ...previous.position.axial };
    visual.currentPosition = { ...startPosition };
    visual.startPosition = { ...startPosition };
    visual.currentTargetAxial = null;
    visual.targetPosition = { ...visual.currentPosition };
    const started = advanceVisualWaypoint(visual, now);
    setVisualAnimation(visual, started ? 'run' : 'idle');
    return;
  }

  visual.pendingWaypoints = [];
  visual.motionAxial = { ...player.position.axial };
  visual.startPosition = { ...visual.finalPosition };
  visual.currentPosition = { ...visual.finalPosition };
  visual.targetPosition = { ...visual.finalPosition };
  visual.currentTargetAxial = null;
  visual.moving = false;
  visual.moveDuration = playerSettings.moveDuration;
  setVisualAnimation(visual, 'idle');
}

function synchronizeVisualsWithWorld() {
  playerVisuals.clear();
  for (const player of worldState.players.values()) {
    updateVisualForPlayer(player, null);
  }
}

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

  ctx.lineWidth = Math.max(HEX_SIZE * 0.12, 1.5);
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

function drawHighlight(centerX, centerY, color, lineWidth = HEX_SIZE * 0.18) {
  ctx.save();
  hexPath(centerX, centerY, HEX_SIZE * 0.94);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(HEX_SIZE * 0.35, 8);
  ctx.stroke();
  ctx.restore();
}

function drawMapBackground() {
  const tileWidth = mapTileWidth || mapTextureTileCanvas?.width || DEFAULT_MAP_TILE_WIDTH;
  const tileHeight = mapTileHeight || mapTextureTileCanvas?.height || DEFAULT_MAP_TILE_HEIGHT;

  if (mapTextureReady && mapTexturePattern && tileWidth && tileHeight) {
    ctx.save();
    const offsetX = ((layout.offsetX % tileWidth) + tileWidth) % tileWidth;
    const offsetY = ((layout.offsetY % tileHeight) + tileHeight) % tileHeight;
    ctx.translate(-offsetX, -offsetY);
    ctx.fillStyle = mapTexturePattern;
    ctx.fillRect(-tileWidth, -tileHeight, canvas.width + tileWidth * 2, canvas.height + tileHeight * 2);
    ctx.restore();
    return;
  }

  if (mapTextureReady && mapTextureTileCanvas && tileWidth && tileHeight) {
    ctx.save();
    const offsetX = ((layout.offsetX % tileWidth) + tileWidth) % tileWidth;
    const offsetY = ((layout.offsetY % tileHeight) + tileHeight) % tileHeight;
    ctx.translate(-offsetX, -offsetY);
    for (let x = -tileWidth; x <= canvas.width + tileWidth; x += tileWidth) {
      for (let y = -tileHeight; y <= canvas.height + tileHeight; y += tileHeight) {
        ctx.drawImage(mapTextureTileCanvas, x, y);
      }
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#010101';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawIsometricGridOverlay() {
  const tileWidth = mapTileWidth || DEFAULT_MAP_TILE_WIDTH;
  const tileHeight = mapTileHeight || DEFAULT_MAP_TILE_HEIGHT;
  if (!tileWidth || !tileHeight) {
    return;
  }

  const offsetX = ((layout.offsetX % tileWidth) + tileWidth) % tileWidth;
  const offsetY = ((layout.offsetY % tileHeight) + tileHeight) % tileHeight;

  if (mapGridPattern && mapTileWidth && mapTileHeight) {
    ctx.save();
    ctx.translate(-offsetX, -offsetY);
    ctx.fillStyle = mapGridPattern;
    ctx.fillRect(-tileWidth, -tileHeight, canvas.width + tileWidth * 2, canvas.height + tileHeight * 2);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(12, 9, 6, 0.42)';
  ctx.translate(-offsetX, -offsetY);

  const startX = -tileWidth;
  const startY = -tileHeight;
  const endX = canvas.width + tileWidth;
  const endY = canvas.height + tileHeight;
  const crispOffset = 0.5;
  const halfWidth = tileWidth / 2;
  const isoHalfHeight = Math.tan(FALLOUT_TILE_EDGE_RADIANS) * halfWidth;
  const verticalOffset = tileHeight / 2 - isoHalfHeight;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += tileWidth) {
    for (let y = startY; y <= endY; y += tileHeight) {
      const baseX = x + crispOffset;
      const baseY = y + crispOffset;
      const midY = baseY + tileHeight / 2;
      const topY = baseY + verticalOffset;
      const bottomY = baseY + tileHeight - verticalOffset;

      ctx.moveTo(baseX + halfWidth, topY);
      ctx.lineTo(baseX + tileWidth, midY);
      ctx.lineTo(baseX + halfWidth, bottomY);
      ctx.lineTo(baseX, midY);
      ctx.closePath();
    }
  }
  ctx.stroke();

  ctx.restore();
}

function drawPlayerFallback(centerX, centerY, isSelf) {
  const radius = HEX_SIZE * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = isSelf ? '#c0ff56' : '#64a9ff';
  ctx.fill();
  ctx.lineWidth = Math.max(HEX_SIZE * 0.1, 2);
  ctx.strokeStyle = '#0d1208';
  ctx.stroke();
  ctx.restore();
}

function resolveDirectionIndex(direction, animation) {
  if (!animation || !Array.isArray(animation.directions) || animation.directions.length === 0) {
    return 0;
  }

  const animationOrder = Array.isArray(animation.directionOrder) && animation.directionOrder.length > 0
    ? animation.directionOrder
    : null;
  const effectiveOrder = animationOrder ?? playerSettings.directionOrder;

  if (direction && Array.isArray(effectiveOrder) && effectiveOrder.length > 0) {
    const idx = effectiveOrder.indexOf(direction);
    if (idx !== -1) {
      return Math.min(idx, animation.directions.length - 1);
    }
  }

  if (animationOrder && animationOrder.length > 0) {
    const fallbackIndex = animationOrder.indexOf(playerSettings.defaultFacing);
    if (fallbackIndex !== -1) {
      return Math.min(fallbackIndex, animation.directions.length - 1);
    }
  }

  if (Array.isArray(effectiveOrder) && effectiveOrder.length > 0) {
    const fallbackIndex = effectiveOrder.indexOf(playerSettings.defaultFacing);
    if (fallbackIndex !== -1) {
      return Math.min(fallbackIndex, animation.directions.length - 1);
    }
  }

  return 0;
}

function getAnimationFrames(animation, direction) {
  if (!animation || !animation.directions || animation.directions.length === 0) {
    return [];
  }
  const index = resolveDirectionIndex(direction, animation);
  const directionEntry = animation.directions[index] ?? animation.directions[0];
  return directionEntry?.frames ?? [];
}

function drawPlayerVisual(visual, isSelf) {
  const primaryAnimation =
    visual.currentAnimation === 'run'
      ? playerAnimations.run ?? playerAnimations.idle
      : playerAnimations.idle ?? playerAnimations.run;
  const animation = primaryAnimation ?? playerAnimations.run ?? playerAnimations.idle;
  const frames = getAnimationFrames(animation, visual.facingDirection);
  const frame = frames.length > 0 ? frames[visual.frameIndex % frames.length] : null;

  if (!frame) {
    drawPlayerFallback(visual.currentPosition.x, visual.currentPosition.y, isSelf);
    return;
  }

  const scale = playerSettings.scale || 1;
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  const anchorX = (frame.anchorX ?? frame.width / 2) * scale;
  const anchorY = (frame.anchorY ?? frame.height) * scale;

  const drawX = visual.currentPosition.x - anchorX + playerSettings.offsetX;
  const drawY = visual.currentPosition.y - anchorY + playerSettings.offsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.bitmap, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function updateAnimationStates(delta, timestamp) {
  for (const [playerId, visual] of playerVisuals) {
    if (!worldState.players.has(playerId)) {
      playerVisuals.delete(playerId);
      continue;
    }

    if (visual.moving) {
      const duration = Math.max(visual.moveDuration, 1);
      const elapsed = timestamp - visual.moveStartTime;
      const t = Math.min(elapsed / duration, 1);
      const nextX =
        visual.startPosition.x + (visual.targetPosition.x - visual.startPosition.x) * t;
      const nextY =
        visual.startPosition.y + (visual.targetPosition.y - visual.startPosition.y) * t;
      visual.currentPosition = { x: nextX, y: nextY };
      if (t >= 1) {
        visual.moving = false;
        visual.currentPosition = { ...visual.targetPosition };
        if (visual.currentTargetAxial) {
          visual.motionAxial = { ...visual.currentTargetAxial };
          visual.currentTargetAxial = null;
        }
        const started = advanceVisualWaypoint(visual, timestamp);
        if (!started) {
          visual.currentPosition = { ...visual.finalPosition };
        }
      }
    } else if (
      Array.isArray(visual.pendingWaypoints) &&
      visual.pendingWaypoints.length > 0 &&
      !visual.currentTargetAxial
    ) {
      const started = advanceVisualWaypoint(visual, timestamp);
      if (!started) {
        visual.currentPosition = { ...visual.finalPosition };
      }
    } else {
      visual.currentPosition = { ...visual.finalPosition };
      visual.targetPosition = { ...visual.finalPosition };
    }

    const desiredAnimation = visual.moving ? 'run' : 'idle';
    setVisualAnimation(visual, desiredAnimation);

    const animation =
      desiredAnimation === 'run'
        ? playerAnimations.run ?? playerAnimations.idle
        : playerAnimations.idle ?? playerAnimations.run;

    if (animation && animation.frameDurationMs > 0) {
      const frames = getAnimationFrames(animation, visual.facingDirection);
      if (frames.length > 0) {
        const frameDuration = animation.frameDurationMs;
        visual.frameTimer += delta;
        while (visual.frameTimer >= frameDuration) {
          visual.frameTimer -= frameDuration;
          visual.frameIndex = (visual.frameIndex + 1) % frames.length;
        }
      } else {
        visual.frameIndex = 0;
        visual.frameTimer = 0;
      }
    } else {
      visual.frameIndex = 0;
      visual.frameTimer = 0;
    }
  }
}

function startGameLoop() {
  if (animationFrameHandle !== null) {
    return;
  }

  lastFrameTime = performance.now();

  const step = timestamp => {
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    updateAnimationStates(delta, timestamp);
    renderWorld();
    animationFrameHandle = requestAnimationFrame(step);
  };

  animationFrameHandle = requestAnimationFrame(step);
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
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyMapViewTransform();

  drawMapBackground();
  drawIsometricGridOverlay();

  if (!layout.orderedTiles.length) {
    ctx.restore();
    return;
  }

  if (hoveredHex) {
    const hoveredKey = axialKey(hoveredHex.q, hoveredHex.r);
    const hoveredCenter = layout.tileCenters.get(hoveredKey);
    if (hoveredCenter) {
      drawHighlight(hoveredCenter.x, hoveredCenter.y, '#ffd86b', HEX_SIZE * 0.15);
    }
  }

  const self = getSelfPlayer();
  if (self) {
    const key = axialKey(self.position.axial.q, self.position.axial.r);
    const center = layout.tileCenters.get(key);
    if (center) {
      drawHighlight(center.x, center.y, '#89ff3c');
    }
  }

  for (const [playerId, player] of worldState.players) {
    const visual = playerVisuals.get(playerId) ?? null;
    if (visual) {
      drawPlayerVisual(visual, playerId === worldState.selfId);
      continue;
    }
    const center = getTileCenter(player.position.axial);
    if (center) {
      drawPlayerFallback(center.x, center.y, playerId === worldState.selfId);
    }
  }

  ctx.restore();
}

function applyMapViewTransform() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(mapView.zoom, mapView.zoom);
  ctx.translate(-centerX, -centerY);
}

function setMapZoom(nextZoom) {
  const clamped = clamp(nextZoom, mapView.minZoom, mapView.maxZoom);
  if (Math.abs(clamped - mapView.zoom) < 0.001) {
    return;
  }
  mapView.zoom = clamped;
  renderWorld();
}

function adjustMapZoom(direction) {
  if (!direction) {
    return;
  }
  setMapZoom(mapView.zoom + direction * mapView.step);
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

function viewToWorld(x, y) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  return {
    x: (x - centerX) / mapView.zoom + centerX,
    y: (y - centerY) / mapView.zoom + centerY,
  };
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const rawX = (event.clientX - rect.left) * scaleX;
  const rawY = (event.clientY - rect.top) * scaleY;
  return viewToWorld(rawX, rawY);
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

function axialDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.round((Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2);
}

function axialToCube(axial) {
  return { x: axial.q, y: -axial.q - axial.r, z: axial.r };
}

function cubeToAxial(cube) {
  return { q: cube.x, r: cube.z };
}

function cubeLerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function cubeRound(cube) {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { x: rx, y: ry, z: rz };
}

function computeHexLine(from, to) {
  const distance = axialDistance(from, to);
  if (distance === 0) {
    return [];
  }

  const fromCube = axialToCube(from);
  const toCube = axialToCube(to);
  const line = [];

  for (let step = 1; step <= distance; step += 1) {
    const t = step / distance;
    const interpolated = cubeLerp(fromCube, toCube, t);
    line.push(cubeToAxial(cubeRound(interpolated)));
  }

  return line;
}

function pickHexFromPoint(x, y) {
  const candidate = pixelToAxial(x, y);
  if (!layout.tileCenters.has(axialKey(candidate.q, candidate.r))) {
    return null;
  }
  return candidate;
}

function pickHexFromEvent(event) {
  const { x, y } = pointerToCanvas(event);
  return pickHexFromPoint(x, y);
}

function setHoveredHex(hex) {
  const currentKey = hoveredHex ? axialKey(hoveredHex.q, hoveredHex.r) : null;
  const nextKey = hex ? axialKey(hex.q, hex.r) : null;
  if (currentKey === nextKey) {
    return;
  }
  hoveredHex = hex;
  renderWorld();
}

function requestPlayerMove(hex, { mode = 'run', silentIfSame = false } = {}) {
  if (!hex) {
    return;
  }

  const self = getSelfPlayer();
  if (!self) {
    addSystemMessage('Ожидание соединения с сервером...');
    return;
  }

  if (self.position.axial.q === hex.q && self.position.axial.r === hex.r) {
    if (!silentIfSame) {
      addSystemMessage('Вы уже на выбранном гексе');
    }
    return;
  }

  sendMoveTo(hex, { mode });
}

function clearTouchGesture(pointerId) {
  if (
    activeTouchGesture &&
    typeof canvas.releasePointerCapture === 'function'
  ) {
    const targetId = pointerId ?? activeTouchGesture.pointerId;
    try {
      canvas.releasePointerCapture(targetId);
    } catch (error) {
      // ignore errors when pointer is not captured
    }
  }
  activeTouchGesture = null;
}

function clearPendingTap() {
  if (pendingTapTimeoutId !== null) {
    window.clearTimeout(pendingTapTimeoutId);
    pendingTapTimeoutId = null;
  }
  pendingTapHex = null;
}

function processTouchTap(event, hex) {
  const now = performance.now();
  const { time, x, y } = lastTapInfo;
  const clientX = event.clientX;
  const clientY = event.clientY;
  const elapsed = now - time;
  const travel = Math.hypot(clientX - x, clientY - y);

  if (elapsed <= DOUBLE_TAP_DELAY_MS && travel <= TAP_MOVEMENT_THRESHOLD_PX) {
    clearPendingTap();
    lastTapInfo = { time: 0, x: 0, y: 0 };
    requestPlayerMove(hex, { mode: 'run', silentIfSame: true });
    return;
  }

  lastTapInfo = { time: now, x: clientX, y: clientY };
  clearPendingTap();
  pendingTapHex = hex;
  pendingTapTimeoutId = window.setTimeout(() => {
    if (pendingTapHex) {
      requestPlayerMove(pendingTapHex, { mode: 'walk', silentIfSame: true });
    }
    clearPendingTap();
  }, DOUBLE_TAP_DELAY_MS);
}

function angleDifference(a, b) {
  const diff = a - b;
  return Math.atan2(Math.sin(diff), Math.cos(diff));
}

function axialDeltaToDirection(from, to) {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  if (dq === 0 && dr === 0) {
    return null;
  }

  const px = SQRT3 * (dq + dr / 2);
  const py = 1.5 * dr;
  if (px === 0 && py === 0) {
    return null;
  }

  const directionAngle = Math.atan2(py, px);

  let bestDirection = null;
  let smallestDelta = Infinity;
  for (const { name, angle } of DIRECTION_METADATA) {
    const delta = Math.abs(angleDifference(directionAngle, angle));
    if (delta < smallestDelta) {
      smallestDelta = delta;
      bestDirection = name;
    }
  }

  return bestDirection;
}

function handleCanvasPointerDown(event) {
  if (activeOverlay) {
    return;
  }

  if (event.pointerType === 'touch') {
    if (activeTouchGesture && activeTouchGesture.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const hex = pickHexFromEvent(event);
    if (hex) {
      setHoveredHex(hex);
    }
    activeTouchGesture = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTime: performance.now(),
      lastHex: hex ?? null,
      deltaX: 0,
      deltaY: 0,
    };
    if (typeof canvas.setPointerCapture === 'function') {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // ignore capture errors on unsupported browsers
      }
    }
    return;
  }

  const hex = pickHexFromEvent(event);
  requestPlayerMove(hex);
}

function handleCanvasPointerMove(event) {
  if (activeOverlay) {
    setHoveredHex(null);
    return;
  }

  const hex = pickHexFromEvent(event);
  setHoveredHex(hex);

  if (
    event.pointerType === 'touch' &&
    activeTouchGesture &&
    activeTouchGesture.pointerId === event.pointerId
  ) {
    activeTouchGesture.lastHex = hex ?? activeTouchGesture.lastHex;
    activeTouchGesture.deltaX = event.clientX - activeTouchGesture.startClientX;
    activeTouchGesture.deltaY = event.clientY - activeTouchGesture.startClientY;
  }
}

function handleCanvasPointerUp(event) {
  if (event.pointerType !== 'touch') {
    return;
  }

  if (!activeTouchGesture || activeTouchGesture.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const gesture = { ...activeTouchGesture };
  clearTouchGesture(event.pointerId);

  const deltaX = gesture.deltaX ?? event.clientX - gesture.startClientX;
  const deltaY = gesture.deltaY ?? event.clientY - gesture.startClientY;
  const distance = Math.hypot(deltaX, deltaY);

  const hex = pickHexFromEvent(event) ?? gesture.lastHex ?? null;

  if (distance >= SWIPE_MIN_DISTANCE_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
    adjustMapZoom(deltaY < 0 ? 1 : -1);
    setHoveredHex(null);
    return;
  }

  if (!hex) {
    setHoveredHex(null);
    return;
  }

  if (distance <= TAP_MOVEMENT_THRESHOLD_PX) {
    processTouchTap(event, hex);
  }

  setHoveredHex(null);
}

function handleCanvasPointerCancel(event) {
  if (event.pointerType !== 'touch') {
    return;
  }
  clearTouchGesture(event.pointerId);
  clearPendingTap();
  setHoveredHex(null);
}

function handleCanvasPointerLeave() {
  if (!hoveredHex) {
    return;
  }
  setHoveredHex(null);
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
    playerVisuals.clear();
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
      playerVisuals.delete(message.payload.playerId);
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
  hoveredHex = null;
  synchronizeVisualsWithWorld();
  renderWorld();
  addSystemMessage('Вы появились в центре пустоши');
  addSystemMessage('Кликните по любому гексу, чтобы переместиться');
}

function updatePlayer(player) {
  const previous = worldState.players.get(player.id) ?? null;
  worldState.players.set(player.id, player);
  updateVisualForPlayer(player, previous);
}

function sendMoveTo(target, { mode } = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage('Команда перемещения отклонена: нет соединения');
    return;
  }
  const payload = { target };
  if (mode) {
    payload.mode = mode;
  }
  socket.send(
    JSON.stringify({ type: 'player:move', payload })
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
  const self = getSelfPlayer();
  if (!self) {
    addSystemMessage('Ожидание соединения с сервером...');
    return;
  }
  const vector = DIRECTION_VECTORS[direction];
  const target = {
    q: self.position.axial.q + vector.q,
    r: self.position.axial.r + vector.r,
  };
  sendMoveTo(target, { mode: 'run' });
});

canvas.addEventListener('pointerdown', handleCanvasPointerDown);
canvas.addEventListener('pointermove', handleCanvasPointerMove);
canvas.addEventListener('pointerup', handleCanvasPointerUp);
canvas.addEventListener('pointercancel', handleCanvasPointerCancel);
canvas.addEventListener('pointerleave', handleCanvasPointerLeave);

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

    const bodyButton = target.closest('[data-role="body-target"]');
    if (bodyButton) {
      event.preventDefault();
      const label = bodyButton.dataset.label ?? bodyButton.textContent?.trim() ?? 'цель';
      const chance = bodyButton.dataset.chance ?? '';
      overlayLayerEl
        .querySelectorAll('[data-role="body-target"]')
        .forEach(btn => {
          btn.classList.toggle('character-target--active', btn === bodyButton);
        });
      const descriptor = chance ? `${label} (${chance})` : label;
      addSystemMessage(`Выбрана цель: ${descriptor}.`);
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
  updateInputModeClass();
  renderWorld();
});

await initializeUi();

addSystemMessage('Загрузка клиента...');
renderWorld();
startGameLoop();
connect();
