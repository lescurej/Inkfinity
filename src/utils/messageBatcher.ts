import { StrokeSegment, CONFIG } from '../../types';

export class MessageBatcher {
  private batches = new Map<string, StrokeSegment[]>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private emitFunction: (event: string, data: any) => void;

  constructor(emitFunction: (event: string, data: any) => void) {
    this.emitFunction = emitFunction;
  }

  addSegment(uuid: string, segment: StrokeSegment): void {
    if (!this.batches.has(uuid)) {
      this.batches.set(uuid, []);
    }

    const batch = this.batches.get(uuid)!;
    batch.push(segment);

    if (batch.length >= CONFIG.BATCH_SIZE) {
      this.flushBatch(uuid);
    } else {
      this.scheduleFlush(uuid);
    }
  }

  private scheduleFlush(uuid: string): void {
    if (this.timeouts.has(uuid)) {
      clearTimeout(this.timeouts.get(uuid)!);
    }

    const timeout = setTimeout(() => {
      this.flushBatch(uuid);
    }, CONFIG.BATCH_TIMEOUT);

    this.timeouts.set(uuid, timeout);
  }

  private flushBatch(uuid: string): void {
    const batch = this.batches.get(uuid);
    if (!batch || batch.length === 0) return;

    const batchData = {
      segments: [...batch],
      timestamp: Date.now(),
      uuid
    };

    this.emitFunction('strokeSegmentBatch', batchData);
    
    this.batches.delete(uuid);
    if (this.timeouts.has(uuid)) {
      clearTimeout(this.timeouts.get(uuid)!);
      this.timeouts.delete(uuid);
    }
  }

  flushAll(): void {
    for (const uuid of this.batches.keys()) {
      this.flushBatch(uuid);
    }
  }

  clear(): void {
    this.batches.clear();
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
} 