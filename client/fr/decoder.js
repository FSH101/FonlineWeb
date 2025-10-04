import { FALLOUT_PALETTE, TRANSPARENT_INDEX } from './palette.js';

const DIRECTIONS_COUNT = 6;

function readHeader(view) {
  if (view.byteLength < 64) {
    throw new Error('Файл не похож на FR — недостаточно данных.');
  }

  const version = view.getUint32(0, true);
  const framesPerSecond = view.getUint16(4, true);
  const actionFrame = view.getUint16(6, true);
  const framesPerDirection = view.getUint16(8, true);

  let cursor = 10;
  let directions = DIRECTIONS_COUNT;

  if (cursor + 2 <= view.byteLength) {
    const maybeDirections = view.getUint16(cursor, true);
    if (maybeDirections > 0 && maybeDirections <= DIRECTIONS_COUNT) {
      directions = maybeDirections;
      cursor += 2;
    }
  }

  const shiftX = [];
  const shiftY = [];

  for (let i = 0; i < directions; i += 1) {
    if (cursor + 2 > view.byteLength) {
      throw new Error('Неожиданный конец файла при чтении shiftX.');
    }
    shiftX.push(view.getInt16(cursor, true));
    cursor += 2;
  }

  for (let i = 0; i < directions; i += 1) {
    if (cursor + 2 > view.byteLength) {
      throw new Error('Неожиданный конец файла при чтении shiftY.');
    }
    shiftY.push(view.getInt16(cursor, true));
    cursor += 2;
  }

  if (cursor + 4 > view.byteLength) {
    throw new Error('Не удалось прочитать размер блока кадров.');
  }
  const frameDataSize = view.getUint32(cursor, true);
  cursor += 4;

  const directionOffsets = [];
  for (let i = 0; i < directions; i += 1) {
    if (cursor + 4 > view.byteLength) {
      throw new Error('Не удалось прочитать смещения направлений.');
    }
    directionOffsets.push(view.getUint32(cursor, true));
    cursor += 4;
  }

  return {
    version,
    framesPerSecond,
    actionFrame,
    framesPerDirection,
    shiftX,
    shiftY,
    frameDataSize,
    directionOffsets,
    directions,
    headerSize: cursor,
  };
}

function getDirectionSlice(buffer, header, dirIndex) {
  const offset = header.directionOffsets[dirIndex];
  if (!offset) {
    return null;
  }
  const sortedOffsets = header.directionOffsets
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value > offset)
    .sort((a, b) => a.value - b.value);
  const nextOffset = sortedOffsets.length > 0 ? sortedOffsets[0].value : buffer.byteLength;
  if (nextOffset <= offset) {
    return null;
  }
  return buffer.slice(offset, nextOffset);
}

async function frameToBitmap(frame, pixels, palette, transparentIndex) {
  if (frame.width * frame.height !== frame.pixelCount) {
    throw new Error('Количество пикселей не совпадает с размером кадра.');
  }

  const imageData = new ImageData(frame.width, frame.height);
  const data = imageData.data;

  for (let i = 0; i < frame.pixelCount; i += 1) {
    const colorIndex = pixels[i];
    const color = palette[colorIndex] ?? [0, 0, 0];
    const alpha = colorIndex === transparentIndex ? 0 : 255;
    const idx = i * 4;
    data[idx] = color[0];
    data[idx + 1] = color[1];
    data[idx + 2] = color[2];
    data[idx + 3] = alpha;
  }

  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(imageData);
  }

  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const context = canvas.getContext('2d');
  context.putImageData(imageData, 0, 0);
  return canvas;
}

export async function decodeFr(buffer, options = {}) {
  const { palette = FALLOUT_PALETTE, transparentIndex = TRANSPARENT_INDEX } = options;

  const view = new DataView(buffer);
  const header = readHeader(view);
  const directions = [];

  for (let dirIndex = 0; dirIndex < header.directions; dirIndex += 1) {
    const slice = getDirectionSlice(buffer, header, dirIndex);
    if (!slice) {
      directions.push({ shiftX: header.shiftX[dirIndex] ?? 0, shiftY: header.shiftY[dirIndex] ?? 0, frames: [] });
      continue;
    }

    const sliceView = new DataView(slice);
    let cursor = 0;
    const frameHeaders = [];

    for (let frameIndex = 0; frameIndex < header.framesPerDirection; frameIndex += 1) {
      if (cursor + 12 > sliceView.byteLength) {
        throw new Error(`Некорректный заголовок кадра #${frameIndex} для направления ${dirIndex}.`);
      }
      const width = sliceView.getUint16(cursor, true);
      const height = sliceView.getUint16(cursor + 2, true);
      const pixelCount = sliceView.getUint32(cursor + 4, true);
      const xOffset = sliceView.getInt16(cursor + 8, true);
      const yOffset = sliceView.getInt16(cursor + 10, true);
      cursor += 12;
      frameHeaders.push({ width, height, pixelCount, xOffset, yOffset });
    }

    const frames = [];
    let pixelCursor = cursor;

    for (const frame of frameHeaders) {
      if (pixelCursor + frame.pixelCount > sliceView.byteLength) {
        throw new Error(`Недостаточно данных пикселей для направления ${dirIndex}.`);
      }
      const pixelOffset = pixelCursor;
      pixelCursor += frame.pixelCount;
      const pixelArray = new Uint8Array(slice, pixelOffset, frame.pixelCount);
      const bitmap = await frameToBitmap(frame, pixelArray, palette, transparentIndex);
      const anchorX = frame.width / 2 - frame.xOffset;
      const anchorY = frame.height - frame.yOffset;
      frames.push({
        ...frame,
        bitmap,
        anchorX,
        anchorY,
      });
    }

    directions.push({
      shiftX: header.shiftX[dirIndex] ?? 0,
      shiftY: header.shiftY[dirIndex] ?? 0,
      frames,
    });
  }

  const frameDurationMs = header.framesPerSecond > 0 ? 1000 / header.framesPerSecond : 100;

  return {
    version: header.version,
    framesPerSecond: header.framesPerSecond,
    frameDurationMs,
    actionFrame: header.actionFrame,
    framesPerDirection: header.framesPerDirection,
    directions,
  };
}
