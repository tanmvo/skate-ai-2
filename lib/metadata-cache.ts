import { MetadataCacheEntry, CacheStats } from './types/metadata';

/**
 * Simple in-memory cache with TTL for metadata
 * For Phase 0, we use a basic implementation. Later phases can add Redis or other storage.
 */

class MetadataCache {
  private cache = new Map<string, MetadataCacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };
  private maxSize = 1000; // Maximum number of cache entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    const entry: MetadataCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    this.stats.size = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }
    
    return true;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    this.stats.evictions += removedCount;
    this.stats.size = this.cache.size;
    
    return removedCount;
  }

  // Get cache key patterns for invalidation
  getKeysMatching(pattern: string): string[] {
    const keys: string[] = [];
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  // Invalidate cache entries matching a pattern
  invalidatePattern(pattern: string): number {
    const keys = this.getKeysMatching(pattern);
    let removed = 0;
    
    for (const key of keys) {
      if (this.cache.delete(key)) {
        removed++;
      }
    }
    
    this.stats.evictions += removed;
    this.stats.size = this.cache.size;
    
    return removed;
  }
}

// Global cache instance
const globalCache = new MetadataCache();

// Cache key generators
export function studyMetadataKey(studyId: string): string {
  return `study:${studyId}:metadata`;
}

export function studyContextKey(studyId: string): string {
  return `study:${studyId}:context`;
}

export function documentReferencesKey(studyId: string): string {
  return `study:${studyId}:doc-refs`;
}

export function documentNamesKey(documentIds: string[]): string {
  const sortedIds = [...documentIds].sort();
  return `docs:${sortedIds.join(',')}:names`;
}

export function studyStatsKey(studyId: string): string {
  return `study:${studyId}:stats`;
}

// Cached function wrappers
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = globalCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  globalCache.set(key, data, ttl);
  
  return data;
}

// Cache invalidation helpers
export function invalidateStudyCache(studyId: string): number {
  return globalCache.invalidatePattern(`study:${studyId}:*`);
}

export function invalidateDocumentCache(documentIds: string[]): number {
  let removed = 0;
  
  for (const docId of documentIds) {
    removed += globalCache.invalidatePattern(`*${docId}*`);
  }
  
  return removed;
}

// Cache management
export function clearAllCache(): void {
  globalCache.clear();
}

export function getCacheStats(): CacheStats {
  return globalCache.getStats();
}

export function cleanupExpiredEntries(): number {
  return globalCache.cleanup();
}

// Auto-cleanup every 10 minutes
setInterval(() => {
  cleanupExpiredEntries();
}, 10 * 60 * 1000);

// Export cache instance for direct access if needed
export { globalCache as metadataCache };