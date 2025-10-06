import { decodeFr } from '../fr/decoder.js';
import { getInlineManifest } from './assets/manifestRegistry.js';
import { fetchReleaseResource, isReleaseBaseUrl } from './assets/releaseArchives.js';

const FR_EXTENSIONS = new Set(['.fr', '.frm']);

function resolveExtension(path) {
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path);
  if (!match) {
    return '';
  }
  return `.${match[1].toLowerCase()}`;
}

async function decodeImageBlob(blob) {
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
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось декодировать изображение.'));
    };
    image.src = objectUrl;
  });
}

async function loadImageFrame(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить кадр: ${url} (${response.status})`);
  }
  const blob = await response.blob();
  return decodeImageBlob(blob);
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

function guessMimeTypeFromName(name) {
  const lower = typeof name === 'string' ? name.toLowerCase() : '';
  if (lower.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

function arrayBufferFromTypedArray(typed) {
  if (typed instanceof ArrayBuffer) {
    return typed.slice(0);
  }
  if (!(typed instanceof Uint8Array)) {
    return null;
  }
  return typed.buffer.slice(typed.byteOffset, typed.byteOffset + typed.byteLength);
}

async function fetchResourceFromBases(baseUrls, directory, resourceName, responseType = 'blob') {
  let lastError = null;
  for (const base of baseUrls) {
    if (isReleaseBaseUrl(base)) {
      try {
        const releaseEntry = await fetchReleaseResource(base, directory, resourceName);
        if (!releaseEntry) {
          continue;
        }
        if (responseType === 'arrayBuffer') {
          const buffer = arrayBufferFromTypedArray(releaseEntry.bytes);
          if (buffer) {
            return { data: buffer, url: releaseEntry.url };
          }
        } else {
          const blob = new Blob([releaseEntry.bytes], {
            type: guessMimeTypeFromName(resourceName),
          });
          return { data: blob, url: releaseEntry.url };
        }
      } catch (error) {
        lastError = error;
      }
      continue;
    }

    const directoryBase = joinUrl(base, directory ?? '');
    const resourceUrl = joinUrl(directoryBase, resourceName);
    try {
      const response = await fetch(resourceUrl, { cache: 'no-store' });
      if (!response.ok) {
        lastError = new Error(`Не удалось загрузить ресурс: ${resourceUrl} (${response.status})`);
        continue;
      }
      const data = responseType === 'arrayBuffer'
        ? await response.arrayBuffer()
        : await response.blob();
      return { data, url: resourceUrl };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Не удалось загрузить ресурс ${resourceName}`);
}

async function decodeGifBuffer(buffer) {
  if (typeof ImageDecoder !== 'function') {
    return null;
  }

  try {
    const dataView = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
    const decoder = new ImageDecoder({ data: dataView, type: 'image/gif' });
    const track = decoder.tracks && decoder.tracks.length > 0 ? decoder.tracks[0] : null;
    const frameCount = track?.frameCount ?? 0;

    const frames = [];
    let totalDuration = 0;
    let countedFrames = 0;

    if (frameCount && Number.isFinite(frameCount)) {
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const { image } = await decoder.decode({ frameIndex, completeFramesOnly: true });
        if (!image) {
          continue;
        }
        const width = image.displayWidth ?? image.width ?? 0;
        const height = image.displayHeight ?? image.height ?? 0;
        let durationMs = null;
        if (typeof image.duration === 'number' && image.duration > 0) {
          durationMs = image.duration / 1000;
          totalDuration += durationMs;
          countedFrames += 1;
        }
        frames.push({
          width,
          height,
          bitmap: image,
          anchorX: width / 2,
          anchorY: height,
          durationMs,
        });
      }
    }

    if (frames.length === 0) {
      const { image } = await decoder.decode({ completeFramesOnly: true });
      if (image) {
        const width = image.displayWidth ?? image.width ?? 0;
        const height = image.displayHeight ?? image.height ?? 0;
        const durationMs = typeof image.duration === 'number' && image.duration > 0
          ? image.duration / 1000
          : null;
        if (durationMs) {
          totalDuration += durationMs;
          countedFrames += 1;
        }
        frames.push({
          width,
          height,
          bitmap: image,
          anchorX: width / 2,
          anchorY: height,
          durationMs,
        });
      }
    }

    if (frames.length === 0) {
      return null;
    }

    const averageDuration = countedFrames > 0 ? totalDuration / countedFrames : null;

    return {
      frames,
      frameDurationMs: averageDuration,
    };
  } catch (error) {
    console.warn('[player] Не удалось декодировать GIF через ImageDecoder', error);
    return null;
  }
}

async function loadGifFramesFromBases(baseUrls, directory, gifName) {
  const { data } = await fetchResourceFromBases(baseUrls, directory, gifName, 'arrayBuffer');
  const buffer = data instanceof ArrayBuffer ? data : data.buffer;
  const decoded = await decodeGifBuffer(buffer);
  if (decoded) {
    return decoded;
  }

  const blob = new Blob([buffer], { type: 'image/gif' });
  const { bitmap, width, height } = await decodeImageBlob(blob);
  return {
    frames: [
      {
        width,
        height,
        bitmap,
        anchorX: width / 2,
        anchorY: height,
        durationMs: null,
      },
    ],
    frameDurationMs: null,
  };
}

