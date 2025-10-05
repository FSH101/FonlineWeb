const HEX_W = 120;
const HEX_H = HEX_W / 2;

export type Point = { x: number; y: number };

const E: Point = { x: +HEX_W, y: 0 };
const NW: Point = { x: -HEX_W / 2, y: - (3 * HEX_H) / 4 };

const e1: Point = { x: (3 * HEX_W) / 2, y: - (3 * HEX_H) / 4 };
const e2: Point = { x: HEX_W / 2, y: (3 * HEX_H) / 4 };

interface CanvasMetrics {
  ctx: CanvasRenderingContext2D;
  cw: number;
  ch: number;
}

function setupCanvas(canvas: HTMLCanvasElement): CanvasMetrics {
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

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mul(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}

function hexPoly(cx: number, cy: number): Point[] {
  const w = HEX_W;
  const h = HEX_H;
  return [
    { x: cx + 0, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 4 },
    { x: cx + w / 2, y: cy + h / 4 },
    { x: cx + 0, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 4 },
    { x: cx - w / 2, y: cy - h / 4 },
  ];
}

function tracePolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length === 0) {
    return;
  }
  ctx.moveTo(Math.round(pts[0].x), Math.round(pts[0].y));
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(Math.round(pts[i].x), Math.round(pts[i].y));
  }
  ctx.closePath();
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.fill();
}

function strokePoly(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.stroke();
}

function tileQuad(origin: Point, i: number, j: number): Point[] {
  const offset = add(mul(e1, i), mul(e2, j));
  const v0 = add(origin, offset);
  const v1 = add(v0, e1);
  const v2 = add(v1, e2);
  const v3 = add(v0, e2);
  return [v0, v1, v2, v3];
}

function screenToQR(x: number, y: number, origin: Point) {
  const px = x - origin.x;
  const py = y - origin.y;
  const r = Math.round((-8 * py) / (3 * HEX_W));
  const q = Math.round(px / HEX_W - (4 * py) / (3 * HEX_W));
  return { q, r };
}

function hexCenter(q: number, r: number, origin: Point): Point {
  const cx = origin.x + q * E.x + r * NW.x;
  const cy = origin.y + q * E.y + r * NW.y;
  return { x: Math.round(cx), y: Math.round(cy) };
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
  const vertexKeys = new Set<string>();
  const addVertex = (p: Point) => {
    const vx = Math.round(p.x);
    const vy = Math.round(p.y);
    vertexKeys.add(`${vx}:${vy}`);
  };

  for (let j = -tileRadius; j <= tileRadius; j += 1) {
    for (let i = -tileRadius; i <= tileRadius; i += 1) {
      const quad = tileQuad(origin, i, j);
      fillPoly(ctx, quad);
      strokePoly(ctx, quad);
      quad.forEach(addVertex);
    }
  }

  const centers = Array.from(vertexKeys, (key) => {
    const [sx, sy] = key.split(':').map(Number);
    return { key, point: { x: sx, y: sy } };
  });

  const centerLookup = new Map<string, Point>();
  centers.forEach(({ key, point }) => {
    centerLookup.set(key, point);
  });

  type Edge = { a: Point; b: Point };
  const edges = new Map<string, Edge>();
  const storeEdge = (a: Point, b: Point) => {
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

  centers.forEach(({ point }) => {
    const poly = hexPoly(point.x, point.y);
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      storeEdge(a, b);
    }
  });

  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  edges.forEach(({ a, b }) => {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();

  if (selected.size > 0) {
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    const keys = Array.from(selected);
    keys.forEach((key) => {
      const center = centerLookup.get(key);
      if (!center) {
        selected.delete(key);
        return;
      }
      const poly = hexPoly(center.x, center.y);
      ctx.beginPath();
      tracePolygon(ctx, poly);
      ctx.stroke();
    });
  }
}

function attachInteraction(canvas: HTMLCanvasElement) {
  canvas.addEventListener('click', (event) => {
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
    const { q, r } = screenToQR(localX, localY, origin);
    const center = hexCenter(q, r, origin);
    const key = `${center.x}:${center.y}`;
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    renderAll(canvas);
  });
}

function bootstrap() {
  const canvas = document.getElementById('grid') as HTMLCanvasElement | null;
  if (!canvas) {
    return;
  }
  renderAll(canvas);
  attachInteraction(canvas);
  window.addEventListener('resize', () => renderAll(canvas));
}

bootstrap();
