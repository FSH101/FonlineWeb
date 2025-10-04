import { promises as fs, createWriteStream } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { Command } from 'commander';
import { PNG } from 'pngjs';
import { FALLOUT_PALETTE, TRANSPARENT_INDEX } from '../assets/palette/falloutPalette';

interface FrameHeader {
  width: number;
  height: number;
  pixelCount: number;
  xOffset: number;
  yOffset: number;
}

interface FrameData extends FrameHeader {
  pixels: Uint8Array;
}

interface DirectionData {
  shiftX: number;
  shiftY: number;
  frames: FrameData[];
}

interface FrDecodeResult {
  version: number;
  framesPerSecond: number;
  actionFrame: number;
  framesPerDirection: number;
  directions: DirectionData[];
}

const DIRECTIONS_COUNT = 6;

function readHeader(buffer: Buffer) {
  if (buffer.length < 64) {
    throw new Error('Файл слишком маленький и не похож на FR.');
  }

  const version = buffer.readUInt32LE(0);
  const framesPerSecond = buffer.readUInt16LE(4);
  const actionFrame = buffer.readUInt16LE(6);
  const framesPerDirection = buffer.readUInt16LE(8);

  let cursor = 10;
  let directions = DIRECTIONS_COUNT;

  const maybeDirections = buffer.readUInt16LE(cursor);
  if (maybeDirections > 0 && maybeDirections <= DIRECTIONS_COUNT) {
    directions = maybeDirections;
    cursor += 2;
  }

  const shiftX: number[] = [];
  const shiftY: number[] = [];

  for (let i = 0; i < directions; i += 1) {
    shiftX.push(buffer.readInt16LE(cursor));
    cursor += 2;
  }

  for (let i = 0; i < directions; i += 1) {
    shiftY.push(buffer.readInt16LE(cursor));
    cursor += 2;
  }

  const frameDataSize = buffer.readUInt32LE(cursor);
  cursor += 4;

  const directionOffsets: number[] = [];
  for (let i = 0; i < directions; i += 1) {
    directionOffsets.push(buffer.readUInt32LE(cursor));
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
    headerSize: cursor,
    directions,
  };
}

function decodeDirections(buffer: Buffer, header: ReturnType<typeof readHeader>): DirectionData[] {
  const directions: DirectionData[] = [];

  for (let dirIndex = 0; dirIndex < header.directions; dirIndex += 1) {
    const offset = header.directionOffsets[dirIndex];
    if (offset === 0 || offset >= buffer.length) {
      directions.push({ shiftX: header.shiftX[dirIndex] ?? 0, shiftY: header.shiftY[dirIndex] ?? 0, frames: [] });
      continue;
    }

    let end = buffer.length;
    for (let next = dirIndex + 1; next < header.directionOffsets.length; next += 1) {
      const candidate = header.directionOffsets[next];
      if (candidate > offset) {
        end = candidate;
        break;
      }
    }

    const slice = buffer.subarray(offset, end);
    let cursor = 0;
    const frameHeaders: FrameHeader[] = [];

    for (let frameIndex = 0; frameIndex < header.framesPerDirection; frameIndex += 1) {
      if (cursor + 12 > slice.length) {
        throw new Error(`Некорректный блок кадров для направления ${dirIndex}.`);
      }

      const width = slice.readUInt16LE(cursor);
      const height = slice.readUInt16LE(cursor + 2);
      const pixelCount = slice.readUInt32LE(cursor + 4);
      const xOffset = slice.readInt16LE(cursor + 8);
      const yOffset = slice.readInt16LE(cursor + 10);
      cursor += 12;

      frameHeaders.push({ width, height, pixelCount, xOffset, yOffset });
    }

    const frames: FrameData[] = [];
    let pixelCursor = cursor;

    for (const frame of frameHeaders) {
      const bytes = frame.pixelCount;
      if (pixelCursor + bytes > slice.length) {
        throw new Error(`Недостаточно данных пикселей для направления ${dirIndex}.`);
      }

      const pixels = slice.subarray(pixelCursor, pixelCursor + bytes);
      pixelCursor += bytes;

      frames.push({ ...frame, pixels: new Uint8Array(pixels) });
    }

    directions.push({ shiftX: header.shiftX[dirIndex] ?? 0, shiftY: header.shiftY[dirIndex] ?? 0, frames });
  }

  return directions;
}

export function decodeFr(buffer: Buffer): FrDecodeResult {
  const header = readHeader(buffer);
  const directions = decodeDirections(buffer, header);

  return {
    version: header.version,
    framesPerSecond: header.framesPerSecond,
    actionFrame: header.actionFrame,
    framesPerDirection: header.framesPerDirection,
    directions,
  };
}

