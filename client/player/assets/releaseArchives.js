import { unzip } from '../../lib/fflate.module.js';

const RELEASE_SCHEME = 'release:';

const releaseDefinitions = {
  'fr_gifs_pack': {
    id: 'fr_gifs_pack',
    label: 'FR GIF Pack 2025-10-05',
    url: 'https://github.com/FSH101/FonlineWeb/releases/download/fr-gifs-20251005-175324/fr_gifs_pack.zip',
    nestedZip: 'fr_gifs_pack.zip',
    rootDir: 'gif',
  },
};

const releaseArchivePromises = new Map();

function normalizeArchiveId(id) {
  return typeof id === 'string' ? id.trim().toLowerCase() : '';
}

function normalizePathPreserveCase(path) {
  if (!path) {
    return '';
  }
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\/?/, '')
    .replace(/\/+/g, '/');
}

function normalizeArchivePath(path) {
  return normalizePathPreserveCase(path).toLowerCase();
}

function stripTrailingSlash(path) {
  if (!path) {
    return '';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function joinArchiveSegments(...segments) {
  const parts = [];
  for (const segment of segments) {
    if (segment == null) {
      continue;
    }
    const trimmed = String(segment).trim();
    if (!trimmed) {
      continue;
    }
    const canonical = normalizePathPreserveCase(trimmed);
    const subParts = canonical.split('/').filter(Boolean);
    if (subParts.length > 0) {
      parts.push(subParts.join('/'));
    }
  }
  return parts.join('/');
}




function extractArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) {
    return bytes.slice(0);
  }
  if (!(bytes instanceof Uint8Array)) {
    return null;
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function unzipToEntryMap(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      unzip(bytes, (error, entries) => {
        if (error) {
          reject(error);
          return;
        }
        const result = new Map();
        for (const [entryName, data] of Object.entries(entries || {})) {
          if (!(data instanceof Uint8Array)) {
            continue;
          }
          if (data.length === 0) {
            continue;
          }
          const canonical = normalizePathPreserveCase(entryName);
          if (!canonical || canonical === '/') {
            continue;
          }
          if (canonical.endsWith('/')) {
            continue;
          }
          const sanitized = stripTrailingSlash(canonical);
          if (!sanitized) {
            continue;
          }
          const normalized = sanitized.toLowerCase();
          if (!normalized) {
            continue;
          }
          result.set(normalized, {
            originalPath: sanitized,
            bytes: data,
          });
        }
        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function loadReleaseArchive(archiveId) {
  const normalizedId = normalizeArchiveId(archiveId);
  const definition = releaseDefinitions[normalizedId];
  if (!definition) {
    throw new Error(`Неизвестный архив релиза: ${archiveId}`);
  }

  const response = await fetch(definition.url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить архив ${definition.url} (${response.status} ${response.statusText})`,
    );
  }

  const buffer = await response.arrayBuffer();
  let entries = await unzipToEntryMap(buffer);

  if (definition.nestedZip) {
    const nestedNormalized = normalizeArchivePath(definition.nestedZip);
    let nestedEntry = entries.get(nestedNormalized) ?? null;
    if (!nestedEntry) {
      for (const [key, value] of entries.entries()) {
        if (key.endsWith(`/${nestedNormalized}`)) {
          nestedEntry = value;
          break;
        }
      }
    }

    if (!nestedEntry) {
      throw new Error(`В архиве ${definition.url} отсутствует вложенный zip ${definition.nestedZip}`);
    }

    entries = await unzipToEntryMap(extractArrayBuffer(nestedEntry.bytes));
  }

  const rootCanonical = normalizePathPreserveCase(definition.rootDir || '');
  const rootNormalized = rootCanonical ? rootCanonical.toLowerCase() : '';
  const rootLength = rootCanonical ? rootCanonical.length : 0;

  const filtered = new Map();
  for (const [normalizedPath, entry] of entries.entries()) {
    let relativeNormalized = normalizedPath;
    let relativeOriginal = entry.originalPath;

    if (rootNormalized) {
      if (!normalizedPath.startsWith(`${rootNormalized}/`)) {
        continue;
      }
      relativeNormalized = normalizedPath.slice(rootNormalized.length + 1);
      relativeOriginal = entry.originalPath.slice(rootLength + 1);
    }

    if (!relativeNormalized) {
      continue;
    }

    if (!filtered.has(relativeNormalized)) {
      filtered.set(relativeNormalized, {
        bytes: entry.bytes,
        originalPath: relativeOriginal,
      });
    }
  }

  return {
    id: normalizedId,
    definition,
    files: filtered,
  };
}

async function ensureArchive(archiveId) {
  const normalizedId = normalizeArchiveId(archiveId);
  if (!normalizedId) {
    return null;
  }
  const existing = releaseArchivePromises.get(normalizedId);
  if (existing) {
    return existing;
  }
  const promise = loadReleaseArchive(normalizedId).catch(error => {
    releaseArchivePromises.delete(normalizedId);
    throw error;
  });
  releaseArchivePromises.set(normalizedId, promise);
  return promise;
}

export function isReleaseBaseUrl(candidate) {
  return typeof candidate === 'string' && candidate.toLowerCase().startsWith(RELEASE_SCHEME);
}

export function parseReleaseBaseUrl(baseUrl) {
  if (!isReleaseBaseUrl(baseUrl)) {
    return null;
  }
  const withoutScheme = baseUrl.slice(RELEASE_SCHEME.length);
  const [rawId, ...rest] = withoutScheme.split('/');
  const archiveId = normalizeArchiveId(rawId);
  const rootPath = joinArchiveSegments(rest.join('/'));
  if (!archiveId) {
    return null;
  }
  return {
    archiveId,
    rootPath,
  };
}

export function buildReleaseBaseUrl(archiveId, rootPath = '') {
  const normalizedId = normalizeArchiveId(archiveId);
  if (!normalizedId) {
    return '';
  }
  const base = `${RELEASE_SCHEME}${normalizedId}`;
  const normalizedRoot = joinArchiveSegments(rootPath);
  if (!normalizedRoot) {
    return base;
  }
  return `${base}/${normalizedRoot}`;
}

export async function fetchReleaseArchiveAsset(archiveId, relativePath) {
  const normalizedId = normalizeArchiveId(archiveId);
  const normalizedPath = normalizeArchivePath(relativePath);
  if (!normalizedId || !normalizedPath) {
    return null;
  }
  const archive = await ensureArchive(normalizedId);
  if (!archive?.files) {
    return null;
  }
  const entry = archive.files.get(normalizedPath);
  if (!entry) {
    return null;
  }
  return {
    archiveId: normalizedId,
    bytes: entry.bytes,
    originalPath: entry.originalPath,
  };
}

export async function fetchReleaseResource(baseUrl, directory, resourceName) {
  const parsed = parseReleaseBaseUrl(baseUrl);
  if (!parsed) {
    return null;
  }
  const combinedPath = joinArchiveSegments(parsed.rootPath, directory, resourceName);
  if (!combinedPath) {
    return null;
  }
  const asset = await fetchReleaseArchiveAsset(parsed.archiveId, combinedPath);
  if (!asset) {
    return null;
  }
  return {
    ...asset,
    url: `${RELEASE_SCHEME}${parsed.archiveId}/${asset.originalPath}`,
  };
}

export const CRITTER_RELEASE_BASES = Object.values(releaseDefinitions).map(def =>
  buildReleaseBaseUrl(def.id, def.rootDir || ''),
);

