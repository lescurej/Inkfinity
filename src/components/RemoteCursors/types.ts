import type { CursorData } from "../../../types"

export interface RemoteCursorMap {
  [uuid: string]: {
    cursor: CursorData & { size?: number; color?: string };
    lastSeen: number;
  };
}

export interface VisibleCursor extends CursorData {
  size: number;
  screenX: number;
  screenY: number;
  color: string;
}

export interface RemoteArtistNames {
  [uuid: string]: string;
} 