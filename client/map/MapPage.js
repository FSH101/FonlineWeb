import {
  TILE_W,
  TILE_H,
  HALF_TILE_W,
  HALF_TILE_H,
  drawFloorGrid,
  trimTileImage,
} from './MapRenderer.js';

const canvas = document.getElementById('map');
let ctx = canvas?.getContext('2d') ?? null;

const TILE_TEXTURE_SOURCES = [
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main/assets/object/item/BRICK01/dir_0/frame_00.png',
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/master/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/client/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/assets/tiles/floor_80x36.png',
];

const GRID_COLS = 30;
const GRID_ROWS = 30;

const canvasState = {
  width: 0,
  height: 0,
  dpr: 1,
};

const v1 = { x: HALF_TILE_W, y: HALF_TILE_H };
const v2 = { x: -HALF_TILE_W, y: HALF_TILE_H };
const v3 = { x: TILE_W, y: 0 };

let tileImage = null;
let hexOrigin = { x: 0, y: 0 };
let floorOrigin = { x: 0, y: 0 };

function setupCanvas(target, context) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = target.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width));
  const cssHeight = Math.max(1, Math.round(rect.height));
  const physicalWidth = Math.max(1, Math.round(cssWidth * dpr));
  const physicalHeight = Math.max(1, Math.round(cssHeight * dpr));

  target.width = physicalWidth;
  target.height = physicalHeight;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;

  canvasState.width = cssWidth;
  canvasState.height = cssHeight;
  canvasState.dpr = dpr;
}

function updateOrigins() {
  const gridWidth = (GRID_COLS + GRID_ROWS) * HALF_TILE_W;
  const gridHeight = (GRID_COLS + GRID_ROWS) * HALF_TILE_H;
  const originX = Math.round(canvasState.width / 2);
  const originY = Math.round(canvasState.height / 2 - gridHeight / 2 + TILE_H / 2);

  floorOrigin = { x: originX, y: originY };
  hexOrigin = { x: originX, y: originY - HALF_TILE_H };
}

function resize() {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  ctx = context;
  setupCanvas(canvas, context);
  updateOrigins();
}

async function loadImageSequentially(sources) {
  for (const source of sources) {
    const url = source.trim();
    if (!url) {
      continue;
    }
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`failed to load ${url}`));
        image.src = url;
      });
      return img;
    } catch (error) {
      console.warn('Не удалось загрузить плитку пола', url, error);
    }
  }
  throw new Error('Нет доступных источников плитки пола');
}

async function ensureTileImage() {
  if (tileImage || !ctx) {
    return;
  }

  try {
    const image = await loadImageSequentially(TILE_TEXTURE_SOURCES);
    tileImage = trimTileImage(image);
    render();
  } catch (error) {
    console.error(error);
  }
}

function prepareFrame() {
  if (!canvas || !ctx) {
    return;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.setTransform(canvasState.dpr, 0, 0, canvasState.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function hexCenter(q, r) {
  const x = Math.round(hexOrigin.x + q * v1.x + r * v2.x);
  const y = Math.round(hexOrigin.y + q * v1.y + r * v2.y);
  return { x, y };
}

function hexPolygonPoints(centerX, centerY) {
  return [
    { x: Math.round(centerX + 0.5 * v1.x), y: Math.round(centerY + 0.5 * v1.y) },
    { x: Math.round(centerX + 0.5 * v3.x), y: Math.round(centerY + 0.5 * v3.y) },
    { x: Math.round(centerX - 0.5 * v2.x), y: Math.round(centerY - 0.5 * v2.y) },
    { x: Math.round(centerX - 0.5 * v1.x), y: Math.round(centerY - 0.5 * v1.y) },
    { x: Math.round(centerX - 0.5 * v3.x), y: Math.round(centerY - 0.5 * v3.y) },
    { x: Math.round(centerX + 0.5 * v2.x), y: Math.round(centerY + 0.5 * v2.y) },
  ];
}

function strokeHex(centerX, centerY) {
  if (!ctx) {
    return;
  }

  const points = hexPolygonPoints(centerX, centerY);
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function drawHexGrid(qMin, qMax, rMin, rMax) {
  if (!ctx) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(64, 255, 128, 0.7)';
  ctx.beginPath();
  for (let r = rMin; r <= rMax; r += 1) {
    for (let q = qMin; q <= qMax; q += 1) {
      const { x, y } = hexCenter(q, r);
      strokeHex(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawOriginMarker() {
  if (!ctx) {
    return;
  }
  const { x, y } = hexCenter(0, 0);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 96, 64, 0.9)';
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.restore();
}

function render() {
  if (!canvas || !ctx) {
    return;
  }

  prepareFrame();

  ctx.fillStyle = '#010101';
  ctx.fillRect(0, 0, canvasState.width, canvasState.height);

  if (tileImage) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawFloorGrid(ctx, tileImage, GRID_COLS, GRID_ROWS, floorOrigin.x, floorOrigin.y);
    ctx.restore();

    const qMin = -GRID_ROWS;
    const qMax = GRID_COLS;
    const rMin = -GRID_ROWS;
    const rMax = GRID_COLS;
    drawHexGrid(qMin, qMax, rMin, rMax);
    drawOriginMarker();
  }
}

window.addEventListener('resize', () => {
  resize();
  render();
});

resize();
render();
ensureTileImage();
