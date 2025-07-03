import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  FC,
  useEffect,
} from "react";
import type { BrushSettings } from "../types";
import { generateVibrantRandomHexColor } from "../utils/colorUtils";

export type BrushType = "round" | "eraser";

interface BrushContextValue {
  brushColor: string;
  brushSizePercent: number;
  brushType: BrushType;
  brushSettings: BrushSettings;
  updateBrushColor: (color: string) => void;
  updateBrushSize: (size: number | string) => void;
  updateBrushType: (type: BrushType) => void;
  getBrushSizeInPixels: () => number;
  getBrushSizeForDrawing: (viewportScale: number) => number;
  getBrushSizeForDisplay: (viewportScale: number) => number;
}

const BrushContext = createContext<BrushContextValue | undefined>(undefined);

export const BrushProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [brushColor, setBrushColor] = useState<string>(
    generateVibrantRandomHexColor()
  );
  const [brushSizePercent, setBrushSizePercent] = useState<number>(2);
  const [brushType, setBrushType] = useState<BrushType>("round");
  const [, forceUpdate] = useState({});

  const updateBrushColor = useCallback((color: string) => {
    setBrushColor(color);
  }, []);

  const updateBrushSize = useCallback((size: number | string) => {
    const newSize = typeof size === "string" ? parseFloat(size) : size;
    setBrushSizePercent(newSize);
  }, []);

  const updateBrushType = useCallback((type: BrushType) => {
    setBrushType(type);
  }, []);

  const getBrushSizeInPixels = useCallback(() => {
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    return (brushSizePercent / 100) * screenSize;
  }, [brushSizePercent]);

  const getBrushSizeForDrawing = useCallback(
    (viewportScale: number) => {
      const baseSize = getBrushSizeInPixels();
      return baseSize * viewportScale;
    },
    [getBrushSizeInPixels]
  );

  const getBrushSizeForDisplay = useCallback(
    (viewportScale: number) => {
      const baseSize = getBrushSizeInPixels();
      return Math.max(baseSize * viewportScale, 8);
    },
    [getBrushSizeInPixels]
  );

  // Recalculer la taille quand la fenêtre change
  useEffect(() => {
    const handleResize = () => {
      forceUpdate({});
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const brushSettings: BrushSettings = {
    color: brushColor,
    width: getBrushSizeInPixels(),
    opacity: 1,
  };

  return (
    <BrushContext.Provider
      value={{
        brushColor,
        brushSizePercent,
        brushType,
        brushSettings,
        updateBrushColor,
        updateBrushSize,
        updateBrushType,
        getBrushSizeInPixels,
        getBrushSizeForDrawing,
        getBrushSizeForDisplay,
      }}
    >
      {children}
    </BrushContext.Provider>
  );
};

export const useBrush = () => {
  const ctx = useContext(BrushContext);
  if (!ctx) throw new Error("useBrush must be used within a BrushProvider");
  return ctx;
};
