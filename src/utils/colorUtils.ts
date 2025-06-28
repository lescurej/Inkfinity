export function generateVibrantRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 70 + Math.floor(Math.random() * 30)
  const lightness = 45 + Math.floor(Math.random() * 25)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generateVibrantRandomHexColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 70 + Math.floor(Math.random() * 30)
  const lightness = 45 + Math.floor(Math.random() * 25)
  
  return hslToHex(hue, saturation, lightness)
} 