/**
 * In-memory cache with TTL support
 * Thread-safe and optimized for performance
 */

import type { CacheEntry } from '../types/index.js';

export class Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttl: number = 5000): void {
    const entry: CacheEntry = {
      value,
      expiry: Date.now() + ttl,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    this.metrics.sets++;

    // Schedule automatic cleanup
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 10000) / 100, // percentage with 2 decimals
      size: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get or set pattern - returns cached value or computes and caches it
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number = 5000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Singleton instance
export const cache = new Cache();

// Periodic cleanup
setInterval(() => {
  cache.cleanup();
}, 60000); // Every minute
