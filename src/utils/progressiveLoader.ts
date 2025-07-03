import { Stroke, Viewport, CONFIG } from '../../types';

export class ProgressiveLoader {
  private loadedChunks = new Set<number>();
  private loadingChunks = new Set<number>();
  private chunkCache = new Map<number, Stroke[]>();

  constructor(
    private requestChunk: (chunkIndex: number, viewport: Viewport) => void,
    private onChunkLoaded: (chunk: Stroke[], chunkIndex: number) => void
  ) {}

  requestVisibleChunks(viewport: Viewport, allStrokes: Stroke[]): void {
    const visibleStrokes = this.getVisibleStrokes(viewport, allStrokes);
    const chunkIndices = this.getChunkIndices(visibleStrokes);

    chunkIndices.forEach(chunkIndex => {
      if (!this.loadedChunks.has(chunkIndex) && !this.loadingChunks.has(chunkIndex)) {
        this.loadingChunks.add(chunkIndex);
        this.requestChunk(chunkIndex, viewport);
      }
    });
  }

  private getVisibleStrokes(viewport: Viewport, strokes: Stroke[]): Stroke[] {
    const { x, y, width, height, scale } = viewport;
    const padding = CONFIG.VIEWPORT_PADDING / scale;
    
    return strokes.filter(stroke => 
      stroke.points.some(point => 
        point.x >= x - padding && point.x <= x + width + padding &&
        point.y >= y - padding && point.y <= y + height + padding
      )
    );
  }

  private getChunkIndices(strokes: Stroke[]): number[] {
    const indices = new Set<number>();
    strokes.forEach(stroke => {
      const chunkIndex = Math.floor(stroke.timestamp / (CONFIG.PROGRESSIVE_CHUNK_SIZE * 1000));
      indices.add(chunkIndex);
    });
    return Array.from(indices).sort((a, b) => a - b);
  }

  handleChunkLoaded(chunk: Stroke[], chunkIndex: number): void {
    this.loadedChunks.add(chunkIndex);
    this.loadingChunks.delete(chunkIndex);
    this.chunkCache.set(chunkIndex, chunk);
    this.onChunkLoaded(chunk, chunkIndex);
  }

  clearCache(): void {
    this.loadedChunks.clear();
    this.loadingChunks.clear();
    this.chunkCache.clear();
  }

  getCacheStats() {
    return {
      loadedChunks: this.loadedChunks.size,
      loadingChunks: this.loadingChunks.size,
      cachedChunks: this.chunkCache.size
    };
  }
} 