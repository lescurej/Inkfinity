import React from 'react'
import { useBrush } from '../hooks/useBrush'
import { useCanvas } from '../hooks/useCanvas'
import { useSocket } from '../hooks/useSocket'

const Controls = () => {
  const { brushColor, brushSize, brushType, updateBrushColor, updateBrushSize, updateBrushType } = useBrush()
  const { zoomIn, zoomOut, resetView } = useCanvas()
  const { emit } = useSocket()

  const handleClearCanvas = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer tout le canvas ?')) {
      emit('clearCanvas')
    }
  }

  return (
    <div className="controls">
      <div className="control-group">
        <button className="clear-btn" onClick={handleClearCanvas}>
          🧹 Effacer tout
        </button>
      </div>
      
      <div className="control-group">
        <label style={{fontSize: '12px'}}>
          Couleur : <input 
            type="color" 
            value={brushColor} 
            onChange={(e) => updateBrushColor(e.target.value)}
            style={{verticalAlign: 'middle'}}
          />
        </label>
      </div>
      
      <div className="control-group">
        <label style={{fontSize: '12px'}}>
          Taille : <input 
            type="range" 
            min="1" 
            max="20" 
            value={brushSize} 
            onChange={(e) => updateBrushSize(e.target.value)}
            style={{verticalAlign: 'middle', width: '60px'}}
          />
        </label>
        <span style={{fontSize: '12px'}}>{brushSize} px</span>
      </div>
      
      <div className="control-group">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>🔍+</button>
          <button className="zoom-btn" onClick={zoomOut}>🔍-</button>
          <button className="zoom-btn" onClick={resetView}>🏠</button>
        </div>
      </div>
      
      <div className="control-group">
        <div style={{fontSize: '11px', color: '#666', lineHeight: '1.4'}}>
          <strong>Navigation :</strong><br/>
          • Trackpad : Déplacer<br/>
          • Molette : Zoom<br/>
          • Ctrl+Clic : Pan
        </div>
      </div>
      
      <div className="control-group">
        <label style={{fontSize: '12px'}}>
          Brush :
          <select 
            value={brushType} 
            onChange={(e) => updateBrushType(e.target.value)}
            style={{verticalAlign: 'middle'}}
          >
            <option value="round">Rond doux</option>
            <option value="calligraphic">Calligraphique</option>
            <option value="crayon">Crayon</option>
            <option value="marker">Marqueur</option>
            <option value="eraser">Gomme</option>
            <option value="rainbow">Rainbow</option>
            <option value="pattern">Pattern</option>
          </select>
        </label>
      </div>
    </div>
  )
}

export default Controls 