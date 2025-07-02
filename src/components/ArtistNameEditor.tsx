import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { useCanvasSocket } from "../hooks/useCanvasSocket";
import { useUserStore } from "../store/userStore";
import { EVENTS } from "../../shared/types";

const ArtistNameInput = styled.input`
  position: fixed;
  top: 32px;
  left: 24px;
  font-size: 0.75rem;
  font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
  font-weight: 300;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.95);
  color: #000;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  z-index: 1003;
  min-width: 120px;

  &:focus {
    border-color: rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 1);
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.5);
  }
`;

const ArtistNameLabel = styled.div`
  position: fixed;
  top: 14px;
  left: 24px;
  font-size: 0.68rem;
  font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.7);
  z-index: 1002;
  pointer-events: none;
  letter-spacing: 0.3px;
  user-select: none;
  @media (max-width: 600px) {
    top: 10px;
    left: 12px;
  }
`;

const ArtistNameRow = styled.div`
  position: fixed;
  top: 32px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1002;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.8);
  font-size: 0.95rem;
  font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
  font-weight: 300;
  letter-spacing: 0.5px;
  opacity: 0.8;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
    color: #222;
  }
  @media (max-width: 600px) {
    top: 24px;
    left: 12px;
    font-size: 0.9rem;
  }
`;

const EditIcon = styled.span<{ hovered: boolean }>`
  font-size: 1em;
  margin-left: 2px;
  opacity: ${(props) => (props.hovered ? 1 : 0.7)};
  transition: opacity 0.2s;
`;

const ArtistNameEditor: React.FC = () => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { emit } = useCanvasSocket();
  const {
    uuid: myUUID,
    customName,
    setCustomName,
    artistName,
  } = useUserStore();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameClick = useCallback(() => {
    setIsEditingName(true);
  }, []);

  const handleNameSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const newName = e.currentTarget.value.trim();
        if (newName) {
          setCustomName(newName);
          emit(EVENTS.ARTIST_NAME_CHANGE, { uuid: myUUID, name: newName });
        }
        setIsEditingName(false);
      } else if (e.key === "Escape") {
        setIsEditingName(false);
      }
    },
    [setCustomName, emit, myUUID]
  );

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const displayName = customName || artistName || "Unknown Artist";

  return (
    <>
      <ArtistNameLabel>Enter your name here:</ArtistNameLabel>
      {isEditingName ? (
        <ArtistNameInput
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={handleNameSubmit}
          onBlur={handleNameBlur}
          autoFocus
          placeholder="Enter your name here..."
          ref={inputRef}
        />
      ) : (
        <ArtistNameRow
          onClick={handleNameClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {displayName}
          <EditIcon hovered={isHovered} title="Edit name">
            ✏️
          </EditIcon>
        </ArtistNameRow>
      )}
    </>
  );
};

export default ArtistNameEditor;
