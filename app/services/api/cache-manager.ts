/**
 * API Cache Manager
 *
 * Provides intelligent caching for API requests with configurable TTL,
 * cache invalidation strategies, and memory management.
 */

import { ApiResponse } from "apisauce"

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  etag?: string
  lastModified?: string
  accessCount: number
  lastAccessed: number
}

/**
 * Cache configuration options
 */
interface CacheConfig {
  defaultTtl: number
  maxSize: number
  cleanupInterval: number
  enableEtag: boolean
  enableCompression: boolean
}

/**
 * Cache key generation options
 */
interface CacheKeyOptions {
  url: string
  method: string
  params?: Record<string, any>
  headers?: Record<string, string>
  userId?: string
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  hitRate: number
}

/**
 * Cache invalidation patterns
 */
type InvalidationPattern = {
  pattern: string | RegExp
  trigger: "time" | "dependency" | "manual"
  dependencies?: string[]
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum number of cached entries
  cleanupInterval: 60 * 1000, // Cleanup every minute
  enableEtag: true,
  enableCompression: false, // Could be enabled for large responses
}

/**
 * Cache manager implementation
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  }
  private cleanupTimer?: NodeJS.Timeout
  private invalidationPatterns: InvalidationPattern[] = []

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.startCleanupTimer()
  }

  /**
   * Generate cache key from request options
   */
  private generateKey(options: CacheKeyOptions): string {
    const { url, method, params, headers, userId } = options
    
    // Create a normalized key
    const keyParts = [
      method.toUpperCase(),
      url,
      userId || "anonymous",
    ]

    // Add sorted params
    if (params && Object.keys(params).length > 0) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join("&")
      keyParts.push(sortedParams)
    }

    // Add relevant headers (like authorization)
    if (headers) {
      const relevantHeaders = ["authorization", "accept-language"]
      const headerParts = relevantHeaders
        .filter(header => headers[header])
        .map(header => `${header}=${headers[header]}`)
        .join("&")
      
      if (headerParts) {
        keyParts.push(headerParts)
      }
    }

    return keyParts.join("|")
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now()
    return (now - entry.timestamp) < entry.ttl
  }

  /**
   * Get cached response
   */
  get<T>(keyOptions: CacheKeyOptions): ApiResponse<T> | null {
    const key = this.generateKey(keyOptions)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    if (!this.isValidEntry(entry)) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.deletes++
      this.updateStats()
      return null
    }

    // Update access information
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.stats.hits++
    this.updateHitRate()

    return entry.data
  }

  /**
   * Set cached response
   */
  set<T>(
    keyOptions: CacheKeyOptions,
    response: ApiResponse<T>,
    ttl: number = this.config.defaultTtl
  ): void {
    const key = this.generateKey(keyOptions)
    
    // Extract cache headers
    const etag = response.headers?.etag
    const lastModified = response.headers?.["last-modified"]

    const entry: CacheEntry<T> = {
      data: response,
      timestamp: Date.now(),
      ttl,
      etag,
      lastModified,
      accessCount: 0,
      lastAccessed: Date.now(),
    }

    // Check cache size and cleanup if necessary
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(key, entry)
    this.stats.sets++
    this.updateStats()
  }

  /**
   * Delete cached entry
   */
  delete(keyOptions: CacheKeyOptions): boolean {
    const key = this.generateKey(keyOptions)
    const deleted = this.cache.delete(key)
    
    if (deleted) {
      this.stats.deletes++
      this.updateStats()
    }
    
    return deleted
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats.deletes += size
    this.updateStats()
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string | RegExp): number {
    let deleted = 0
    
    for (const key of this.cache.keys()) {
      const matches = typeof pattern === "string" 
        ? key.includes(pattern)
        : pattern.test(key)
      
      if (matches) {
        this.cache.delete(key)
        deleted++
      }
    }
    
    this.stats.deletes += deleted
    this.updateStats()
    
    return deleted
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Add invalidation pattern
   */
  addInvalidationPattern(pattern: InvalidationPattern): void {
    this.invalidationPatterns.push(pattern)
  }

  /**
   * Trigger invalidation by dependency
   */
  invalidateByDependency(dependency: string): void {
    const patterns = this.invalidationPatterns.filter(p => 
      p.trigger === "dependency" && p.dependencies?.includes(dependency)
    )
    
    for (const pattern of patterns) {
      this.invalidate(pattern.pattern)
    }
  }

  /**
   * Check if response should be cached
   */
  shouldCache(response: ApiResponse<any>): boolean {
    // Don't cache errors (except 404 which might be useful)
    if (!response.ok && response.status !== 404) {
      return false
    }

    // Don't cache responses with cache-control: no-cache
    const cacheControl = response.headers?.["cache-control"]
    if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) {
      return false
    }

    // Don't cache responses that are too large (>1MB)
    const contentLength = response.headers?.["content-length"]
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return false
    }

    return true
  }

  /**
   * Get TTL from response headers
   */
  getTtlFromHeaders(response: ApiResponse<any>): number {
    const cacheControl = response.headers?.["cache-control"]
    
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        return parseInt(maxAgeMatch[1]) * 1000 // Convert to milliseconds
      }
    }
    
    const expires = response.headers?.expires
    if (expires) {
      const expiresDate = new Date(expires)
      const now = new Date()
      const ttl = expiresDate.getTime() - now.getTime()
      return Math.max(0, ttl)
    }
    
    return this.config.defaultTtl
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return

    let oldestKey = ""
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.deletes++
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let deleted = 0

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key)
        deleted++
      }
    }

    if (deleted > 0) {
      this.stats.deletes += deleted
      this.updateStats()
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size
    this.updateHitRate()
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
  }
}

