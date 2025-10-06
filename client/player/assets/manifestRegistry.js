import { CRITTER_RELEASE_BASES } from './releaseArchives.js';

const DEFAULT_DIRECTION_ORDER = [
  'northEast',
  'east',
  'southEast',
  'southWest',
  'west',
  'northWest',
];

const FEMALE_REMOTE_BASE = 'https://raw.githubusercontent.com/FSH101/TLA3.0TG/main/assets/critter/human_female';
const FEMALE_LOCAL_BASES = [
  'player/assets/human_female',
  '/player/assets/human_female',
  'client/player/assets/human_female',
  '/client/player/assets/human_female',
];

const CRITTER_LOCAL_BASES = [
  'player/assets/critters',
  '/player/assets/critters',
  'player/assets/critters/gif',
  '/player/assets/critters/gif',
  'client/player/assets/critters',
  '/client/player/assets/critters',
  'client/player/assets/critters/gif',
  '/client/player/assets/critters/gif',
  'assets/critters',
  '/assets/critters',
  'assets/critters/gif',
  '/assets/critters/gif',
];

const GIF_DIRECTION_SUFFIX = {
  northEast: 'S',
  east: 'SW',
  southEast: 'W',
  southWest: 'NW',
  west: 'NE',
  northWest: 'E',
};

function generateFrameNames(count) {
  return Array.from({ length: count }, (_, index) => `frame_${index.toString().padStart(2, '0')}.png`);
}

