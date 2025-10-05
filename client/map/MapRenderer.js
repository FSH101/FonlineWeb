export const TILE_W = 80;
export const TILE_H = 36;
export const HALF_TILE_W = TILE_W / 2;
export const HALF_TILE_H = TILE_H / 2;

export function tileCenter(col, row) {
  const x = Math.round((col - row) * HALF_TILE_W);
  const y = Math.round((col + row) * HALF_TILE_H);
  return { x, y };
}

export function drawTile(ctx, img, col, row, originX, originY) {
  const { x, y } = tileCenter(col, row);
  const drawX = Math.round(originX + x - TILE_W / 2);
  const drawY = Math.round(originY + y - TILE_H / 2);
  ctx.drawImage(img, drawX, drawY);
}

export function drawFloorGrid(
  ctx,
  img,
  cols,
  rows,
  originX,
  originY,
  options = {}
) {
  const startCol = options.startCol ?? 0;
  const startRow = options.startRow ?? 0;

  for (let r = 0; r < rows; r += 1) {
    const rowIndex = startRow + r;
    for (let c = 0; c < cols; c += 1) {
      const colIndex = startCol + c;
      drawTile(ctx, img, colIndex, rowIndex, originX, originY);
    }
  }
}

export function trimTileImage(image) {
  const naturalWidth = image.naturalWidth || image.width || 0;
  const naturalHeight = image.naturalHeight || image.height || 0;

  if (!naturalWidth || !naturalHeight) {
    return image;
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = naturalWidth;
  tempCanvas.height = naturalHeight;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  if (!tempCtx) {
    return image;
  }

  tempCtx.drawImage(image, 0, 0);

  let top = naturalHeight;
  let bottom = -1;
  let left = naturalWidth;
  let right = -1;

  try {
    const { data } = tempCtx.getImageData(0, 0, naturalWidth, naturalHeight);
    for (let y = 0; y < naturalHeight; y += 1) {
      for (let x = 0; x < naturalWidth; x += 1) {
        const alpha = data[(y * naturalWidth + x) * 4 + 3];
        if (alpha > 0) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
  } catch (error) {
    console.warn('Не удалось обрезать прозрачные края тайла', error);
    return image;
  }

  if (right < left || bottom < top) {
    return image;
  }

  const trimWidth = right - left + 1;
  const trimHeight = bottom - top + 1;

  if (
    trimWidth === naturalWidth &&
    trimHeight === naturalHeight &&
    left === 0 &&
    top === 0
  ) {
    return image;
  }

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimWidth;
  trimmedCanvas.height = trimHeight;
  const trimmedCtx = trimmedCanvas.getContext('2d');

  if (!trimmedCtx) {
    return image;
  }

  trimmedCtx.drawImage(
    tempCanvas,
    left,
    top,
    trimWidth,
    trimHeight,
    0,
    0,
    trimWidth,
    trimHeight
  );

  return trimmedCanvas;
}
