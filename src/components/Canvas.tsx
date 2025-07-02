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

const StatsDisplay = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 1000;
  min-width: 150px;
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
  const { uuid: myUUID } = useUserStore();

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
    setCanvasRef,
  } = canvasStore;

  const { brushColor, brushType, getBrushSizeInPixels } = useBrush();
  const { emit, on, off, isConnected } = useCanvasSocket();

  // PIXIJS RECOMMENDED APPROACH: Use useCallback for ref
  const canvasRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        canvasRef.current = node;
        setCanvasRef(canvasRef);

        // Initialize PIXI immediately when ref is available
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

            const drawingGraphics = new PIXI.Graphics();
            drawingContainer.addChild(drawingGraphics);
            drawingGraphicsRef.current = drawingGraphics;

            pixiAppRef.current = app;
          } catch (error) {
            console.error("❌ Error initializing PIXI:", error);
          }
        }
      } else {
        // Cleanup when ref is null (component unmounting)
        if (pixiAppRef.current) {
          pixiAppRef.current.destroy(true);
          pixiAppRef.current = null;
          drawingGraphicsRef.current = null;
        }
      }
    },
    [setCanvasRef]
  );

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

  // Handle stroke segments for real-time drawing
  useEffect(() => {
    if (!isConnected || !pixiAppRef.current) return;

    const handleStrokeSegment = (segment: any) => {
      const graphics = drawingGraphicsRef.current;
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

  // Handle canvas cleared
  useEffect(() => {
    if (!isConnected || !pixiAppRef.current) return;

    const handleCanvasCleared = () => {
      const graphics = drawingGraphicsRef.current;
      if (graphics) {
        graphics.clear();
      }
    };

    on(EVENTS.CANVAS_CLEARED, handleCanvasCleared);

    return () => {
      off(EVENTS.CANVAS_CLEARED, handleCanvasCleared);
    };
  }, [isConnected, on, off]);

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

      if (canvasStore.drawing && canvasStore.lastPoint) {
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        const newStroke = [...currentStroke, { x, y }];
        setCurrentStroke(newStroke);
        canvasStore.setLastPoint({ x, y });

        if (newStroke.length >= 2) {
          const size = getBrushSizeInPixels() * viewport.scale;
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
      emit,
      myUUID,
      brushType,
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

  return (
    <div
      ref={canvasRefCallback}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseLeave}
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
