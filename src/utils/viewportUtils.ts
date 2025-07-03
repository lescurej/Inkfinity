import type { Point } from '../types';
import type { Viewport } from '../store/canvasStore';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
}

export const viewportUtils = {
  screenToWorld: (screenX: number, screenY: number, viewport: Viewport, canvasRect?: DOMRect): Point => {
    if (!canvasRect) {
      return { x: 0, y: 0 };
    }
    const x = (screenX - canvasRect.left) / viewport.scale + viewport.x;
    const y = (screenY - canvasRect.top) / viewport.scale + viewport.y;
    return { x, y };
  },

  worldToScreen: (worldX: number, worldY: number, viewport: Viewport, canvasRect?: DOMRect): Point => {
    if (!canvasRect) {
      return { x: 0, y: 0 };
    }
    const x = (worldX - viewport.x) * viewport.scale + canvasRect.left;
    const y = (worldY - viewport.y) * viewport.scale + canvasRect.top;
    return { x, y };
  },

  getViewportBounds: (viewport: Viewport, margin: number = 100): ViewportBounds => {
    const vw = window.innerWidth / viewport.scale;
    const vh = window.innerHeight / viewport.scale;
    
    return {
      minX: viewport.x - margin,
      maxX: viewport.x + vw + margin,
      minY: viewport.y - margin,
      maxY: viewport.y + vh + margin,
      scale: viewport.scale
    };
  },

  isPointInViewport: (point: Point, bounds: ViewportBounds): boolean => {
    return point.x >= bounds.minX && point.x <= bounds.maxX &&
           point.y >= bounds.minY && point.y <= bounds.maxY;
  },

  calculateFitToContent: (strokes: any[], padding: number = 100): Viewport => {
    if (strokes.length === 0) {
      return { x: 0, y: 0, scale: 1 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    strokes.forEach(stroke => {
      if (stroke.points && Array.isArray(stroke.points)) {
        stroke.points.forEach((point: Point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      }
    });
    
    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;
    const minContentSize = 200;
    
    if (contentWidth < minContentSize) {
      const center = minX + contentWidth / 2;
      minX = center - minContentSize / 2;
      maxX = center + minContentSize / 2;
      contentWidth = minContentSize;
    }
    if (contentHeight < minContentSize) {
      const center = minY + contentHeight / 2;
      minY = center - minContentSize / 2;
      maxY = center + minContentSize / 2;
      contentHeight = minContentSize;
    }
    
    const scaleX = (window.innerWidth - padding * 2) / contentWidth;
    const scaleY = (window.innerHeight - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 5);
    const centerX = minX + contentWidth / 2;
    const centerY = minY + contentHeight / 2;
    const viewportX = centerX - window.innerWidth / 2 / scale;
    const viewportY = centerY - window.innerHeight / 2 / scale;
    
    return { x: viewportX, y: viewportY, scale };
  }
}; 