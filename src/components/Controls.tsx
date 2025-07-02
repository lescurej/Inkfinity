import React, { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { useBrush } from "../hooks/useBrush";
import { useCanvasSocket } from "../hooks/useCanvasSocket";
import { useCanvasStore } from "../store/canvasStore";
import ColorPickerWheel from "./ColorPickerWheel";

const Toolbar = styled.div`
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 4px 8px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  border: 1px solid rgba(220, 220, 220, 0.5);
  min-width: 0;
  height: 40px;
  box-sizing: border-box;
  overflow: visible;
  pointer-events: auto;
  width: 75vw;

  @media (max-width: 600px) {
    width: 90vw;
    left: 5vw;
    transform: none;
    bottom: 6px;
    padding: 2px 4px;
    gap: 3px;
    height: 48px;
    border-radius: 7px;
  }
`;

const ToolButton = styled.button`
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  border: none;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  &:hover {
    background: #f3f3f3;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
  @media (max-width: 600px) {
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    font-size: 0.9rem;
    border-radius: 5px;
  }
`;

const ColorSection = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ColorPreviewButton = styled.button<{ color: string }>`
  background: ${(props) => props.color};
  color: #333;
  border: 2px solid rgba(255, 255, 255, 0.8);
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  @media (max-width: 600px) {
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    font-size: 0.9rem;
  }
`;

const SizeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  flex: 1;
  min-width: 0;
  @media (max-width: 600px) {
    gap: 2px;
  }
`;

const SizeSlider = styled.div`
  position: relative;
  width: 100%;
  height: 28px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  @media (max-width: 600px) {
    height: 36px;
    border-radius: 7px;
    padding: 0 6px;
  }
`;

const SizeInput = styled.input`
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to right, #e0e0e0, #333);
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #333;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  &::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #333;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  @media (max-width: 600px) {
    &::-webkit-slider-thumb {
      width: 22px;
      height: 22px;
    }
    &::-moz-range-thumb {
      width: 22px;
      height: 22px;
    }
    height: 8px;
  }
`;

const SizeDisplay = styled.div`
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;

const ToolSection = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex-shrink: 0;
  @media (max-width: 600px) {
    gap: 2px;
  }
`;

const ToolSelect = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 600px) {
    width: 28px;
    height: 28px;
  }
`;

const ToolButtonWithPreview = styled.button<{ active: boolean }>`
  width: 28px;
  height: 28px;
  background: ${(props) =>
    props.active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.8)"};
  border: ${(props) =>
    props.active ? "2px solid rgba(59,130,246,0.4)" : "1px solid #eee"};
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  @media (max-width: 600px) {
    width: 22px;
    height: 22px;
    font-size: 1rem;
    border-radius: 5px;
  }
`;

const ToolDropdown = styled.div<{ open: boolean }>`
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 8px;
  display: ${(props) => (props.open ? "grid" : "none")};
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  min-width: 120px;
  border: 1px solid #eee;
  z-index: 100;
`;

const ToolOption = styled.button<{ active: boolean }>`
  background: ${(props) =>
    props.active ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.8)"};
  border: ${(props) =>
    props.active
      ? "2px solid rgba(59,130,246,0.5)"
      : "1px solid rgba(0,0,0,0.1)"};
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
  }
`;

const ToolName = styled.span`
  font-size: 0.7rem;
  color: #666;
  text-align: center;
`;

const Divider = styled.div`
  width: 1px;
  height: 40px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 4px;
  flex-shrink: 0;
  @media (max-width: 600px) {
    margin: 0 2px;
  }
`;

const TOOLS = [
  {
    id: "round",
    name: "Round",
    icon: (
      <span
        style={{
          fontSize: "1.5em",
          color: "#111",
          display: "inline-block",
          lineHeight: 1,
        }}
      >
        ●
      </span>
    ),
  },
  { id: "eraser", name: "Eraser", icon: "🧽" },
];

const ColorPopover = styled.div`
  position: absolute;
  z-index: 300;
  left: 0;
  right: 0;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  top: -290px;
`;

const ZoomControls = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
  @media (max-width: 600px) {
    display: none;
  }
`;

const MobileOnly = styled.div`
  display: none;
  @media (max-width: 600px) {
    display: flex;
    flex-direction: row;
    gap: 2px;
    align-items: center;
    flex-shrink: 0;
  }
