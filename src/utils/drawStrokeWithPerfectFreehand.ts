import getStroke from 'perfect-freehand'

export function getStrokePoints(points: [number, number][], options = {}) {
  return getStroke(points, {
    size: 8,
    thinning: 0.7,
    smoothing: 0.6,
    streamline: 0.5,
    ...options,
  })
}

// Utilisation :
// const stroke = getStrokePoints([[x1, y1], [x2, y2], ...])
// stroke est un tableau de points [x, y] à passer à moveTo/lineTo ou à PixiJS Graphics 