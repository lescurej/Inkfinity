// Types pour les coordonnées et points de dessin
export interface Point {
  x: number;
  y: number;
}

export interface DrawingSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  uuid?: string;
  timestamp?: number;
  size?: number;
  brush?: string;
  stamps?: { x: number; y: number; size: number; opacity: number; rotation: number; color: string; pressure: number; velocity: number }[];
}

// Types pour les curseurs distants
export interface RemoteCursor {
  uuid: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  brush?: string;
  username?: string;
}

// Types pour les événements Socket.IO
export type Stroke = {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  brush: string;
  timestamp: number;
};

export interface SocketEvents {
  draw: Stroke;
  drawIntermediate: Stroke & { uuid?: string };
  strokeEnd: string;
  clearCanvas: void;
  drawingHistory: Stroke[];
  cursorMove: RemoteCursor;
  remoteCursor: RemoteCursor;
  userDisconnect: string;
}

// Types pour les hooks
export interface CanvasState {
  chunks: Map<string, DrawingSegment[]>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface BrushSettings {
  color: string;
  width: number;
  opacity: number;
}

// Types pour les composants
export interface CanvasProps {
  className?: string;
}

export interface ControlsProps {
  onClear?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export interface StatusProps {
  connected?: boolean;
  userCount?: number;
  pointCount?: number;
} 