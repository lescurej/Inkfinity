import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import * as PIXI from "pixi.js";
import { useBrush } from "../hooks/useBrush";
import { useCanvasSocket } from "../hooks/useCanvasSocket";
import CanvasGrid from "./CanvasGrid";
import styled from "@emotion/styled";
import { useCanvasStore } from "../store/canvasStore";
import { useUserStore } from "../store/userStore";
import { createStroke } from "../utils/brushEngine";
import { EVENTS } from "../../types";

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;
  font-size: 16px;
  backdrop-filter: blur(4px);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const drawingGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const drawingContainerRef = useRef<PIXI.Container | null>(null);
  const staticGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const realtimeGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const { uuid: myUUID, customName, artistName } = useUserStore();

  const [currentStroke, setCurrentStroke] = useState<
    { x: number; y: number }[]
  >([]);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canvasStore = useCanvasStore();
  const {
    viewport,
    screenToWorld,
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setCanvasRef,
  } = canvasStore;

  const {
    brushColor,
    brushType,
    getBrushSizeInPixels,
    getBrushSizeForDrawing,
  } = useBrush();
  const { emit, on, off, isConnected } = useCanvasSocket();

  const canvasRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        canvasRef.current = node;
        setCanvasRef(canvasRef);

        if (!pixiAppRef.current) {
          try {
            const app = new PIXI.Application({
              width: window.innerWidth,
              height: window.innerHeight,
              backgroundAlpha: 0,
              antialias: true,
              resolution: 1,
            });

            node.appendChild(app.view as HTMLCanvasElement);

            if (app.view.style) {
              (app.view.style as any).width = "100vw";
              (app.view.style as any).height = "100vh";
              (app.view.style as any).position = "absolute";
              (app.view.style as any).zIndex = "1";
              (app.view.style as any).pointerEvents = "none";
            }

            const drawingContainer = new PIXI.Container();
            app.stage.addChild(drawingContainer);
            drawingContainerRef.current = drawingContainer;

            // Create separate graphics for static and real-time content
            const staticGraphics = new PIXI.Graphics();
            const realtimeGraphics = new PIXI.Graphics();

            drawingContainer.addChild(staticGraphics);
            drawingContainer.addChild(realtimeGraphics);

            staticGraphicsRef.current = staticGraphics;
            realtimeGraphicsRef.current = realtimeGraphics;
            drawingGraphicsRef.current = realtimeGraphics; // Keep for backward compatibility

            pixiAppRef.current = app;
          } catch (error) {
            console.error("❌ Error initializing PIXI:", error);
          }
        }
      } else {
        if (pixiAppRef.current) {
          pixiAppRef.current.destroy(true);
          pixiAppRef.current = null;
          drawingGraphicsRef.current = null;
          staticGraphicsRef.current = null;
          realtimeGraphicsRef.current = null;
          drawingContainerRef.current = null;
        }
      }
    },
    [setCanvasRef]
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.renderer.resize(
          window.innerWidth,
          window.innerHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Apply viewport transformation to PIXI container
  useEffect(() => {
    if (drawingContainerRef.current) {
      drawingContainerRef.current.position.set(
        -viewport.x * viewport.scale,
        -viewport.y * viewport.scale
      );
      drawingContainerRef.current.scale.set(viewport.scale, viewport.scale);
    }
  }, [viewport.x, viewport.y, viewport.scale]);

  // Set up event listeners immediately when socket connects
  useEffect(() => {
    const handleCanvasState = (data: any) => {
      if (!pixiAppRef.current) return;

      const graphics = drawingGraphicsRef.current;
      if (graphics && data.strokes) {
        graphics.clear();

        data.strokes.forEach((stroke: any) => {
          if (
            stroke.points &&
            Array.isArray(stroke.points) &&
            stroke.points.length > 1
          ) {
            const color = PIXI.Color.shared
              .setValue(stroke.color || "#000000")
              .toNumber();
            const size = (stroke.size || 1) * viewport.scale;

            graphics.lineStyle(size, color, 1);

            const firstPoint = stroke.points[0];
            if (
              firstPoint &&
              typeof firstPoint.x === "number" &&
              typeof firstPoint.y === "number"
            ) {
              graphics.moveTo(firstPoint.x, firstPoint.y);

              for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                if (
                  point &&
                  typeof point.x === "number" &&
                  typeof point.y === "number"
                ) {
                  graphics.lineTo(point.x, point.y);
                }
              }
            }
          }
        });
      }

      setIsReady(true);
      setIsLoading(false);

      window.dispatchEvent(new CustomEvent("canvas-state-loaded"));
    };

    on(EVENTS.CANVAS_STATE, handleCanvasState);

    return () => {
      off(EVENTS.CANVAS_STATE, handleCanvasState);
    };
  }, [on, off, viewport.scale]);

  // Request state when both connected and PIXI is ready
  useEffect(() => {
    if (isConnected && pixiAppRef.current) {
      emit(EVENTS.REQUEST_STATE);
    }
  }, [isConnected, emit]);

  // Handle individual stroke additions
  useEffect(() => {
    if (!isConnected || !pixiAppRef.current) return;

    const handleStrokeAdded = (stroke: any) => {
      const graphics = drawingGraphicsRef.current;
      if (
        graphics &&
        stroke.points &&
        Array.isArray(stroke.points) &&
        stroke.points.length > 1
      ) {
        const color = PIXI.Color.shared
          .setValue(stroke.color || "#000000")
          .toNumber();
        const size = (stroke.size || 1) * viewport.scale;

        graphics.lineStyle(size, color, 1);

        const firstPoint = stroke.points[0];
        if (
          firstPoint &&
          typeof firstPoint.x === "number" &&
          typeof firstPoint.y === "number"
        ) {
          graphics.moveTo(firstPoint.x, firstPoint.y);

          for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            if (
              point &&
              typeof point.x === "number" &&
              typeof point.y === "number"
            ) {
              graphics.lineTo(point.x, point.y);
            }
          }
        }
      }
    };

    on(EVENTS.STROKE_ADDED, handleStrokeAdded);

    return () => {
      off(EVENTS.STROKE_ADDED, handleStrokeAdded);
    };
  }, [isConnected, on, off, viewport.scale]);

  // Render static segments from chunks (only when chunks change, not viewport)
  useEffect(() => {
    if (!pixiAppRef.current) return;

    const graphics = staticGraphicsRef.current;
    if (graphics) {
      graphics.clear();

      // Render all segments from chunks (not just visible ones)
      // The viewport transformation handles the visibility
      const allSegments = canvasStore.getAllSegments();
      allSegments.forEach((segment) => {
        if (
          segment.x1 !== undefined &&
          segment.y1 !== undefined &&
          segment.x2 !== undefined &&
          segment.y2 !== undefined
        ) {
          const color = PIXI.Color.shared
            .setValue(segment.color || "#000000")
            .toNumber();
          const size = segment.size || segment.width || 1;

          graphics.lineStyle(size, color, 1);
          graphics.moveTo(segment.x1, segment.y1);
          graphics.lineTo(segment.x2, segment.y2);
        }
      });
    }
  }, [canvasStore.drawingChunks]); // Only depend on chunks, not viewport

  // Handle real-time stroke segments (use realtime graphics)
  useEffect(() => {
    if (!isConnected || !pixiAppRef.current) return;

    const handleStrokeSegment = (segment: any) => {
      const graphics = realtimeGraphicsRef.current;
      if (graphics && segment.from && segment.to) {
        const color = PIXI.Color.shared
          .setValue(segment.color || "#000000")
          .toNumber();
        const size = (segment.size || 1) * viewport.scale;

        graphics.lineStyle(size, color, 1);
        graphics.moveTo(segment.from.x, segment.from.y);
        graphics.lineTo(segment.to.x, segment.to.y);
      }
    };

    on(EVENTS.STROKE_SEGMENT, handleStrokeSegment);

    return () => {
      off(EVENTS.STROKE_SEGMENT, handleStrokeSegment);
    };
  }, [isConnected, on, off, viewport.scale]);

  // Clear real-time graphics when canvas is cleared
  useEffect(() => {
    if (!isConnected || !pixiAppRef.current) return;

    const handleCanvasCleared = () => {
      const staticGraphics = staticGraphicsRef.current;
      const realtimeGraphics = realtimeGraphicsRef.current;
      if (staticGraphics) {
        staticGraphics.clear();
      }
      if (realtimeGraphics) {
        realtimeGraphics.clear();
      }
    };

    on(EVENTS.CANVAS_CLEARED, handleCanvasCleared);

    return () => {
      off(EVENTS.CANVAS_CLEARED, handleCanvasCleared);
    };
  }, [isConnected, on, off]);

  // Create a function to get the display name
  const getDisplayName = useCallback(() => {
    return customName || artistName || "Unknown Artist";
  }, [customName, artistName]);

  // Mouse handlers
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isReady) return;

      handleMouseDown(e);
      if (e.button === 0 && !canvasStore.spacePressed) {
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        setCurrentStroke([{ x, y }]);
        canvasStore.setLastPoint({ x, y });
        canvasStore.setDrawing(true);
      }
    },
    [
      isReady,
      handleMouseDown,
      canvasStore.spacePressed,
      screenToWorld,
      canvasStore.setLastPoint,
      canvasStore.setDrawing,
    ]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isReady) return;

      handleMouseMove(e);

      // Emit cursor movement for remote cursors
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const cursorData = {
        uuid: myUUID,
        x,
        y,
        size: getBrushSizeInPixels(),
        color: brushColor,
        brush: brushType,
        name: getDisplayName(),
        viewport: {
          x: viewport.x,
          y: viewport.y,
          width: window.innerWidth,
          height: window.innerHeight,
          scale: viewport.scale,
        },
      };

      // Only emit cursor movement if we have a valid name
      if (cursorData.name && cursorData.name !== "Connecting...") {
        emit(EVENTS.CURSOR_MOVE, cursorData);
      }

      if (canvasStore.drawing && canvasStore.lastPoint) {
        const newStroke = [...currentStroke, { x, y }];
        setCurrentStroke(newStroke);
        canvasStore.setLastPoint({ x, y });

        if (newStroke.length >= 2) {
          const size = getBrushSizeForDrawing(viewport.scale);
          const graphics = drawingGraphicsRef.current;

          if (graphics && brushType !== "eraser") {
            const color = PIXI.Color.shared.setValue(brushColor).toNumber();
            graphics.lineStyle(size, color, 1);
            graphics.moveTo(
              newStroke[newStroke.length - 2].x,
              newStroke[newStroke.length - 2].y
            );
            graphics.lineTo(x, y);
          }

          const segment = {
            from: newStroke[newStroke.length - 2],
            to: { x, y },
            color: brushType === "eraser" ? "#FFFFFF" : brushColor,
            size: getBrushSizeInPixels(),
            brush: brushType,
            uuid: myUUID,
          };
          emit(EVENTS.STROKE_SEGMENT, segment);
        }
      }
    },
    [
      isReady,
      canvasStore.drawing,
      canvasStore.lastPoint,
      currentStroke,
      brushColor,
      getBrushSizeInPixels,
      screenToWorld,
      canvasStore.setLastPoint,
      viewport.scale,
      viewport.x,
      viewport.y,
      emit,
      myUUID,
      brushType,
      getDisplayName,
      getBrushSizeForDrawing,
    ]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (!isReady) return;

    handleMouseUp();
    if (currentStroke.length > 1) {
      const stroke = createStroke(
        currentStroke,
        brushColor,
        getBrushSizeInPixels(),
        brushType
      );
      emit(EVENTS.STROKE_ADDED, stroke);
    }
    setCurrentStroke([]);
    canvasStore.setLastPoint(null);
  }, [
    isReady,
    handleMouseUp,
    currentStroke,
    brushColor,
    getBrushSizeInPixels,
    brushType,
    emit,
    canvasStore.setLastPoint,
  ]);

  const handleCanvasMouseLeave = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isReady) return;

      handleTouchStart(e);

      // Only handle drawing for single touch
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const { x, y } = screenToWorld(touch.clientX, touch.clientY);
        setCurrentStroke([{ x, y }]);
        canvasStore.setLastPoint({ x, y });
      }
    },
    [isReady, handleTouchStart, screenToWorld, canvasStore.setLastPoint]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isReady) return;

      handleTouchMove(e);

      // Only handle drawing for single touch
      if (
        e.touches.length === 1 &&
        canvasStore.drawing &&
        canvasStore.lastPoint
      ) {
        const touch = e.touches[0];
        const { x, y } = screenToWorld(touch.clientX, touch.clientY);

        const newStroke = [...currentStroke, { x, y }];
        setCurrentStroke(newStroke);
        canvasStore.setLastPoint({ x, y });

        if (newStroke.length >= 2) {
          const size = getBrushSizeForDrawing(viewport.scale);
          const graphics = drawingGraphicsRef.current;

          if (graphics && brushType !== "eraser") {
            const color = PIXI.Color.shared.setValue(brushColor).toNumber();
            graphics.lineStyle(size, color, 1);
            graphics.moveTo(
              newStroke[newStroke.length - 2].x,
              newStroke[newStroke.length - 2].y
            );
            graphics.lineTo(x, y);
          }

          const segment = {
            from: newStroke[newStroke.length - 2],
            to: { x, y },
            color: brushType === "eraser" ? "#FFFFFF" : brushColor,
            size: getBrushSizeInPixels(),
            brush: brushType,
            uuid: myUUID,
          };
          emit(EVENTS.STROKE_SEGMENT, segment);
        }

        const cursorData = {
          uuid: myUUID,
          x,
          y,
          size: getBrushSizeInPixels(),
          color: brushColor,
          brush: brushType,
          name: getDisplayName(),
          viewport: {
            x: viewport.x,
            y: viewport.y,
            width: window.innerWidth,
            height: window.innerHeight,
            scale: viewport.scale,
          },
        };

        // Only emit cursor movement if we have a valid name
        if (cursorData.name && cursorData.name !== "Connecting...") {
          emit(EVENTS.CURSOR_MOVE, cursorData);
        }
      }
    },
    [
      isReady,
      canvasStore.drawing,
      canvasStore.lastPoint,
      currentStroke,
      brushColor,
      getBrushSizeInPixels,
      screenToWorld,
      canvasStore.setLastPoint,
      viewport.scale,
      viewport.x,
      viewport.y,
      emit,
      myUUID,
      brushType,
      handleTouchMove,
      getDisplayName,
      getBrushSizeForDrawing,
    ]
  );

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isReady) return;

      handleTouchEnd(e);

      // Only finish stroke if we were actually drawing
      if (currentStroke.length > 1 && canvasStore.drawing) {
        const stroke = createStroke(
          currentStroke,
          brushColor,
          getBrushSizeInPixels(),
          brushType
        );
        emit(EVENTS.STROKE_ADDED, stroke);
      }
      setCurrentStroke([]);
      canvasStore.setLastPoint(null);
    },
    [
      isReady,
      handleTouchEnd,
      currentStroke,
      canvasStore.drawing,
      brushColor,
      getBrushSizeInPixels,
      brushType,
      emit,
      canvasStore.setLastPoint,
    ]
  );

  return (
    <div
      ref={canvasRefCallback}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
      }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseLeave}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleCanvasTouchMove}
      onTouchEnd={handleCanvasTouchEnd}
    >
      {isLoading && (
        <LoadingOverlay>
          <LoadingSpinner />
          <span>Loading canvas...</span>
        </LoadingOverlay>
      )}

      <GridOverlay>
        <CanvasGrid
          viewport={{
            x: viewport.x,
            y: viewport.y,
            scale: viewport.scale,
            width: window.innerWidth,
            height: window.innerHeight,
          }}
        />
      </GridOverlay>
    </div>
  );
};

export default Canvas;
