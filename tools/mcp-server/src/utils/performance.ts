/**
 * Performance monitoring and metrics collection
 */

import type { PerformanceMetrics } from '../types/index.js';

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private readonly maxEntriesPerTool = 1000;

  /**
   * Record a tool execution
   */
  record(toolName: string, executionTime: number, cacheHit: boolean): void {
    const metric: PerformanceMetrics = {
      toolName,
      executionTime,
      cacheHit,
      timestamp: Date.now(),
    };

    const existing = this.metrics.get(toolName) || [];
    existing.push(metric);

    // Keep only recent entries
    if (existing.length > this.maxEntriesPerTool) {
      existing.shift();
    }

    this.metrics.set(toolName, existing);
  }

  /**
   * Get statistics for a specific tool
   */
  getStats(toolName: string) {
    const metrics = this.metrics.get(toolName) || [];

    if (metrics.length === 0) {
      return null;
    }

    const executionTimes = metrics.map(m => m.executionTime);
    const cacheHits = metrics.filter(m => m.cacheHit).length;

    return {
      toolName,
      totalExecutions: metrics.length,
      avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      p95ExecutionTime: this.percentile(executionTimes, 95),
      p99ExecutionTime: this.percentile(executionTimes, 99),
      cacheHitRate: (cacheHits / metrics.length) * 100,
    };
  }

  /**
   * Get statistics for all tools
   */
  getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const toolName of this.metrics.keys()) {
      const toolStats = this.getStats(toolName);
      if (toolStats) {
        stats[toolName] = toolStats;
      }
    }

    return stats;
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Clear old metrics (older than 1 hour)
   */
  clearOldMetrics(): number {
    const oneHourAgo = Date.now() - 3600000;
    let cleared = 0;

    for (const [toolName, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > oneHourAgo);
      const diff = metrics.length - filtered.length;
      cleared += diff;

      if (filtered.length > 0) {
        this.metrics.set(toolName, filtered);
      } else {
        this.metrics.delete(toolName);
      }
    }

    return cleared;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Periodic cleanup
setInterval(() => {
  perfMonitor.clearOldMetrics();
}, 300000); // Every 5 minutes
