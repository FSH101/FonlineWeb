export const TILE_W = 80;
export const TILE_H = 36;

export function tileCenter(col: number, row: number) {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  col: number,
  row: number,
  originX: number,
  originY: number
) {
  const { x, y } = tileCenter(col, row);
  ctx.drawImage(img, originX + x - TILE_W / 2, originY + y - TILE_H / 2);
}

export function drawFloorGrid(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
  originX: number,
  originY: number
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawTile(ctx, img, c, r, originX, originY);
    }
  }
}
