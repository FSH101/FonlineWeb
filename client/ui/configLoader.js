const SECTION_REGEX = /^\[(.+)]$/;

function ensureSection(root, sectionName) {
  if (!sectionName) {
    return root;
  }
  const parts = sectionName
    .split('.')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return root;
  }
  let reference = root;
  for (const part of parts) {
    if (!reference[part] || typeof reference[part] !== 'object') {
      reference[part] = {};
    }
    reference = reference[part];
  }
  return reference;
}

export function parseIni(text) {
  const result = {};
  let currentSection = result;

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    if (!rawLine) {
      continue;
    }
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const sectionMatch = line.match(SECTION_REGEX);
    if (sectionMatch) {
      currentSection = ensureSection(result, sectionMatch[1].trim());
      continue;
    }

    const delimiterIndex = line.indexOf('=');
    if (delimiterIndex === -1) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(delimiterIndex + 1).trim();
    const commentIndex = value.indexOf('#');
    if (commentIndex !== -1) {
      value = value.slice(0, commentIndex).trim();
    }

    currentSection[key] = value;
  }

  return result;
}

export async function loadUiConfig(path = 'ui/default.ini') {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить конфигурацию интерфейса: ${response.status}`);
  }
  const text = await response.text();
  return parseIni(text);
}
