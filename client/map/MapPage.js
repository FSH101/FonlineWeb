import { TILE_W, TILE_H, drawFloorGrid } from './MapRenderer.js';

const canvas = document.getElementById('map');
const ctx = canvas ? canvas.getContext('2d') : null;

const TILE_TEXTURE_SOURCES = [
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main/assets/object/item/BRICK01/dir_0/frame_00.png',
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/master/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/client/assets/object/item/BRICK01/dir_0/frame_00.png',
  '/assets/tiles/floor_80x36.png',
];

let tileImage = null;

function resize() {
  if (!canvas || !ctx) {
    return;
  }

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
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
    tileImage = await loadImageSequentially(TILE_TEXTURE_SOURCES);
    render();
  } catch (error) {
    console.error(error);
  }
}

function render() {
  if (!canvas || !ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (tileImage) {
    const cols = 30;
    const rows = 30;
    const gridW = (cols + rows) * (TILE_W / 2);
    const gridH = (cols + rows) * (TILE_H / 2);
    const originX = Math.floor(canvas.clientWidth / 2);
    const originY = Math.floor(canvas.clientHeight / 2 - gridH / 2 + TILE_H / 2);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawFloorGrid(ctx, tileImage, cols, rows, originX, originY);
    ctx.restore();
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

window.addEventListener('resize', () => {
  resize();
  render();
});

resize();
render();
ensureTileImage();
