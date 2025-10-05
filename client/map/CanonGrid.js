export const HEX_W = 120;
export const HEX_H = HEX_W / 2;
export const HALF_HEX_W = HEX_W / 2;
export const HALF_HEX_H = HEX_H / 2;
export const HEX_H_QUARTER = HEX_H / 4;
export const THREE_QUARTER_HEX_H = (3 * HEX_H) / 4;

export const AXIAL_Q_VECTOR = {
  x: HALF_HEX_W,
  y: THREE_QUARTER_HEX_H,
};

export const AXIAL_R_VECTOR = {
  x: -HALF_HEX_W,
  y: THREE_QUARTER_HEX_H,
};

export const AXIAL_Q_MINUS_R_VECTOR = {
  x: AXIAL_Q_VECTOR.x - AXIAL_R_VECTOR.x,
  y: AXIAL_Q_VECTOR.y - AXIAL_R_VECTOR.y,
};

export const DIAMOND_E1 = {
  x: 3 * HALF_HEX_W,
  y: -THREE_QUARTER_HEX_H,
};

export const DIAMOND_E2 = {
  x: HALF_HEX_W,
  y: THREE_QUARTER_HEX_H,
};

export function setupCanvas(canvas) {
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

export function hexPolygonPoints(cx, cy) {
  return [
    { x: Math.round(cx), y: Math.round(cy - HALF_HEX_H) },
    { x: Math.round(cx + HALF_HEX_W), y: Math.round(cy - HEX_H_QUARTER) },
    { x: Math.round(cx + HALF_HEX_W), y: Math.round(cy + HEX_H_QUARTER) },
    { x: Math.round(cx), y: Math.round(cy + HALF_HEX_H) },
    { x: Math.round(cx - HALF_HEX_W), y: Math.round(cy + HEX_H_QUARTER) },
    { x: Math.round(cx - HALF_HEX_W), y: Math.round(cy - HEX_H_QUARTER) },
  ];
}

export function tracePolygon(ctx, pts) {
  if (!pts.length) {
    return;
  }
  ctx.moveTo(Math.round(pts[0].x), Math.round(pts[0].y));
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(Math.round(pts[i].x), Math.round(pts[i].y));
  }
  ctx.closePath();
}

export function fillPolygon(ctx, pts) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.fill();
}

export function strokePolygon(ctx, pts) {
  ctx.beginPath();
  tracePolygon(ctx, pts);
  ctx.stroke();
}

export function tileQuad(origin, i, j) {
  const offsetX = DIAMOND_E1.x * i + DIAMOND_E2.x * j;
  const offsetY = DIAMOND_E1.y * i + DIAMOND_E2.y * j;
  const v0 = {
    x: Math.round(origin.x + offsetX),
    y: Math.round(origin.y + offsetY),
  };
  const v1 = {
    x: Math.round(v0.x + DIAMOND_E1.x),
    y: Math.round(v0.y + DIAMOND_E1.y),
  };
  const v2 = {
    x: Math.round(v1.x + DIAMOND_E2.x),
    y: Math.round(v1.y + DIAMOND_E2.y),
  };
  const v3 = {
    x: Math.round(v0.x + DIAMOND_E2.x),
    y: Math.round(v0.y + DIAMOND_E2.y),
  };
  return [v0, v1, v2, v3];
}

export function axialToPixel(q, r, origin = { x: 0, y: 0 }) {
  const x = origin.x + q * AXIAL_Q_VECTOR.x + r * AXIAL_R_VECTOR.x;
  const y = origin.y + q * AXIAL_Q_VECTOR.y + r * AXIAL_R_VECTOR.y;
  return { x: Math.round(x), y: Math.round(y) };
}

export function pixelToAxial(x, y, origin = { x: 0, y: 0 }) {
  const px = x - origin.x;
  const py = y - origin.y;
  const q = px / HEX_W + (2 * py) / (3 * HEX_H);
  const r = -px / HEX_W + (2 * py) / (3 * HEX_H);
  return { q, r };
}

export function uniqueHexEdges(points) {
  const edges = new Map();
  const addEdge = (a, b) => {
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

const selected = new Set();
let metricsCache = null;

function renderAll(canvas) {
  metricsCache = setupCanvas(canvas);
  const { ctx, cw, ch } = metricsCache;
  ctx.clearRect(0, 0, cw, ch);

  const origin = { x: Math.round(cw / 2), y: Math.round(ch / 2) };

  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 1;

  const tileRadius = 16;
  const centerMap = new Map();

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

function attachInteraction(canvas) {
  canvas.addEventListener('click', event => {
    if (!metricsCache) {
      metricsCache = setupCanvas(canvas);
    }
    const rect = canvas.getBoundingClientRect();
    const localX = Math.round(event.clientX - rect.left);
    const localY = Math.round(event.clientY - rect.top);
    const origin = {
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

export function bootstrapCanonicalGrid(canvas) {
  if (!canvas) {
    return;
  }
  renderAll(canvas);
  attachInteraction(canvas);
  window.addEventListener('resize', () => renderAll(canvas));
}

const defaultCanvas = document.getElementById('grid');
if (defaultCanvas) {
  bootstrapCanonicalGrid(defaultCanvas);
}
