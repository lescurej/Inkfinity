// Shared types for Inkfinity client-server communication
// This single file contains all message types, events, and validation functions

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  brush: string;
  timestamp: number;
  id?: string;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface CursorData {
  uuid: string;
  x: number;
  y: number;
  size: number;
  color: string;
  brush: string;
  viewport?: Viewport;
  name: string;
}

// Type-safe cursor data templates
export type CursorDataTemplate = Omit<CursorData, 'uuid'>;

export type CursorDataWithUUID = CursorData & { uuid: string };

// Helper function to create cursor data with proper typing
export function createCursorData(
  data: CursorDataTemplate,
  uuid: string
): CursorDataWithUUID {
  return {
    ...data,
    uuid,
  };
}

// Helper function to create user connect data
export function createUserConnectData(
  cursorData: CursorData,
  uuid: string,
  defaultName: string
): CursorDataWithUUID {
  return {
    uuid,
    name: cursorData.name || defaultName,
    x: cursorData.x,
    y: cursorData.y,
    size: cursorData.size,
    color: cursorData.color,
    brush: cursorData.brush,
    viewport: cursorData.viewport,
  };
}

export interface ArtistNameChange {
  uuid: string;
  name: string;
}

export interface CanvasState {
  strokes: Stroke[];
  totalStrokes: number;
  maxStrokes: number;
}

export interface StrokeSegment {
  from: Point;
  to: Point;
  color: string;
  size: number;
  brush: string;
  uuid: string;
}

export interface StrokesRemoved {
  removedIndices: number[];
}

export interface ServerStats {
  totalStrokes: number;
  maxStrokes: number;
  memoryUsage: string;
  connectedClients: number;
  activeUsers: number;
}

export interface StrokeSegmentBatch {
  segments: StrokeSegment[];
  timestamp: number;
  uuid: string;
}

export interface ProgressiveStrokeChunk {
  strokes: Stroke[];
  chunkIndex: number;
  totalChunks: number;
  viewport: Viewport;
}

// Enhanced events
export const EVENTS = {
  STROKE_ADDED: 'strokeAdded',
  STROKE_SEGMENT: 'strokeSegment',
  STROKE_SEGMENT_BATCH: 'strokeSegmentBatch',
  CURSOR_MOVE: 'cursorMove',
  CLEAR_CANVAS: 'clear-canvas',
  REQUEST_STATE: 'requestState',
  REQUEST_DRAWING_HISTORY: 'requestDrawingHistory',
  REQUEST_PROGRESSIVE_STROKES: 'requestProgressiveStrokes',
  ARTIST_NAME_CHANGE: 'artistNameChange',
  PING: 'ping',
  GET_STATS: 'get-stats',
  STROKES_REMOVED: 'strokes-removed',
  CANVAS_STATE: 'canvas-state',
  DRAWING_HISTORY: 'drawingHistory',
  PROGRESSIVE_STROKE_CHUNK: 'progressiveStrokeChunk',
  CANVAS_CLEARED: 'canvas-cleared',
  REMOTE_CURSOR: 'remoteCursor',
  USER_CONNECT: 'userConnect',
  USER_DISCONNECT: 'userDisconnect',
  SESSION_INIT: 'session-init',
  PONG: 'pong',
  STATS: 'stats',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error'
} as const;

// Enhanced configuration
export const CONFIG = {
  MAX_STROKES: 2000,
  SAVE_INTERVAL: 30000,
  CLEANUP_INTERVAL: 300000,
  HEARTBEAT_INTERVAL: 30000,
  VIEWPORT_PADDING: 200,
  BATCH_SIZE: 10,
  BATCH_TIMEOUT: 50,
  PROGRESSIVE_CHUNK_SIZE: 100,
  OBJECT_POOL_SIZE: 50
} as const;

