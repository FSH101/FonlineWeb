import {
  AxialCoordinate,
  OffsetCoordinate,
  axialToOffset,
  offsetToAxial,
  axialKey,
  HEX_DIRECTION_VECTORS,
} from './hex';

export type TerrainType = 'void' | 'wasteland';

export interface HexTile {
  id: string;
  axial: AxialCoordinate;
  offset: OffsetCoordinate;
  walkable: boolean;
  terrain: TerrainType;
}

export interface SerializedHexTile {
  col: number;
  row: number;
  q: number;
  r: number;
  terrain: TerrainType;
  walkable: boolean;
}

export interface SerializedHexGrid {
  width: number;
  height: number;
  tiles: SerializedHexTile[];
}

export class HexGrid {
  readonly width: number;
  readonly height: number;
  private readonly tiles: HexTile[][];
  private readonly index = new Map<string, HexTile>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = this.generateTiles();
  }

  private generateTiles(): HexTile[][] {
    const result: HexTile[][] = [];
    for (let col = 0; col < this.width; col += 1) {
      const column: HexTile[] = [];
      for (let row = 0; row < this.height; row += 1) {
        const offset: OffsetCoordinate = { col, row };
        const axial = offsetToAxial(offset);
        const tile: HexTile = {
          id: `${col}:${row}`,
          axial,
          offset,
          walkable: true,
          terrain: 'wasteland',
        };
        column.push(tile);
        this.index.set(axialKey(axial), tile);
      }
      result.push(column);
    }
    return result;
  }

  getTileByOffset(offset: OffsetCoordinate): HexTile | undefined {
    if (!this.isInsideOffset(offset)) {
      return undefined;
    }
    return this.tiles[offset.col][offset.row];
  }

  getTileByAxial(axial: AxialCoordinate): HexTile | undefined {
    return this.index.get(axialKey(axial));
  }

  isInsideOffset({ col, row }: OffsetCoordinate): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  isInsideAxial(axial: AxialCoordinate): boolean {
    const offset = axialToOffset(axial);
    return this.isInsideOffset(offset);
  }

  neighborsOf(axial: AxialCoordinate): HexTile[] {
    const neighbors: HexTile[] = [];
    for (const vector of Object.values(HEX_DIRECTION_VECTORS)) {
      const neighborAxial: AxialCoordinate = {
        q: axial.q + vector.q,
        r: axial.r + vector.r,
      };
      const tile = this.getTileByAxial(neighborAxial);
      if (tile) {
        neighbors.push(tile);
      }
    }
    return neighbors;
  }

  allTiles(): HexTile[] {
    return this.tiles.flat();
  }

  serialize(): SerializedHexGrid {
    return {
      width: this.width,
      height: this.height,
      tiles: this.allTiles().map(tile => ({
        col: tile.offset.col,
        row: tile.offset.row,
        q: tile.axial.q,
        r: tile.axial.r,
        terrain: tile.terrain,
        walkable: tile.walkable,
      })),
    };
  }
}
