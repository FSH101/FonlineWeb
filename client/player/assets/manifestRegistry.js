const FEMALE_DIRECTION_ORDER = [
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

function generateFrameNames(count) {
  return Array.from({ length: count }, (_, index) => `frame_${index.toString().padStart(2, '0')}.png`);
}

function collectBaseUrls(folder, extraBaseUrls = []) {
  const combined = [
    ...extraBaseUrls,
    ...FEMALE_LOCAL_BASES.map(base => `${base.replace(/\/+$/, '')}/${folder}`),
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
  } = options;

  const normalizedBases = collectBaseUrls(folder, baseUrls);
  const [primaryBaseUrl] = normalizedBases;

  return {
    type: 'imageSequence',
    baseUrl: primaryBaseUrl,
    baseUrls: normalizedBases,
    framesPerSecond,
    directionOrder: [...FEMALE_DIRECTION_ORDER],
    directions: FEMALE_DIRECTION_ORDER.map((directionId, index) => ({
      id: directionId,
      directory: `dir_${index}`,
      frames: generateFrameNames(frameCount),
    })),
  };
}

function normalizeKey(key) {
  if (!key) {
    return '';
  }
  return key.replace(/\\/g, '/').replace(/\/+$/, '');
}

const inlineManifests = new Map();

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
  const manifest = inlineManifests.get(normalized);
  if (!manifest) {
    return null;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(manifest);
  }

  return JSON.parse(JSON.stringify(manifest));
}
