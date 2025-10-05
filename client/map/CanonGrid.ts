export const HEX_W = 120;
export const HEX_H = HEX_W / 2;
export const HALF_HEX_W = HEX_W / 2;
export const HALF_HEX_H = HEX_H / 2;
export const HEX_H_QUARTER = HEX_H / 4;
export const THREE_QUARTER_HEX_H = (3 * HEX_H) / 4;

export type Point = { x: number; y: number };

export const AXIAL_Q_VECTOR: Point = {
  x: HALF_HEX_W,
  y: THREE_QUARTER_HEX_H,
};

export const AXIAL_R_VECTOR: Point = {
  x: -HALF_HEX_W,
  y: THREE_QUARTER_HEX_H,
};

export const AXIAL_Q_MINUS_R_VECTOR: Point = {
  x: AXIAL_Q_VECTOR.x - AXIAL_R_VECTOR.x,
  y: AXIAL_Q_VECTOR.y - AXIAL_R_VECTOR.y,
};

export interface CanvasMetrics {
  ctx: CanvasRenderingContext2D;
  cw: number;
  ch: number;
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasMetrics {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width));
  const cssHeight = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  return { ctx, cw: cssWidth, ch: cssHeight };
}

export function hexPolygonPoints(cx: number, cy: number): Point[] {
  return [
    { x: Math.round(cx), y: Math.round(cy - HALF_HEX_H) },
    { x: Math.round(cx + HALF_HEX_W), y: Math.round(cy - HEX_H_QUARTER) },
    { x: Math.round(cx + HALF_HEX_W), y: Math.round(cy + HEX_H_QUARTER) },
    { x: Math.round(cx), y: Math.round(cy + HALF_HEX_H) },
    { x: Math.round(cx - HALF_HEX_W), y: Math.round(cy + HEX_H_QUARTER) },
    { x: Math.round(cx - HALF_HEX_W), y: Math.round(cy - HEX_H_QUARTER) },
  ];
}

export function tracePolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (!pts.length) {
    return;
  }
  ctx.moveTo(Math.round(pts[0].x), Math.round(pts[0].y));
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(Math.round(pts[i].x), Math.round(pts[i].y));
  }
  ctx.closePath();
}

export function fillPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.fill();
}

export function strokePolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.stroke();
}

export function tileIndexToAxial(i: number, j: number): { q: number; r: number } {
  const q = 2 * i + j;
  const r = -4 * i;
  return { q, r };
}

export function tileQuad(origin: Point, i: number, j: number): Point[] {
  const { q, r } = tileIndexToAxial(i, j);
  const v0 = axialToPixel(q, r, origin);
  const v1 = axialToPixel(q + 2, r - 4, origin);
  const v2 = axialToPixel(q + 3, r - 4, origin);
  const v3 = axialToPixel(q + 1, r, origin);
  return [v0, v1, v2, v3];
}

export function axialToPixel(q: number, r: number, origin: Point = { x: 0, y: 0 }): Point {
  const x = origin.x + q * AXIAL_Q_VECTOR.x + r * AXIAL_R_VECTOR.x;
  const y = origin.y + q * AXIAL_Q_VECTOR.y + r * AXIAL_R_VECTOR.y;
  return { x: Math.round(x), y: Math.round(y) };
}

export function pixelToAxial(x: number, y: number, origin: Point = { x: 0, y: 0 }) {
  const px = x - origin.x;
  const py = y - origin.y;
  const q = px / HEX_W + (2 * py) / (3 * HEX_H);
  const r = -px / HEX_W + (2 * py) / (3 * HEX_H);
  return { q, r };
}

export type HexEdge = { a: Point; b: Point };

export function uniqueHexEdges(points: { center: Point }[]): HexEdge[] {
  const edges = new Map<string, HexEdge>();
  const addEdge = (a: Point, b: Point) => {
    const ax = Math.round(a.x);
    const ay = Math.round(a.y);
    const bx = Math.round(b.x);
    const by = Math.round(b.y);
    const key = ax < bx || (ax === bx && ay <= by)
      ? `${ax}:${ay}|${bx}:${by}`
      : `${bx}:${by}|${ax}:${ay}`;
    if (!edges.has(key)) {
      edges.set(key, {
        a: { x: ax, y: ay },
        b: { x: bx, y: by },
      });
    }
  };

  points.forEach(({ center }) => {
    const polygon = hexPolygonPoints(center.x, center.y);
    for (let i = 0; i < polygon.length; i += 1) {
      const from = polygon[i];
      const to = polygon[(i + 1) % polygon.length];
      addEdge(from, to);
    }
  });

  return Array.from(edges.values());
}

const selected = new Set<string>();
let metricsCache: CanvasMetrics | null = null;

function renderAll(canvas: HTMLCanvasElement) {
  metricsCache = setupCanvas(canvas);
  const { ctx, cw, ch } = metricsCache;
  ctx.clearRect(0, 0, cw, ch);

  const origin: Point = { x: Math.round(cw / 2), y: Math.round(ch / 2) };

  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 1;

  const tileRadius = 16;
  const centerMap = new Map<string, { key: string; center: Point }>();

  for (let j = -tileRadius; j <= tileRadius; j += 1) {
    for (let i = -tileRadius; i <= tileRadius; i += 1) {
      const quad = tileQuad(origin, i, j);
      fillPolygon(ctx, quad);
      strokePolygon(ctx, quad);
      quad.forEach(vertex => {
        const key = `${vertex.x}:${vertex.y}`;
        if (!centerMap.has(key)) {
          centerMap.set(key, { key, center: { x: vertex.x, y: vertex.y } });
        }
      });
    }
  }

  const centers = Array.from(centerMap.values());

  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  uniqueHexEdges(centers).forEach(({ a, b }) => {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();

  if (selected.size > 0) {
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    selected.forEach(key => {
      const entry = centerMap.get(key);
      if (!entry) {
        selected.delete(key);
        return;
      }
      const polygon = hexPolygonPoints(entry.center.x, entry.center.y);
      ctx.beginPath();
      tracePolygon(ctx, polygon);
      ctx.stroke();
    });
  }
}

function attachInteraction(canvas: HTMLCanvasElement) {
  canvas.addEventListener('click', event => {
    if (!metricsCache) {
      metricsCache = setupCanvas(canvas);
    }
    const rect = canvas.getBoundingClientRect();
    const localX = Math.round(event.clientX - rect.left);
    const localY = Math.round(event.clientY - rect.top);
    const origin: Point = {
      x: Math.round(metricsCache.cw / 2),
      y: Math.round(metricsCache.ch / 2),
    };

    const axial = pixelToAxial(localX, localY, origin);
    const roundedQ = Math.round(axial.q);
    const roundedR = Math.round(axial.r);
    const center = axialToPixel(roundedQ, roundedR, origin);
    const key = `${center.x}:${center.y}`;

    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }

    renderAll(canvas);
  });
}

export function bootstrapCanonicalGrid(canvas: HTMLCanvasElement | null) {
  if (!canvas) {
    return;
  }
  renderAll(canvas);
  attachInteraction(canvas);
  window.addEventListener('resize', () => renderAll(canvas));
}

const defaultCanvas = document.getElementById('grid') as HTMLCanvasElement | null;
if (defaultCanvas) {
  bootstrapCanonicalGrid(defaultCanvas);
}