function colorFromPalette(index: number): [number, number, number, number] {
  const color = FALLOUT_PALETTE[index] ?? [0, 0, 0];
  const alpha = index === TRANSPARENT_INDEX ? 0 : 255;
  return [color[0], color[1], color[2], alpha];
}

async function saveFramePng(frame: FrameData, outFile: string) {
  const png = new PNG({ width: frame.width, height: frame.height });
  const data = png.data;
  const total = frame.width * frame.height;

  if (total !== frame.pixelCount) {
    throw new Error('Размер кадра не совпадает с количеством пикселей.');
  }

  for (let i = 0; i < total; i += 1) {
    const [r, g, b, a] = colorFromPalette(frame.pixels[i]);
    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = a;
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createWriteStream(outFile);
    stream.on('error', rejectPromise);
    stream.on('finish', () => resolvePromise());
    png.pack().pipe(stream);
  });
}

async function ensureDir(path: string) {
  await fs.mkdir(path, { recursive: true });
}

async function writeMetadata(outputDir: string, data: FrDecodeResult) {
  const serializable = {
    version: data.version,
    framesPerSecond: data.framesPerSecond,
    actionFrame: data.actionFrame,
    framesPerDirection: data.framesPerDirection,
    directions: data.directions.map((direction, index) => ({
      index,
      shiftX: direction.shiftX,
      shiftY: direction.shiftY,
      frames: direction.frames.map((frame, frameIndex) => ({
        index: frameIndex,
        width: frame.width,
        height: frame.height,
        pixelCount: frame.pixelCount,
        xOffset: frame.xOffset,
        yOffset: frame.yOffset,
      })),
    })),
  };

  await fs.writeFile(join(outputDir, 'metadata.json'), JSON.stringify(serializable, null, 2), 'utf-8');
}

async function decodeFile(inputPath: string, options: { output: string; skipImages: boolean; skipMetadata: boolean; verbose: boolean; }) {
  const resolvedInput = resolve(inputPath);
  const buffer = await fs.readFile(resolvedInput);
  const decoded = decodeFr(buffer);

  const baseName = basename(resolvedInput, '.fr');
  const outputDir = resolve(options.output ?? join(dirname(resolvedInput), `${baseName}_decoded`));
  await ensureDir(outputDir);

  if (!options.skipImages) {
    for (let dirIndex = 0; dirIndex < decoded.directions.length; dirIndex += 1) {
      const direction = decoded.directions[dirIndex];
      const dirFolder = join(outputDir, `direction_${dirIndex}`);
      await ensureDir(dirFolder);
      for (let frameIndex = 0; frameIndex < direction.frames.length; frameIndex += 1) {
        const frame = direction.frames[frameIndex];
        const filename = join(dirFolder, `frame_${frameIndex}.png`);
        await saveFramePng(frame, filename);
      }
    }
  }

  if (!options.skipMetadata) {
    await writeMetadata(outputDir, decoded);
  }

  if (options.verbose) {
    // eslint-disable-next-line no-console
    console.log(`FR файл: ${resolvedInput}`);
    // eslint-disable-next-line no-console
    console.log(`Кадров на направление: ${decoded.framesPerDirection}`);
    decoded.directions.forEach((direction, index) => {
      // eslint-disable-next-line no-console
      console.log(`  Направление ${index}: ${direction.frames.length} кадров, смещение (${direction.shiftX}, ${direction.shiftY})`);
    });
  }
}

function createCli() {
  const program = new Command();

  program
    .name('decode-fr')
    .description('Декодирует Fallout FR файлы и сохраняет кадры с палитрой JASC-PAL')
    .argument('<input>', 'Путь к FR файлу')
    .option('-o, --output <directory>', 'Каталог для сохранения результатов')
    .option('--skip-images', 'Не сохранять PNG изображения кадров', false)
    .option('--skip-metadata', 'Не сохранять metadata.json', false)
    .option('-q, --quiet', 'Не выводить дополнительную информацию', false)
    .action(async (input, opts) => {
      try {
        await decodeFile(input, {
          output: opts.output ?? join(process.cwd(), `${basename(input, '.fr')}_decoded`),
          skipImages: Boolean(opts.skipImages),
          skipMetadata: Boolean(opts.skipMetadata),
          verbose: !opts.quiet,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error(`Ошибка: ${message}`);
        process.exitCode = 1;
      }
    });

  return program;
}

if (require.main === module) {
  createCli().parseAsync(process.argv);
}

