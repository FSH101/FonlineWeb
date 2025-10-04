export const TILE_W = 80;
export const TILE_H = 36;

export function tileCenter(col, row) {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

export function drawTile(ctx, img, col, row, originX, originY) {
  const { x, y } = tileCenter(col, row);
  ctx.drawImage(img, originX + x - TILE_W / 2, originY + y - TILE_H / 2);
}

export function drawFloorGrid(ctx, img, cols, rows, originX, originY) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawTile(ctx, img, c, r, originX, originY);
    }
  }
}
