export type AxialCoordinate = {
  /** Координата q (ось восток-запад) */
  q: number;
  /** Координата r (ось северо-восток — юго-запад) */
  r: number;
};

export type OffsetCoordinate = {
  /** Колонка в even-q раскладке */
  col: number;
  /** Строка в even-q раскладке */
  row: number;
};

export type HexDirection =
  | 'east'
  | 'northEast'
  | 'northWest'
  | 'west'
  | 'southWest'
  | 'southEast';

export const HEX_DIRECTION_VECTORS: Record<HexDirection, AxialCoordinate> = {
  east: { q: 1, r: 0 },
  northEast: { q: 1, r: -1 },
  northWest: { q: 0, r: -1 },
  west: { q: -1, r: 0 },
  southWest: { q: -1, r: 1 },
  southEast: { q: 0, r: 1 },
};

export const HEX_DIRECTIONS: HexDirection[] = Object.keys(
  HEX_DIRECTION_VECTORS
) as HexDirection[];

export function isHexDirection(value: unknown): value is HexDirection {
  return typeof value === 'string' && value in HEX_DIRECTION_VECTORS;
}

export function isAxialCoordinate(value: unknown): value is AxialCoordinate {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<AxialCoordinate>;
  return Number.isInteger(candidate.q) && Number.isInteger(candidate.r);
}

export function addAxial(
  a: AxialCoordinate,
  b: AxialCoordinate
): AxialCoordinate {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function axialToOffset({ q, r }: AxialCoordinate): OffsetCoordinate {
  const row = r + (q - (q & 1)) / 2;
  return { col: q, row };
}

export function offsetToAxial({ col, row }: OffsetCoordinate): AxialCoordinate {
  const r = row - (col - (col & 1)) / 2;
  return { q: col, r };
}

export function axialKey({ q, r }: AxialCoordinate): string {
  return `${q}:${r}`;
}
