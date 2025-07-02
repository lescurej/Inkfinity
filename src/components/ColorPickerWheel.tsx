import React, { useEffect, useRef } from "react";
import iro from "@jaames/iro";
import { useBrush } from "../hooks/useBrush";

const ColorPickerWheel: React.FC = () => {
  const { brushColor, updateBrushColor } = useBrush();
  const pickerRef = useRef<HTMLDivElement>(null);
  const iroPicker = useRef<iro.ColorPicker | null>(null);

  useEffect(() => {
    if (!pickerRef.current) return;
    if (!iroPicker.current) {
      const picker = new (iro.ColorPicker as any)(pickerRef.current, {
        width: 180,
        color: brushColor,
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: "value" } },
          { component: iro.ui.Slider, options: { sliderType: "alpha" } },
        ],
      }) as iro.ColorPicker;
      picker.on("color:change", (color: any) => {
        updateBrushColor(color.hexString);
      });
      iroPicker.current = picker;
    } else {
      iroPicker.current.color.hexString = brushColor;
    }
  }, [brushColor, updateBrushColor]);

  return (
    <div
      ref={pickerRef}
      style={{ touchAction: "none", width: 180, height: 200 }}
    />
  );
};

export default ColorPickerWheel;
