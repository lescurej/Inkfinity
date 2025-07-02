import React from "react";
import styled from "@emotion/styled";
import type { VisibleCursor } from "./types";

const RemoteCursorContainer = styled.div<{
  x: number;
  y: number;
  color: string;
  size: number;
}>`
  position: absolute;
  left: ${(props) => props.x}px;
  top: ${(props) => props.y}px;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  background: ${(props) => props.color};
  border-radius: 50%;
  border: 2px solid #222;
  opacity: 0.7;
  pointer-events: none;
  z-index: 99;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-family: monospace;
  color: #222;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
`;

const UUIDLabel = styled.span`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, 0.2em);
  background: rgba(255, 255, 255, 0.85);
  color: #222;
  font-size: 0.7rem;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 4px;
  margin-top: 2px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
`;

interface RemoteCursorProps {
  cursor: VisibleCursor;
  displayName: string;
}

const RemoteCursor: React.FC<RemoteCursorProps> = ({ cursor, displayName }) => {
  return (
    <RemoteCursorContainer
      x={cursor.screenX}
      y={cursor.screenY}
      color={cursor.color}
      size={cursor.size}
    >
      <UUIDLabel>{displayName}</UUIDLabel>
    </RemoteCursorContainer>
  );
};

export default RemoteCursor;
