import React from "react";
import { useBrush } from "../hooks/useBrush";
import { useCanvasStore } from "../store/canvasStore";
import styled from "@emotion/styled";

const StyledCursorPreview = styled.div<{
  size: number;
  left: number;
  top: number;
  color: string;
}>`
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  left: ${(props) => props.left}px;
  top: ${(props) => props.top}px;
  background: ${(props) => props.color};
  position: fixed;
  pointer-events: none;
  z-index: 100;
  opacity: 0.8;
  mix-blend-mode: multiply;
  border-radius: 50%;
  border: 2px solid #222;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  cursor: none;
`;

const CursorPreview: React.FC = () => {
  const { brushColor, getBrushSizeForDisplay } = useBrush();
  const { mousePosition, viewport } = useCanvasStore();

  const size = getBrushSizeForDisplay(viewport.scale);
  const left = mousePosition.x;
  const top = mousePosition.y;

  // Afficher seulement si la souris a bougé
  if (mousePosition.x === 0 && mousePosition.y === 0) {
    return null;
  }

  return (
    <StyledCursorPreview size={size} left={left} top={top} color={brushColor} />
  );
};

export default CursorPreview;