// Client to Server message types derived from EVENTS
export interface ClientToServerMessages {
  [EVENTS.STROKE_ADDED]: Stroke;
  [EVENTS.STROKE_SEGMENT]: StrokeSegment;
  [EVENTS.STROKE_SEGMENT_BATCH]: StrokeSegmentBatch;
  [EVENTS.CURSOR_MOVE]: CursorData;
  [EVENTS.CLEAR_CANVAS]: void;
  [EVENTS.REQUEST_STATE]: void;
  [EVENTS.REQUEST_DRAWING_HISTORY]: void;
  [EVENTS.REQUEST_PROGRESSIVE_STROKES]: Viewport;
  [EVENTS.ARTIST_NAME_CHANGE]: ArtistNameChange;
  [EVENTS.PING]: void;
  [EVENTS.GET_STATS]: void;
}

// Server to Client message types derived from EVENTS
export interface ServerToClientMessages {
  [EVENTS.STROKE_ADDED]: Stroke;
  [EVENTS.STROKE_SEGMENT]: StrokeSegment;
  [EVENTS.STROKE_SEGMENT_BATCH]: StrokeSegmentBatch;
  [EVENTS.STROKES_REMOVED]: StrokesRemoved;
  [EVENTS.CANVAS_STATE]: CanvasState;
  [EVENTS.DRAWING_HISTORY]: Stroke[];
  [EVENTS.PROGRESSIVE_STROKE_CHUNK]: ProgressiveStrokeChunk;
  [EVENTS.CANVAS_CLEARED]: void;
  [EVENTS.REMOTE_CURSOR]: CursorData;
  [EVENTS.USER_CONNECT]: CursorData;
  [EVENTS.USER_DISCONNECT]: string;
  [EVENTS.ARTIST_NAME_CHANGE]: ArtistNameChange;
  [EVENTS.SESSION_INIT]: { uuid: string; name: string };
  [EVENTS.PONG]: void;
  [EVENTS.STATS]: ServerStats;
  [EVENTS.CONNECT]: void;
  [EVENTS.DISCONNECT]: string;
  [EVENTS.CONNECT_ERROR]: any;
}

export type ClientEmitEvents = keyof ClientToServerMessages;
export type ServerEmitEvents = keyof ServerToClientMessages;
export type ClientEventHandler<T extends ServerEmitEvents> = (data: ServerToClientMessages[T]) => void;
export type ServerEventHandler<T extends ClientEmitEvents> = (data: ClientToServerMessages[T]) => void;

// Enhanced validation function
export function isValidCursorData(data: any): data is CursorData {
  return (
    data &&
    typeof data.uuid === 'string' &&
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    typeof data.size === 'number' &&
    typeof data.color === 'string' &&
    typeof data.brush === 'string' &&
    typeof data.name === 'string' &&
    (data.viewport === undefined || isValidViewport(data.viewport))
  );
}

export function isValidStroke(stroke: any): stroke is Stroke {
  return stroke &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.every((p: any) => typeof p.x === 'number' && typeof p.y === 'number') &&
    typeof stroke.color === 'string' &&
    typeof stroke.size === 'number' &&
    typeof stroke.brush === 'string';
}

export function isValidViewport(viewport: any): viewport is Viewport {
  return viewport &&
    typeof viewport.x === 'number' &&
    typeof viewport.y === 'number' &&
    typeof viewport.width === 'number' &&
    typeof viewport.height === 'number' &&
    typeof viewport.scale === 'number';
}

export function isValidStrokeSegment(segment: any): segment is StrokeSegment {
  return segment &&
    segment.from && typeof segment.from.x === 'number' && typeof segment.from.y === 'number' &&
    segment.to && typeof segment.to.x === 'number' && typeof segment.to.y === 'number' &&
    typeof segment.color === 'string' &&
    typeof segment.size === 'number' &&
    typeof segment.brush === 'string' &&
    typeof segment.uuid === 'string';
}

export function isValidStrokeSegmentBatch(batch: any): batch is StrokeSegmentBatch {
  return batch &&
    Array.isArray(batch.segments) &&
    batch.segments.length > 0 &&
    batch.segments.every(isValidStrokeSegment) &&
    typeof batch.timestamp === 'number' &&
    typeof batch.uuid === 'string';
} 