async function loadFrameFromBases(baseUrls, directory, frameName) {
  const { data: blob } = await fetchResourceFromBases(baseUrls, directory, frameName, 'blob');
  return decodeImageBlob(blob);
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

  if (manifest.includeBasePath !== false) {
    baseCandidates.push(normalizedBase);
  }

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
  const perDirectionDurations = [];

  for (let index = 0; index < effectiveOrder.length; index += 1) {
    const directionKey = effectiveOrder[index];
    const entry = entryMap.get(directionKey) ?? entryMap.get(`dir_${index}`);

    if (!entry) {
      directions.push({ shiftX: 0, shiftY: 0, frames: [] });
      continue;
    }

    const directory = entry.directory ?? directionKey;
    const frameSpecs = Array.isArray(entry.frames) ? entry.frames : [];
    const frames = [];

    for (const frameSpec of frameSpecs) {
      if (typeof frameSpec === 'string') {
        const { bitmap, width, height } = await loadFrameFromBases(
          uniqueBaseCandidates,
          directory,
          frameSpec,
        );
        const anchorX = entry.anchorX ?? manifest.anchorX ?? width / 2;
        const anchorY = entry.anchorY ?? manifest.anchorY ?? height;
        frames.push({
          width,
          height,
          bitmap,
          anchorX,
          anchorY,
          durationMs: null,
        });
        continue;
      }

      if (!frameSpec || typeof frameSpec !== 'object') {
        continue;
      }

      const resourceName = frameSpec.name || frameSpec.file || frameSpec.src || frameSpec.path;
      const isGif =
        frameSpec.type === 'gif'
        || (typeof resourceName === 'string' && /\.gif$/i.test(resourceName));

      if (isGif && typeof resourceName === 'string') {
        const gifResult = await loadGifFramesFromBases(
          uniqueBaseCandidates,
          directory,
          resourceName,
        );

        if (gifResult?.frameDurationMs && gifResult.frameDurationMs > 0) {
          perDirectionDurations.push(gifResult.frameDurationMs);
        }

        if (Array.isArray(gifResult?.frames)) {
          for (const gifFrame of gifResult.frames) {
            if (!gifFrame) {
              continue;
            }
            const width = gifFrame.width ?? 0;
            const height = gifFrame.height ?? 0;
            const anchorX =
              frameSpec.anchorX
              ?? entry.anchorX
              ?? manifest.anchorX
              ?? gifFrame.anchorX
              ?? width / 2;
            const anchorY =
              frameSpec.anchorY
              ?? entry.anchorY
              ?? manifest.anchorY
              ?? gifFrame.anchorY
              ?? height;
            frames.push({
              width,
              height,
              bitmap: gifFrame.bitmap,
              anchorX,
              anchorY,
              durationMs:
                typeof gifFrame.durationMs === 'number' && gifFrame.durationMs > 0
                  ? gifFrame.durationMs
                  : null,
            });
          }
        }
        continue;
      }

      if (typeof resourceName === 'string') {
        const { bitmap, width, height } = await loadFrameFromBases(
          uniqueBaseCandidates,
          directory,
          resourceName,
        );
        const anchorX =
          frameSpec.anchorX ?? entry.anchorX ?? manifest.anchorX ?? width / 2;
        const anchorY =
          frameSpec.anchorY ?? entry.anchorY ?? manifest.anchorY ?? height;
        frames.push({
          width,
          height,
          bitmap,
          anchorX,
          anchorY,
          durationMs: null,
        });
      }
    }

    directions.push({
      id: directionKey,
      shiftX: entry.shiftX ?? manifest.shiftX ?? 0,
      shiftY: entry.shiftY ?? manifest.shiftY ?? 0,
      frames,
    });
  }

  const candidateFps =
    typeof manifest.framesPerSecond === 'number' && manifest.framesPerSecond > 0
      ? manifest.framesPerSecond
      : typeof options.framesPerSecond === 'number' && options.framesPerSecond > 0
        ? options.framesPerSecond
        : null;

  const defaultFrameDuration =
    typeof manifest.frameDurationMs === 'number' && manifest.frameDurationMs > 0
      ? manifest.frameDurationMs
      : candidateFps
        ? 1000 / candidateFps
        : null;

  const averagedGifDuration = perDirectionDurations.length > 0
    ? perDirectionDurations.reduce((sum, value) => sum + value, 0) / perDirectionDurations.length
    : null;

  const frameDurationMs = defaultFrameDuration ?? averagedGifDuration ?? null;
  const framesPerSecond = candidateFps ?? (frameDurationMs ? 1000 / frameDurationMs : null);

  return {
    type: 'image-sequence',
    framesPerSecond,
    frameDurationMs: frameDurationMs ?? 0,
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