/**
 * Cache strategies for different types of data
 */
export const CacheStrategies = {
  /**
   * User profile data - cache for longer periods
   */
  userProfile: {
    ttl: 15 * 60 * 1000, // 15 minutes
    invalidateOn: ["profile_updated", "user_deleted"],
  },

  /**
   * Fabric catalog - cache for medium periods
   */
  fabricCatalog: {
    ttl: 10 * 60 * 1000, // 10 minutes
    invalidateOn: ["inventory_updated", "catalog_refresh"],
  },

  /**
   * Order data - cache for short periods
   */
  orderData: {
    ttl: 2 * 60 * 1000, // 2 minutes
    invalidateOn: ["order_updated", "order_status_changed"],
  },

  /**
   * Static reference data - cache for very long periods
   */
  referenceData: {
    ttl: 60 * 60 * 1000, // 1 hour
    invalidateOn: ["app_version_updated"],
  },

  /**
   * Search results - cache for short periods
   */
  searchResults: {
    ttl: 5 * 60 * 1000, // 5 minutes
    invalidateOn: ["search_index_updated"],
  },
}

/**
 * Global cache manager instance
 */
export const globalCacheManager = new CacheManager({
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200, // Increase for production
  cleanupInterval: 2 * 60 * 1000, // Cleanup every 2 minutes
  enableEtag: true,
})

/**
 * Cache utilities
 */
export const CacheUtils = {
  /**
   * Create cache key for API requests
   */
  createApiKey(url: string, method: string, params?: any, userId?: string): CacheKeyOptions {
    return {
      url,
      method,
      params,
      userId,
    }
  },

  /**
   * Warm up cache with common requests
   */
  async warmupCache(requests: Array<{ key: CacheKeyOptions; fetcher: () => Promise<any> }>) {
    const results = await Promise.allSettled(
      requests.map(async ({ key, fetcher }) => {
        try {
          const response = await fetcher()
          globalCacheManager.set(key, response)
          return { key, success: true }
        } catch (error) {
          return { key, success: false, error }
        }
      })
    )

    return results
  },

  /**
   * Preload cache on app startup
   */
  async preloadEssentialData() {
    if (!__DEV__) {
      // In production, preload commonly accessed data
      console.log("🔄 Preloading essential cache data...")
      
      // This would typically include:
      // - User profile
      // - App configuration
      // - Static reference data
      // - Recent orders/favorites
    }
  },

  /**
   * Debug cache state
   */
  debugCache() {
    if (__DEV__) {
      const stats = globalCacheManager.getStats()
      console.log("📊 Cache Statistics:", stats)
      console.log("🗄️ Cache Size:", stats.size)
      console.log("🎯 Hit Rate:", `${(stats.hitRate * 100).toFixed(1)}%`)
    }
  },
}