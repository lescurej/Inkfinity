import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useCanvasSocket } from "../../../hooks/useCanvasSocket";
import { useCanvasStore } from "../../../store/canvasStore";
import { useUserStore } from "../../../store/userStore";
import  { type CursorData, EVENTS } from "../../../../types";
import type { RemoteCursorMap, VisibleCursor, RemoteArtistNames } from "../types";
import { STALE_TIMEOUT, CLEANUP_INTERVAL, DEBOUNCE_DELAY, VIEWPORT_MARGIN } from "../constants";

export const useRemoteCursors = () => {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursorMap>({});
  const [remoteArtistNames, setRemoteArtistNames] = useState<RemoteArtistNames>({});

  const { viewport } = useCanvasStore();
  const { on, off, isConnected } = useCanvasSocket();
  const { uuid: myUUID, customName, artistName, setArtistName } = useUserStore();

  const debounceTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const socketFunctionsRef = useRef<{ on: typeof on; off: typeof off } | null>(null);

  const isValidCursorData = useCallback((data: unknown): data is CursorData => {
    return (
      data !== null &&
      typeof data === "object" &&
      "uuid" in data &&
      "x" in data &&
      "y" in data &&
      "size" in data &&
      "color" in data &&
      "brush" in data &&
      "name" in data &&
      typeof (data as CursorData).uuid === "string" &&
      typeof (data as CursorData).x === "number" &&
      typeof (data as CursorData).y === "number" &&
      typeof (data as CursorData).size === "number" &&
      typeof (data as CursorData).color === "string" &&
      typeof (data as CursorData).brush === "string" &&
      typeof (data as CursorData).name === "string"
    );
  }, []);

  const debouncedCursorUpdate = useCallback((uuid: string, data: CursorData) => {
    const existingTimeout = debounceTimeoutsRef.current.get(uuid);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      setRemoteCursors((prev) => ({
        ...prev,
        [uuid]: { cursor: data, lastSeen: Date.now() },
      }));
      debounceTimeoutsRef.current.delete(uuid);
    }, DEBOUNCE_DELAY);

    debounceTimeoutsRef.current.set(uuid, timeout);
  }, []);

  const cleanupStaleCursors = useCallback(() => {
    const now = Date.now();
    setRemoteCursors((prev) => {
      const staleUuids = Object.keys(prev).filter(
        (uuid) => now - prev[uuid].lastSeen > STALE_TIMEOUT
      );

      if (staleUuids.length === 0) return prev;

      const updated = { ...prev };
      staleUuids.forEach((uuid) => {
        delete updated[uuid];
        const timeout = debounceTimeoutsRef.current.get(uuid);
        if (timeout) {
          clearTimeout(timeout);
          debounceTimeoutsRef.current.delete(uuid);
        }
      });

      return updated;
    });
  }, []);

  useEffect(() => {
    const cleanupInterval = setInterval(cleanupStaleCursors, CLEANUP_INTERVAL);
    return () => clearInterval(cleanupInterval);
  }, [cleanupStaleCursors]);

  useEffect(() => {
    if (isConnected) {
      socketFunctionsRef.current = { on, off };
    }
  }, [isConnected, on, off]);

  const eventHandlers = useMemo(
    () => ({
      handleRemoteCursor: (data: CursorData) => {
        if (!isValidCursorData(data)) return;
        debouncedCursorUpdate(data.uuid, data);
      },

      handleUserConnect: (data: CursorData) => {
        if (!isValidCursorData(data)) return;
        setRemoteCursors((prev) => ({
          ...prev,
          [data.uuid]: { cursor: data, lastSeen: Date.now() },
        }));
      },

      handleUserDisconnect: (uuid: string) => {
        if (uuid === myUUID) return;

        setRemoteCursors((prev) => {
          const { [uuid]: removed, ...rest } = prev;
          return rest;
        });

        const timeout = debounceTimeoutsRef.current.get(uuid);
        if (timeout) {
          clearTimeout(timeout);
          debounceTimeoutsRef.current.delete(uuid);
        }

        setRemoteArtistNames((prev) => {
          const { [uuid]: removed, ...rest } = prev;
          return rest;
        });
      },

      handleCanvasCleared: () => {
        setRemoteCursors({});
        debounceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        debounceTimeoutsRef.current.clear();
      },

      handleArtistNameChange: (data: { uuid: string; name: string }) => {
        if (data.uuid !== myUUID && data.name) {
          setRemoteArtistNames((prev) => ({
            ...prev,
            [data.uuid]: data.name,
          }));
        }
      },

      handleSessionInit: (data: { uuid: string; name: string }) => {
        if (data.uuid === myUUID) {
          setArtistName(data.name);
        }
      },
    }),
    [myUUID, setArtistName, isValidCursorData, debouncedCursorUpdate]
  );

  useEffect(() => {
    if (!isConnected || !socketFunctionsRef.current) return;

    const { on: socketOn, off: socketOff } = socketFunctionsRef.current;

    socketOn(EVENTS.REMOTE_CURSOR, eventHandlers.handleRemoteCursor);
    socketOn(EVENTS.USER_CONNECT, eventHandlers.handleUserConnect);
    socketOn(EVENTS.USER_DISCONNECT, eventHandlers.handleUserDisconnect);
    socketOn(EVENTS.CANVAS_CLEARED, eventHandlers.handleCanvasCleared);
    socketOn(EVENTS.ARTIST_NAME_CHANGE, eventHandlers.handleArtistNameChange);
    socketOn(EVENTS.SESSION_INIT, eventHandlers.handleSessionInit);

    return () => {
      socketOff(EVENTS.REMOTE_CURSOR, eventHandlers.handleRemoteCursor);
      socketOff(EVENTS.USER_CONNECT, eventHandlers.handleUserConnect);
      socketOff(EVENTS.USER_DISCONNECT, eventHandlers.handleUserDisconnect);
      socketOff(EVENTS.CANVAS_CLEARED, eventHandlers.handleCanvasCleared);
      socketOff(EVENTS.ARTIST_NAME_CHANGE, eventHandlers.handleArtistNameChange);
      socketOff(EVENTS.SESSION_INIT, eventHandlers.handleSessionInit);
    };
  }, [isConnected, eventHandlers]);

  // Memoized viewport calculations
  const viewportBounds = useMemo(() => {
    const { x: vx, y: vy, scale } = viewport
    const vw = window.innerWidth / scale
    const vh = window.innerHeight / scale
    
    return {
      minX: vx - VIEWPORT_MARGIN,
      maxX: vx + vw + VIEWPORT_MARGIN,
      minY: vy - VIEWPORT_MARGIN,
      maxY: vy + vh + VIEWPORT_MARGIN,
      scale
    }
  }, [viewport.x, viewport.y, viewport.scale])

  // Optimized cursor filtering and transformation
  const visibleCursors = useMemo((): VisibleCursor[] => {
    const { minX, maxX, minY, maxY, scale } = viewportBounds
    
    return Object.values(remoteCursors)
      .filter(({ cursor }) => cursor.uuid !== myUUID)
      .filter(({ cursor }) =>
        cursor.x >= minX && cursor.x <= maxX &&
        cursor.y >= minY && cursor.y <= maxY
      )
      .map(({ cursor }) => {
        const baseSize = cursor.size || 8
        const size = Math.max(baseSize * scale, 12)
        const canvasRef = useCanvasStore.getState().canvasRef
        const canvasRect = canvasRef?.current?.getBoundingClientRect()
        const canvasOffsetX = canvasRect?.left || 0
        const canvasOffsetY = canvasRect?.top || 0
        const screenX = (cursor.x - viewport.x) * scale + canvasOffsetX
        const screenY = (cursor.y - viewport.y) * scale + canvasOffsetY
        
        return {
          ...cursor,
          size,
          screenX,
          screenY,
          color: cursor.color || "#00f",
        }
      })
  }, [remoteCursors, viewportBounds, myUUID, viewport.x, viewport.y])

  const getDisplayName = useCallback((uuid: string) => {
    if (uuid === myUUID) {
      return customName || artistName || "Unknown Artist";
    }

    const cursor = remoteCursors[uuid]?.cursor;
    const cursorName = cursor?.name;
    const storedName = remoteArtistNames[uuid];

    return cursorName || storedName || "Unknown Artist";
  }, [myUUID, customName, artistName, remoteCursors, remoteArtistNames]);

  return {
    visibleCursors,
    getDisplayName,
  };
}; 