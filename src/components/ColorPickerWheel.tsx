import React, { useEffect, useRef } from 'react'
import iro from '@jaames/iro'
import { useBrush } from '../hooks/useBrush'

const ColorPickerWheel: React.FC = () => {
  const { brushColor, updateBrushColor } = useBrush()
  const pickerRef = useRef<HTMLDivElement>(null)
  const iroPicker = useRef<any>(null)

  useEffect(() => {
    if (!pickerRef.current) return
    if (!iroPicker.current) {
      iroPicker.current = new iro.ColorPicker(pickerRef.current, {
        width: 180,
        color: brushColor,
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: 'value' } },
          { component: iro.ui.Slider, options: { sliderType: 'alpha' } }
        ]
      })
      iroPicker.current.on('color:change', (color: any) => {
        updateBrushColor(color.hexString)
      })
    } else {
      iroPicker.current.color.hexString = brushColor
    }
  }, [brushColor, updateBrushColor])

  return (
    <div ref={pickerRef} style={{ touchAction: 'none', width: 180, height: 200 }} />
  )
}

export default ColorPickerWheel 