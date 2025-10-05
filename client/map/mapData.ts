export interface MapTileDefinition {
  type: 'tile';
  x: number;
  y: number;
  texture: string;
  textureId: string;
  id: string;
}

export interface MapDefinition {
  name?: string;
  version?: number;
  tiles: MapTileDefinition[];
}

export interface TileTextureRecord {
  id: string;
  image: CanvasImageSource;
  width: number;
  height: number;
  url: string | null;
  placeholder?: boolean;
}

type TextureCacheEntry =
  | (TileTextureRecord & { status: 'loaded' })
  | { status: 'pending'; promise: Promise<TileTextureRecord | null>; id: string }
  | { status: 'error'; id: string; error?: unknown };

const DEFAULT_TILE_TEXTURE_BASES = [
  '',
  '/assets',
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main',
  'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main/assets',
];

export function createTileKey(x: number, y: number): string {
  return `${x}/${y}`;
}

export function normalizeTextureId(raw: string | null | undefined): string {
  if (!raw) {
    return '';
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return '';
  }
  const unified = trimmed.replace(/\\+/g, '/');
  const withoutQuery = unified.split('?')[0]?.split('#')[0] ?? unified;
  const parts = withoutQuery.split('/');
  const sanitized: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      continue;
    }
    sanitized.push(part);
  }
  return sanitized.join('/');
}

function isTileEntry(value: unknown): value is { type?: unknown; x?: unknown; y?: unknown; texture?: unknown } {
  return typeof value === 'object' && value !== null;
}

function normalizeTile(entry: unknown): MapTileDefinition | null {
  if (!isTileEntry(entry)) {
    return null;
  }

  const type = typeof entry.type === 'string' ? entry.type.toLowerCase() : 'tile';
  if (type !== 'tile') {
    return null;
  }

  const rawX = Number((entry as { x?: unknown }).x);
  const rawY = Number((entry as { y?: unknown }).y);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
    return null;
  }

  const x = Math.round(rawX);
  const y = Math.round(rawY);
  const textureRaw = typeof entry.texture === 'string' ? entry.texture : '';
  const textureId = normalizeTextureId(textureRaw);
  const id = createTileKey(x, y);

  return {
    type: 'tile',
    x,
    y,
    texture: textureRaw,
    textureId,
    id,
  };
}

function normalizeTilesCollection(raw: unknown): MapTileDefinition[] {
  const rawTiles: unknown[] = Array.isArray((raw as { tiles?: unknown })?.tiles)
    ? ((raw as { tiles: unknown[] }).tiles)
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];

  const result: MapTileDefinition[] = [];
  const seen = new Set<string>();

  for (const entry of rawTiles) {
    const normalized = normalizeTile(entry);
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized.id)) {
      continue;
    }
    seen.add(normalized.id);
    result.push(normalized);
  }

  return result;
}

export async function loadMapDefinition(url: string): Promise<MapDefinition> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить карту: ${url} (${response.status})`);
  }
  const data = await response.json();
  const tiles = normalizeTilesCollection(data);
  return {
    name: typeof data?.name === 'string' ? data.name : undefined,
    version: typeof data?.version === 'number' ? data.version : undefined,
    tiles,
  };
}

function joinUrl(base: string, path: string): string {
  if (/^[a-z]+:\/\//i.test(path)) {
    return path;
  }
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }
  return `${normalizedBase}/${normalizedPath}`;
}

function buildTextureUrlCandidates(textureId: string, baseUrls: readonly string[]): string[] {
  if (!textureId) {
    return [];
  }
  if (/^[a-z]+:\/\//i.test(textureId)) {
    return [textureId];
  }

  const normalized = textureId.replace(/^\/+/, '');
  const hasExtension = /\.[a-z0-9]+$/i.test(normalized);

  const pathVariants = new Set<string>();
  pathVariants.add(normalized);
  pathVariants.add(`/${normalized}`);

  if (!hasExtension) {
    const base = normalized.replace(/\/+$/, '');
    const lower = base.toLowerCase();
    const candidates = [
      `${base}.png`,
      `${base}.PNG`,
      `${base}/frame_00.png`,
      `${base}/Frame_00.png`,
      `${base}/FRAME_00.PNG`,
      `${base}/dir_0/frame_00.png`,
      `${base}/DIR_0/frame_00.png`,
      `${base}/Dir_0/frame_00.png`,
    ];
    candidates.forEach(candidate => {
      pathVariants.add(candidate);
      pathVariants.add(`/${candidate}`);
      if (candidate !== lower) {
        pathVariants.add(candidate.replace(base, lower));
      }
    });
  }

  const urls = new Set<string>();

  for (const variant of pathVariants) {
    const trimmed = variant.replace(/^\/+/, '');
    urls.add(trimmed);
    urls.add(`/${trimmed}`);
    for (const base of baseUrls) {
      if (!base) {
        continue;
      }
      urls.add(joinUrl(base, trimmed));
    }
  }

  return Array.from(urls);
}

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить изображение: ${url} (${response.status})`);
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Не удалось декодировать изображение: ${url}`));
    };
    image.src = objectUrl;
  });
}

function createPlaceholderTexture(textureId: string): TileTextureRecord {
  const width = 128;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#5f5f5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.fillStyle = '#c6c6c6';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const label = textureId || 'texture';
    const maxWidth = width - 12;
    ctx.save();
    ctx.translate(6, height / 2);
    ctx.rotate(-Math.PI / 8);
    ctx.fillText(label, 0, 0, maxWidth);
    ctx.restore();
  }
  return {
    id: textureId,
    image: canvas,
    width,
    height,
    url: null,
    placeholder: true,
  };
}

async function loadTextureFromCandidates(textureId: string, baseUrls: readonly string[]): Promise<TileTextureRecord> {
  const candidates = buildTextureUrlCandidates(textureId, baseUrls);
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const image = await loadImageFromUrl(candidate);
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      if (width === 0 || height === 0) {
        continue;
      }
      return {
        id: textureId,
        image,
        width,
        height,
        url: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn(`Не удалось загрузить текстуру ${textureId}`, lastError);
  }

  return createPlaceholderTexture(textureId);
}

export function createTileTextureCache(options: { baseUrls?: string[] } = {}) {
  const baseUrls = Array.isArray(options.baseUrls) && options.baseUrls.length > 0
    ? options.baseUrls
    : DEFAULT_TILE_TEXTURE_BASES;

  const cache = new Map<string, TextureCacheEntry>();

  const ensureLoaded = async (rawId: string): Promise<TileTextureRecord | null> => {
    const id = normalizeTextureId(rawId);
    if (!id) {
      return null;
    }

    const existing = cache.get(id);
    if (existing) {
      if (existing.status === 'loaded') {
        return existing;
      }
      if (existing.status === 'pending') {
        return existing.promise;
      }
    }

    const promise = loadTextureFromCandidates(id, baseUrls)
      .then(record => {
        const loaded: TextureCacheEntry = { ...record, status: 'loaded' };
        cache.set(id, loaded);
        return loaded;
      })
      .catch(error => {
        const entry: TextureCacheEntry = { status: 'error', id, error };
        cache.set(id, entry);
        return null;
      });

    cache.set(id, { status: 'pending', id, promise });
    return promise;
  };

  const get = (rawId: string): TileTextureRecord | null => {
    const id = normalizeTextureId(rawId);
    if (!id) {
      return null;
    }
    const entry = cache.get(id);
    if (entry && entry.status === 'loaded') {
      return entry;
    }
    return null;
  };

  return {
    load: ensureLoaded,
    get,
    normalizeId: normalizeTextureId,
  };
}