`;

interface ControlsProps {
  showClearButton?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ showClearButton = false }) => {
  const {
    brushColor,
    brushSizePercent,
    updateBrushSize,
    brushType,
    updateBrushType,
  } = useBrush();
  const { emit, on, off } = useCanvasSocket();
  const { zoomIn, zoomOut, resetView, clearChunks, fitToContentWithServer } =
    useCanvasStore();
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false);
  const toolSelectRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolSelectRef.current &&
        !toolSelectRef.current.contains(event.target as Node)
      ) {
        setToolDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!colorOpen) return;
    let timeoutId: number | null = null;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target;
      // If event target is not a Node, always close
      if (!(target instanceof Node)) {
        setColorOpen(false);
        return;
      }
      if (colorBtnRef.current && colorBtnRef.current.contains(target)) return;
      if (colorPopoverRef.current && colorPopoverRef.current.contains(target))
        return;
      setColorOpen(false);
    };
    timeoutId = window.setTimeout(() => {
      window.addEventListener("mousedown", handleClick, true);
      window.addEventListener("touchstart", handleClick, true);
    }, 0);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("mousedown", handleClick, true);
      window.removeEventListener("touchstart", handleClick, true);
    };
  }, [colorOpen]);

  const handleClearCanvas = () => {
    if (isClearing) return;

    setIsClearing(true);

    try {
      clearChunks();
      emit("clear-canvas");
    } catch (error) {
      console.error("❌ Error clearing canvas:", error);
    } finally {
      setTimeout(() => setIsClearing(false), 1000);
    }
  };

  const handleFitToContent = () => {
    fitToContentWithServer(emit, on, off);
  };

  const currentTool = TOOLS.find((t) => t.id === brushType) || {
    id: "round",
    name: "Brush",
    icon: (
      <span
        style={{
          fontSize: "1.5em",
          color: "#111",
          display: "inline-block",
          lineHeight: 1,
        }}
      >
        ●
      </span>
    ),
  };

  return (
    <>
      <Toolbar>
        <ToolSection>
          {showClearButton && (
            <ToolButton
              onClick={handleClearCanvas}
              title="Clear Canvas"
              disabled={isClearing}
              style={{ opacity: isClearing ? 0.5 : 1 }}
            >
              {isClearing ? "⏳" : "🧹"}
            </ToolButton>
          )}
        </ToolSection>
        <Divider />
        <ColorSection>
          <ColorPreviewButton
            ref={colorBtnRef}
            onClick={() => setColorOpen((v) => !v)}
            title="Color Picker"
            color={brushColor}
          />
          {colorOpen && (
            <ColorPopover ref={colorPopoverRef}>
              <ColorPickerWheel />
            </ColorPopover>
          )}
        </ColorSection>
        <SizeSection>
          <SizeSlider>
            <SizeInput
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={brushSizePercent}
              onChange={(e) => updateBrushSize(Number(e.target.value))}
            />
            <SizeDisplay>{brushSizePercent.toFixed(1)}%</SizeDisplay>
          </SizeSlider>
        </SizeSection>
        <ToolSection>
          <ToolSelect ref={toolSelectRef}>
            <ToolButtonWithPreview
              active={toolDropdownOpen}
              onClick={() => setToolDropdownOpen(!toolDropdownOpen)}
              title={currentTool.name}
            >
              {currentTool.icon}
            </ToolButtonWithPreview>
            <ToolDropdown open={toolDropdownOpen}>
              {TOOLS.map((tool) => (
                <ToolOption
                  key={tool.id}
                  active={tool.id === brushType}
                  onClick={() => {
                    updateBrushType(tool.id as any);
                    setToolDropdownOpen(false);
                  }}
                >
                  {tool.icon}
                  <ToolName>{tool.name}</ToolName>
                </ToolOption>
              ))}
            </ToolDropdown>
          </ToolSelect>
        </ToolSection>
        <Divider />
        <ZoomControls>
          <ToolButton onClick={zoomIn} title="Zoom In">
            🔍+
          </ToolButton>
          <ToolButton onClick={zoomOut} title="Zoom Out">
            🔍-
          </ToolButton>
          <ToolButton onClick={resetView} title="Reset View">
            🏠
          </ToolButton>
          <ToolButton onClick={handleFitToContent} title="Fit to Content">
            📐
          </ToolButton>
        </ZoomControls>
        <MobileOnly>
          <ToolButton onClick={resetView} title="Reset View">
            🏠
          </ToolButton>
          <ToolButton onClick={handleFitToContent} title="Fit to Content">
            📐
          </ToolButton>
        </MobileOnly>
      </Toolbar>
    </>
  );
};

export default Controls;
