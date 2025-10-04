import { decodeFr } from '../fr/decoder.js';

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
  try {
    return await loadDirectionalAnimation(url, options);
  } catch (error) {
    console.error(`[player] Ошибка загрузки анимации ${url}`, error);
    return null;
  }
}
