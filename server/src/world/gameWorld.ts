import { logger } from '../logger';
import { AxialCoordinate, axialToOffset, offsetToAxial } from './hex';
import { HexGrid, SerializedHexGrid } from './hexGrid';

export interface PlayerState {
  id: string;
  name: string;
  position: AxialCoordinate;
}

export interface SerializedPlayerState {
  id: string;
  name: string;
  position: {
    axial: AxialCoordinate;
    offset: ReturnType<typeof axialToOffset>;
  };
}

export interface WorldSnapshot {
  grid: SerializedHexGrid;
  players: SerializedPlayerState[];
}

const DEFAULT_PLAYER_NAME = 'Изгой';

export class GameWorld {
  readonly grid: HexGrid;
  private readonly players = new Map<string, PlayerState>();

  constructor(width = 50, height = 50) {
    this.grid = new HexGrid(width, height);
  }

  getSnapshot(): WorldSnapshot {
    return {
      grid: this.grid.serialize(),
      players: this.getPlayers(),
    };
  }

  addPlayer(id: string, preferredName?: string): SerializedPlayerState {
    const spawn = this.findSpawnPoint();
    const player: PlayerState = {
      id,
      name: preferredName?.trim() || `${DEFAULT_PLAYER_NAME} #${id.slice(0, 4)}`,
      position: spawn,
    };
    this.players.set(id, player);
    logger.debug(`Игрок ${player.name} (${id}) заспавнен в ${spawn.q}:${spawn.r}`);
    return this.serializePlayer(player);
  }

  removePlayer(id: string): void {
    const existed = this.players.delete(id);
    if (existed) {
      logger.debug(`Игрок ${id} покинул мир`);
    }
  }

  movePlayerTo(id: string, target: AxialCoordinate): SerializedPlayerState | null {
    const player = this.players.get(id);
    if (!player) {
      return null;
    }

    if (!this.grid.isInsideAxial(target)) {
      return null;
    }

    const tile = this.grid.getTileByAxial(target);
    if (!tile || !tile.walkable) {
      return null;
    }

    player.position = { ...target };
    return this.serializePlayer(player);
  }

  setPlayerName(id: string, name: string): SerializedPlayerState | null {
    const player = this.players.get(id);
    if (!player) {
      return null;
    }

    const normalized = name.trim().slice(0, 32);
    if (normalized.length > 0) {
      player.name = normalized;
    }
    return this.serializePlayer(player);
  }

  getPlayer(id: string): SerializedPlayerState | null {
    const player = this.players.get(id);
    if (!player) {
      return null;
    }
    return this.serializePlayer(player);
  }

  getPlayers(): SerializedPlayerState[] {
    return Array.from(this.players.values(), player => this.serializePlayer(player));
  }

  private findSpawnPoint(): AxialCoordinate {
    const col = Math.floor(this.grid.width / 2);
    const row = Math.floor(this.grid.height / 2);
    return offsetToAxial({ col, row });
  }

  private serializePlayer(player: PlayerState): SerializedPlayerState {
    const offset = axialToOffset(player.position);
    return {
      id: player.id,
      name: player.name,
      position: {
        axial: player.position,
        offset,
      },
    };
  }
}
