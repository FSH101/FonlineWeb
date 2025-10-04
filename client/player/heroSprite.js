import { decodeFr } from '../fr/decoder.js';
import { getInlineManifest } from './assets/manifestRegistry.js';

const FR_EXTENSIONS = new Set(['.fr', '.frm']);

function resolveExtension(path) {
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path);
  if (!match) {
    return '';
  }
  return `.${match[1].toLowerCase()}`;
}

async function loadImageFrame(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить кадр: ${url} (${response.status})`);
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
    image.onerror = event => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Не удалось декодировать кадр: ${url}`));
    };
    image.src = objectUrl;
  });
}

function joinUrl(base, path) {
  if (!path) {
    return base;
  }

  if (/^[a-z]+:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith('/')) {
    return path;
  }

  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

async function loadFrameFromBases(baseUrls, directory, frameName) {
  let lastError = null;
  for (const base of baseUrls) {
    const directoryBase = joinUrl(base, directory ?? '');
    const frameUrl = joinUrl(directoryBase, frameName);
    try {
      return await loadImageFrame(frameUrl);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Не удалось загрузить кадр ${frameName}`);
}

async function loadImageSequenceAnimation(basePath, options = {}) {
  const normalizedBase = basePath.replace(/\/+$/, '');
  const inlineManifest = getInlineManifest(normalizedBase);

  let manifest;

  if (inlineManifest) {
    manifest = inlineManifest;
  } else {
    const manifestUrl = `${normalizedBase}/manifest.json`;
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Не удалось загрузить manifest.json для ${basePath} (${response.status})`);
    }
    manifest = await response.json();
  }

  const baseCandidates = [];

  if (Array.isArray(manifest.baseUrls)) {
    baseCandidates.push(...manifest.baseUrls);
  }

  if (typeof manifest.baseUrl === 'string') {
    baseCandidates.push(manifest.baseUrl);
  }

  baseCandidates.push(normalizedBase);

  const uniqueBaseCandidates = [];
  const seenBases = new Set();

  for (const candidate of baseCandidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (!normalized || seenBases.has(normalized)) {
      continue;
    }
    seenBases.add(normalized);
    uniqueBaseCandidates.push(normalized);
  }

  if (uniqueBaseCandidates.length === 0) {
    uniqueBaseCandidates.push(normalizeBaseUrl(normalizedBase) || normalizedBase);
  }

  const manifestOrder = Array.isArray(manifest.directionOrder)
    ? manifest.directionOrder.filter(Boolean)
    : [];
  const directionEntries = Array.isArray(manifest.directions) ? manifest.directions : [];

  const entryMap = new Map();
  for (const entry of directionEntries) {
    const key = entry?.id || entry?.directory;
    if (!key) {
      continue;
    }
    entryMap.set(key, entry);
  }

  const effectiveOrder = manifestOrder.length > 0
    ? manifestOrder
    : Array.from({ length: entryMap.size }, (_, index) => `dir_${index}`);

  const directions = [];

  for (let index = 0; index < effectiveOrder.length; index += 1) {
    const directionKey = effectiveOrder[index];
    const entry = entryMap.get(directionKey) ?? entryMap.get(`dir_${index}`);

    if (!entry) {
      directions.push({ shiftX: 0, shiftY: 0, frames: [] });
      continue;
    }

    const directory = entry.directory ?? directionKey;
    const frameNames = Array.isArray(entry.frames) ? entry.frames : [];

    const frames = await Promise.all(
      frameNames.map(async frameName => {
        const { bitmap, width, height } = await loadFrameFromBases(
          uniqueBaseCandidates,
          directory,
          frameName,
        );
        const anchorX = entry.anchorX ?? manifest.anchorX ?? width / 2;
        const anchorY = entry.anchorY ?? manifest.anchorY ?? height;
        return {
          width,
          height,
          bitmap,
          anchorX,
          anchorY,
        };
      })
    );

    directions.push({
      id: directionKey,
      shiftX: entry.shiftX ?? manifest.shiftX ?? 0,
      shiftY: entry.shiftY ?? manifest.shiftY ?? 0,
      frames,
    });
  }

  const framesPerSecond = manifest.framesPerSecond ?? options.framesPerSecond ?? 10;
  const frameDurationMs = manifest.frameDurationMs ?? (framesPerSecond > 0 ? 1000 / framesPerSecond : 100);

  return {
    type: 'image-sequence',
    framesPerSecond,
    frameDurationMs,
    directions,
    directionOrder: effectiveOrder,
  };
}

export async function loadDirectionalAnimation(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить анимацию: ${url} (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return decodeFr(buffer, options);
}

export async function tryLoadAnimation(url, options = {}) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (FR_EXTENSIONS.has(resolveExtension(trimmed))) {
      return await loadDirectionalAnimation(trimmed, options);
    }
    return await loadImageSequenceAnimation(trimmed, options);
  } catch (error) {
    console.error(`[player] Ошибка загрузки анимации ${trimmed}`, error);
    return null;
  }
}
