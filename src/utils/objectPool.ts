import * as PIXI from 'pixi.js';

export class GraphicsPool {
  private pool: PIXI.Graphics[] = [];
  private maxSize: number;
  private createdCount = 0;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  acquire(): PIXI.Graphics {
    if (this.pool.length > 0) {
      const graphics = this.pool.pop()!;
      graphics.clear();
      return graphics;
    }
    
    this.createdCount++;
    return new PIXI.Graphics();
  }

  release(graphics: PIXI.Graphics): void {
    if (this.pool.length < this.maxSize) {
      graphics.clear();
      this.pool.push(graphics);
    } else {
      graphics.destroy();
    }
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      createdCount: this.createdCount,
      maxSize: this.maxSize
    };
  }

  clear(): void {
    this.pool.forEach(g => g.destroy());
    this.pool = [];
  }
}

export class StampPool {
  private pool: PIXI.Graphics[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  acquire(): PIXI.Graphics {
    if (this.pool.length > 0) {
      const stamp = this.pool.pop()!;
      stamp.clear();
      return stamp;
    }
    return new PIXI.Graphics();
  }

  release(stamp: PIXI.Graphics): void {
    if (this.pool.length < this.maxSize) {
      stamp.clear();
      this.pool.push(stamp);
    } else {
      stamp.destroy();
    }
  }

  clear(): void {
    this.pool.forEach(s => s.destroy());
    this.pool = [];
  }
} 