function collectBaseUrls(folder, extraBaseUrls = [], localBaseRoots = FEMALE_LOCAL_BASES) {
  const combined = [
    ...extraBaseUrls,
    ...localBaseRoots.map(base => {
      const normalizedBase = base.replace(/\/+$/, '');
      if (!folder) {
        return normalizedBase;
      }
      const normalizedFolder = folder.replace(/^\/+/, '');
      return `${normalizedBase}/${normalizedFolder}`;
    }),
    `${FEMALE_REMOTE_BASE}/${folder}`,
  ];

  const unique = [];
  const seen = new Set();
  for (const candidate of combined) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = trimmed.replace(/\/+$/, '');
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function buildImageSequenceManifest(folder, options = {}) {
  const {
    framesPerSecond = 10,
    frameCount = 8,
    baseUrls = [],
    localBaseRoots = FEMALE_LOCAL_BASES,
    directionOrder = DEFAULT_DIRECTION_ORDER,
  } = options;

  const normalizedBases = collectBaseUrls(folder, baseUrls, localBaseRoots);
  const [primaryBaseUrl] = normalizedBases;

  return {
    type: 'imageSequence',
    baseUrl: primaryBaseUrl,
    baseUrls: normalizedBases,
    framesPerSecond,
    directionOrder: [...directionOrder],
    directions: directionOrder.map((directionId, index) => ({
      id: directionId,
      directory: `dir_${index}`,
      frames: generateFrameNames(frameCount),
    })),
  };
}

function collectGifBaseUrls(basePath, extraBaseUrls = []) {
  const normalizedBasePath = normalizeKey(basePath).replace(/\/+$/, '');
  const folderlessBase = normalizedBasePath.replace(/\/[^/]+$/, '');

  const uppercaseBase = normalizedBasePath.toUpperCase();
  const uppercaseFolderless = folderlessBase.toUpperCase();

  const candidates = [
    ...extraBaseUrls,
    normalizedBasePath,
    folderlessBase,
    uppercaseBase,
    uppercaseFolderless,
    ...CRITTER_LOCAL_BASES,
    ...CRITTER_RELEASE_BASES,
  ];

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = trimmed.replace(/\/+$/, '');
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function buildGifManifest(prefix, options = {}) {
  const {
    basePath = '',
    baseUrls = [],
    directionOrder = DEFAULT_DIRECTION_ORDER,
    includeBasePath = false,
    anchorX,
    anchorY,
  } = options;

  const trimmedPrefix = (prefix ?? '').trim();
  if (!trimmedPrefix) {
    return null;
  }

  const normalizedPrefix = trimmedPrefix.toUpperCase();
  const normalizedBases = collectGifBaseUrls(basePath, baseUrls);

  const directions = [];

  for (const directionId of directionOrder) {
    const suffix = GIF_DIRECTION_SUFFIX[directionId];
    if (!suffix) {
      continue;
    }
    directions.push({
      id: directionId,
      directory: '',
      frames: [
        {
          type: 'gif',
          name: `${normalizedPrefix}__${suffix}.gif`,
          anchorX,
          anchorY,
        },
      ],
    });
  }

  const [primaryBaseUrl] = normalizedBases;

  return {
    type: 'gifSequence',
    baseUrl: primaryBaseUrl,
    baseUrls: normalizedBases,
    directionOrder: [...directionOrder],
    directions,
    includeBasePath,
  };
}

function normalizeKey(key) {
  if (!key) {
    return '';
  }
  return key.replace(/\\/g, '/').replace(/\/+$/, '');
}

const inlineManifests = new Map();
const dynamicManifestResolvers = [];

function registerManifest(basePath, manifest) {
  const normalized = normalizeKey(basePath);
  if (!normalized || !manifest) {
    return;
  }
  inlineManifests.set(normalized, manifest);
}

function registerDirectionalManifests(basePathVariants, manifest) {
  for (const variant of basePathVariants) {
    registerManifest(variant, manifest);
  }
}

function registerDynamicManifestResolver(resolver) {
  if (typeof resolver !== 'function') {
    return;
  }
  dynamicManifestResolvers.push(resolver);
}

function resolveDynamicManifest(basePath) {
  for (const resolver of dynamicManifestResolvers) {
    try {
      const manifest = resolver(basePath);
      if (manifest) {
        return manifest;
      }
    } catch (error) {
      console.warn('[player] Ошибка построения динамического manifest', error);
    }
  }
  return null;
}

const FEMALE_IDLE = buildImageSequenceManifest('HFCMBTAA', {
  framesPerSecond: 10,
  frameCount: 18,
});

const FEMALE_RUN = buildImageSequenceManifest('HFCMBTAB', {
  framesPerSecond: 12,
  frameCount: 8,
});

registerDirectionalManifests([
  'player/assets/human_female/HFCMBTAA',
  'client/player/assets/human_female/HFCMBTAA',
], FEMALE_IDLE);

registerDirectionalManifests([
  'player/assets/human_female/HFCMBTAB',
  'client/player/assets/human_female/HFCMBTAB',
], FEMALE_RUN);

export function getInlineManifest(basePath) {
  const normalized = normalizeKey(basePath);
  if (!normalized) {
    return null;
  }
  const manifest = inlineManifests.get(normalized) ?? resolveDynamicManifest(normalized);
  if (!manifest) {
    return null;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(manifest);
  }

  return JSON.parse(JSON.stringify(manifest));
}

registerDynamicManifestResolver(basePath => {
  if (typeof basePath !== 'string') {
    return null;
  }

  const normalizedBase = normalizeKey(basePath);
  if (!normalizedBase) {
    return null;
  }

  const critterRootMatch = /(?:^|\/)player\/assets\/critters\/(.+)$/i.exec(normalizedBase)
    || /(?:^|\/)client\/player\/assets\/critters\/(.+)$/i.exec(normalizedBase)
    || /(?:^|\/)assets\/critters\/(.+)$/i.exec(normalizedBase);

  if (!critterRootMatch) {
    return null;
  }

  const suffixPath = critterRootMatch[1] ?? '';
  const segments = suffixPath.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const lastSegment = segments[segments.length - 1];
  const penultimateSegment = segments.length > 1 ? segments[segments.length - 2] : null;

  let critterKey = null;
  let animationSegment = null;
  let explicitPrefix = null;

  const trailingMatch = /^([a-z0-9_]+?)([a-z0-9]{2})$/i.exec(lastSegment);
  if (trailingMatch) {
    critterKey = trailingMatch[1];
    animationSegment = trailingMatch[2];
    explicitPrefix = trailingMatch[0];
  }

  if (penultimateSegment && penultimateSegment.toLowerCase() !== 'gif') {
    critterKey = critterKey ?? penultimateSegment;
  }

  if (/^[a-z0-9]{2}$/i.test(lastSegment)) {
    animationSegment = lastSegment;
    if (critterKey) {
      explicitPrefix = `${critterKey}${animationSegment}`;
    }
  }

  if (!critterKey) {
    critterKey = trailingMatch ? trailingMatch[1] : lastSegment;
  }

  if (!animationSegment) {
    animationSegment = 'AA';
  }

  if (!explicitPrefix && critterKey) {
    explicitPrefix = `${critterKey}${animationSegment}`;
  }

  if (!explicitPrefix) {
    return null;
  }

  const parentBase = normalizedBase.replace(/\/+$/, '').replace(/\/[^/]+$/, '');
  const sanitizedCritter = critterKey.replace(/[^a-z0-9_]/gi, '');
  const extraBaseUrls = [];

  if (sanitizedCritter) {
    const lower = sanitizedCritter.toLowerCase();
    const upper = sanitizedCritter.toUpperCase();

    if (parentBase && parentBase !== normalizedBase) {
      extraBaseUrls.push(`${parentBase}/${lower}`);
      extraBaseUrls.push(`${parentBase}/${upper}`);
      extraBaseUrls.push(`${parentBase}/${lower}/gif`);
      extraBaseUrls.push(`${parentBase}/${upper}/gif`);
    }

    extraBaseUrls.push(`player/assets/critters/${lower}`);
    extraBaseUrls.push(`/player/assets/critters/${lower}`);
    extraBaseUrls.push(`client/player/assets/critters/${lower}`);
    extraBaseUrls.push(`/client/player/assets/critters/${lower}`);
    extraBaseUrls.push(`assets/critters/${lower}`);
    extraBaseUrls.push(`/assets/critters/${lower}`);
    extraBaseUrls.push(`player/assets/critters/${upper}`);
    extraBaseUrls.push(`/player/assets/critters/${upper}`);
    extraBaseUrls.push(`client/player/assets/critters/${upper}`);
    extraBaseUrls.push(`/client/player/assets/critters/${upper}`);
    extraBaseUrls.push(`assets/critters/${upper}`);
    extraBaseUrls.push(`/assets/critters/${upper}`);
  }

  return buildGifManifest(explicitPrefix, {
    basePath: normalizedBase,
    includeBasePath: false,
    baseUrls: extraBaseUrls,
  });
});
