export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private warnings: string[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(label, duration);
      
      if (duration > 16) { // 60fps threshold
        this.warnings.push(`${label} took ${duration.toFixed(2)}ms`);
        console.warn(`�� Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(value);
    
    // Keep only last 100 measurements
    if (this.metrics.get(label)!.length > 100) {
      this.metrics.get(label)!.shift();
    }
  }

  getAverageMetric(label: string): number {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  clearWarnings(): void {
    this.warnings = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance(); 