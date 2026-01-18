/**
 * Cache manager for skills and metadata
 */

import * as fs from 'fs-extra';
import path from 'path';
import type { CacheEntry, CacheConfig } from '../../types';
import { getCachePath } from '../../utils';
import { logger } from '../../utils';

/**
 * Cache manager implementation
 */
export class CacheManager {
  private cachePath: string;
  private enabled: boolean;
  private ttl: number;
  private memoryCache: Map<string, CacheEntry> = new Map();

  constructor(config: CacheConfig = {}) {
    this.cachePath = config.path || getCachePath();
    this.enabled = config.enabled ?? true;
    this.ttl = config.ttl ?? 24 * 60 * 60; // 24 hours default
  }

  /**
   * Initialize cache
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      logger.debug('Cache is disabled');
      return;
    }

    try {
      await fs.ensureDir(this.cachePath);
      await this.cleanExpired();
      logger.debug(`Cache initialized at: ${this.cachePath}`);
    } catch (error) {
      logger.warn(`Failed to initialize cache: ${(error as Error).message}`);
      this.enabled = false;
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      // Check memory cache first
      const memEntry = this.memoryCache.get(key);
      if (memEntry && !this.isExpired(memEntry)) {
        logger.debug(`Memory cache hit: ${key}`);
        return memEntry.data as T;
      }

      // Check disk cache
      const cacheFile = this.getCacheFilePath(key);
      if (await fs.pathExists(cacheFile)) {
        const entry = await fs.readJson(cacheFile) as CacheEntry<T>;

        if (this.isExpired(entry)) {
          await this.delete(key);
          return null;
        }

        // Promote to memory cache
        this.memoryCache.set(key, entry);
        logger.debug(`Disk cache hit: ${key}`);
        return entry.data as T;
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.debug(`Cache get failed for ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, data: T, customTtl?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const now = Date.now();
      const ttl = customTtl ?? this.ttl;
      const expiresAt = now + ttl * 1000;

      const entry: CacheEntry<T> = {
        key,
        data,
        metadata: {
          createdAt: now,
          expiresAt,
          source: 'cache',
          version: '1.0.0',
        },
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Store in disk cache
      const cacheFile = this.getCacheFilePath(key);
      await fs.writeJson(cacheFile, entry, { spaces: 2 });

      logger.debug(`Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.warn(`Failed to cache ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // Remove from disk cache
      const cacheFile = this.getCacheFilePath(key);
      if (await fs.pathExists(cacheFile)) {
        await fs.remove(cacheFile);
        logger.debug(`Deleted cache: ${key}`);
      }
    } catch (error) {
      logger.debug(`Failed to delete cache ${key}: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear disk cache
      await fs.emptyDir(this.cachePath);
      logger.debug('Cache cleared');
    } catch (error) {
      logger.warn(`Failed to clear cache: ${(error as Error).message}`);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<void> {
    if (!this.enabled) return;

    try {
      const files = await fs.readdir(this.cachePath);
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cachePath, file);
        try {
          const entry = await fs.readJson(filePath) as CacheEntry;

          if (this.isExpired(entry)) {
            await fs.remove(filePath);
            cleaned++;
          }
        } catch {
          // Remove invalid cache files
          await fs.remove(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned ${cleaned} expired cache entries`);
      }
    } catch (error) {
      logger.debug(`Failed to clean expired cache: ${(error as Error).message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    diskEntries: number;
    totalSize: number;
  }> {
    const memoryEntries = this.memoryCache.size;
    let diskEntries = 0;
    let totalSize = 0;

    try {
      const files = await fs.readdir(this.cachePath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cachePath, file);
        const stats = await fs.stat(filePath);
        diskEntries++;
        totalSize += stats.size;
      }
    } catch {
      // Ignore errors
    }

    return { memoryEntries, diskEntries, totalSize };
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.metadata.expiresAt;
  }

  /**
   * Get cache file path for key
   */
  private getCacheFilePath(key: string): string {
    // Sanitize key for filename
    const sanitized = key.replace(/[^a-z0-9_-]/gi, '_');
    return path.join(this.cachePath, `${sanitized}.json`);
  }

  /**
   * Generate cache key
   */
  static generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }
}
