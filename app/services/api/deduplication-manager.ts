/**
 * Request Deduplication Manager
 *
 * Prevents duplicate API requests by tracking in-flight requests and
 * returning the same promise for identical concurrent requests.
 */

import { ApiResponse } from "apisauce"

/**
 * Request key generation options
 */
interface RequestKeyOptions {
  url: string
  method: string
  data?: any
  params?: any
  headers?: Record<string, string>
  userId?: string
}

/**
 * In-flight request information
 */
interface InFlightRequest {
  promise: Promise<any>
  timestamp: number
  requestCount: number
  abortController?: AbortController
}

/**
 * Deduplication configuration
 */
interface DeduplicationConfig {
  enabled: boolean
  maxAge: number // Maximum age for in-flight requests
  includeHeaders: string[] // Headers to include in key generation
  excludeParams: string[] // Parameters to exclude from key generation
  cleanupInterval: number
}

/**
 * Deduplication statistics
 */
interface DeduplicationStats {
  totalRequests: number
  deduplicatedRequests: number
  inFlightCount: number
  cleanedUpRequests: number
  deduplicationRate: number
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DeduplicationConfig = {
  enabled: true,
  maxAge: 30000, // 30 seconds
  includeHeaders: ["authorization", "accept-language"],
  excludeParams: ["timestamp", "_t", "cache_bust"],
  cleanupInterval: 10000, // 10 seconds
}

/**
 * Request deduplication manager
 */
export class DeduplicationManager {
  private inFlightRequests = new Map<string, InFlightRequest>()
  private config: DeduplicationConfig
  private stats: DeduplicationStats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    inFlightCount: 0,
    cleanedUpRequests: 0,
    deduplicationRate: 0,
  }
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.enabled) {
      this.startCleanupTimer()
    }
  }

  /**
   * Generate unique key for request
   */
  private generateKey(options: RequestKeyOptions): string {
    const { url, method, data, params, headers, userId } = options

    // Start with method and URL
    const keyParts = [method.toUpperCase(), url]

    // Add user context
    if (userId) {
      keyParts.push(`user:${userId}`)
    }

    // Add relevant headers
    if (headers) {
      const headerParts = this.config.includeHeaders
        .filter(header => headers[header])
        .sort()
        .map(header => `${header}:${headers[header]}`)
      
      if (headerParts.length > 0) {
        keyParts.push(`headers:${headerParts.join(",")}`)
      }
    }

    // Add parameters (excluding excluded ones)
    if (params && typeof params === "object") {
      const filteredParams = { ...params }
      this.config.excludeParams.forEach(param => {
        delete filteredParams[param]
      })
      
      const paramKeys = Object.keys(filteredParams).sort()
      if (paramKeys.length > 0) {
        const paramString = paramKeys
          .map(key => `${key}=${JSON.stringify(filteredParams[key])}`)
          .join("&")
        keyParts.push(`params:${paramString}`)
      }
    }

    // Add data payload (for POST/PUT requests)
    if (data && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
      const dataHash = this.hashData(data)
      keyParts.push(`data:${dataHash}`)
    }

    return keyParts.join("|")
  }

  /**
   * Create hash for data payload
   */
  private hashData(data: any): string {
    if (typeof data === "string") {
      return this.simpleHash(data)
    }
    
    if (typeof data === "object" && data !== null) {
      return this.simpleHash(JSON.stringify(data))
    }
    
    return this.simpleHash(String(data))
  }

  /**
   * Simple hash function for data
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    keyOptions: RequestKeyOptions,
    requestFunction: (abortSignal?: AbortSignal) => Promise<T>
  ): Promise<T> {
    this.stats.totalRequests++

    if (!this.config.enabled) {
      return requestFunction()
    }

    const key = this.generateKey(keyOptions)
    const existing = this.inFlightRequests.get(key)

    // If request is already in flight, return the existing promise
    if (existing && this.isRequestValid(existing)) {
      existing.requestCount++
      this.stats.deduplicatedRequests++
      this.updateStats()
      
      console.log(`🔄 Deduplicated request: ${keyOptions.method} ${keyOptions.url} (${existing.requestCount} total)`)
      
      return existing.promise
    }

    // Create new request with abort controller
    const abortController = new AbortController()
    const requestPromise = this.executeNewRequest(
      requestFunction,
      abortController.signal
    )

    // Store in-flight request
    const inFlightRequest: InFlightRequest = {
      promise: requestPromise,
      timestamp: Date.now(),
      requestCount: 1,
      abortController,
    }

    this.inFlightRequests.set(key, inFlightRequest)
    this.updateStats()

    // Clean up after completion
    requestPromise.finally(() => {
      this.inFlightRequests.delete(key)
      this.updateStats()
    })

    return requestPromise
  }

  /**
   * Execute new request with proper error handling
   */
  private async executeNewRequest<T>(
    requestFunction: (abortSignal?: AbortSignal) => Promise<T>,
    abortSignal: AbortSignal
  ): Promise<T> {
    try {
      return await requestFunction(abortSignal)
    } catch (error) {
      // Don't deduplicate failed requests for too long
      throw error
    }
  }

  /**
   * Check if in-flight request is still valid
   */
  private isRequestValid(request: InFlightRequest): boolean {
    const age = Date.now() - request.timestamp
    return age < this.config.maxAge
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAllRequests(): void {
    for (const [key, request] of this.inFlightRequests.entries()) {
      if (request.abortController) {
        request.abortController.abort()
      }
    }
    
    const cancelled = this.inFlightRequests.size
    this.inFlightRequests.clear()
    
    console.log(`🚫 Cancelled ${cancelled} in-flight requests`)
    this.updateStats()
  }

  /**
   * Cancel specific request by key
   */
  cancelRequest(keyOptions: RequestKeyOptions): boolean {
    const key = this.generateKey(keyOptions)
    const request = this.inFlightRequests.get(key)
    
    if (request && request.abortController) {
      request.abortController.abort()
      this.inFlightRequests.delete(key)
      this.updateStats()
      return true
    }
    
    return false
  }

  /**
   * Get in-flight requests count
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicationStats {
    return { ...this.stats }
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      inFlightCount: this.inFlightRequests.size,
      cleanedUpRequests: 0,
      deduplicationRate: 0,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeduplicationConfig>): void {
    const wasEnabled = this.config.enabled
    this.config = { ...this.config, ...newConfig }
    
    // Handle timer when enabling/disabling
    if (!wasEnabled && this.config.enabled) {
      this.startCleanupTimer()
    } else if (wasEnabled && !this.config.enabled) {
      this.stopCleanupTimer()
      this.cancelAllRequests()
    }
  }

  /**
   * Clean up expired in-flight requests
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedUp = 0

    for (const [key, request] of this.inFlightRequests.entries()) {
      if (!this.isRequestValid(request)) {
        if (request.abortController) {
          request.abortController.abort()
        }
        this.inFlightRequests.delete(key)
        cleanedUp++
      }
    }

    if (cleanedUp > 0) {
      this.stats.cleanedUpRequests += cleanedUp
      console.log(`🧹 Cleaned up ${cleanedUp} expired in-flight requests`)
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
   * Update statistics
   */
  private updateStats(): void {
    this.stats.inFlightCount = this.inFlightRequests.size
    
    if (this.stats.totalRequests > 0) {
      this.stats.deduplicationRate = this.stats.deduplicatedRequests / this.stats.totalRequests
    }
  }

  /**
   * Destroy manager and clean up resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.cancelAllRequests()
    this.clearStats()
  }
}

/**
 * Deduplication strategies for different request types
 */
export const DeduplicationStrategies = {
  /**
   * Aggressive deduplication for read operations
   */
  aggressive: {
    enabled: true,
    maxAge: 60000, // 1 minute
    includeHeaders: ["authorization"],
    excludeParams: ["timestamp", "_t", "cache_bust", "random"],
  },

  /**
   * Standard deduplication for most operations
   */
  standard: {
    enabled: true,
    maxAge: 30000, // 30 seconds
    includeHeaders: ["authorization", "accept-language"],
    excludeParams: ["timestamp", "_t"],
  },

  /**
   * Conservative deduplication for write operations
   */
  conservative: {
    enabled: true,
    maxAge: 10000, // 10 seconds
    includeHeaders: ["authorization"],
    excludeParams: ["timestamp"],
  },

  /**
   * No deduplication for critical operations
   */
  disabled: {
    enabled: false,
    maxAge: 0,
    includeHeaders: [],
    excludeParams: [],
  },
}

/**
 * Global deduplication manager instance
 */
export const globalDeduplicationManager = new DeduplicationManager({
  enabled: true,
  maxAge: 30000,
  cleanupInterval: 15000,
})

/**
 * Deduplication utilities
 */
export const DeduplicationUtils = {
  /**
   * Create manager with specific strategy
   */
  createWithStrategy(strategy: keyof typeof DeduplicationStrategies): DeduplicationManager {
    return new DeduplicationManager(DeduplicationStrategies[strategy])
  },

  /**
   * Wrap function with deduplication
   */
  withDeduplication<T>(
    keyOptions: RequestKeyOptions,
    requestFunction: (abortSignal?: AbortSignal) => Promise<T>,
    strategy: keyof typeof DeduplicationStrategies = "standard"
  ): Promise<T> {
    const manager = DeduplicationUtils.createWithStrategy(strategy)
    return manager.execute(keyOptions, requestFunction)
  },

  /**
   * Check if requests should be deduplicated
   */
  shouldDeduplicate(method: string, url: string): boolean {
    // Don't deduplicate write operations by default
    const writeOperations = ["POST", "PUT", "PATCH", "DELETE"]
    if (writeOperations.includes(method.toUpperCase())) {
      return false
    }

    // Don't deduplicate certain endpoints
    const excludePatterns = [
      /\/auth\/login/,
      /\/auth\/logout/,
      /\/auth\/refresh/,
      /\/orders\/\d+\/pay/, // Payment endpoints
      /\/upload/, // File uploads
    ]

    return !excludePatterns.some(pattern => pattern.test(url))
  },

  /**
   * Get appropriate strategy for request
   */
  getStrategyForRequest(method: string, url: string): keyof typeof DeduplicationStrategies {
    const upperMethod = method.toUpperCase()

    // No deduplication for write operations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
      return "disabled"
    }

    // Conservative for user-specific data
    if (url.includes("/profile") || url.includes("/orders")) {
      return "conservative"
    }

    // Aggressive for catalog/reference data
    if (url.includes("/fabrics") || url.includes("/catalog") || url.includes("/styles")) {
      return "aggressive"
    }

    return "standard"
  },

  /**
   * Debug deduplication state
   */
  debugDeduplication(): void {
    if (__DEV__) {
      const stats = globalDeduplicationManager.getStats()
      console.log("🔄 Deduplication Statistics:", {
        ...stats,
        deduplicationRate: `${(stats.deduplicationRate * 100).toFixed(1)}%`,
      })
    }
  },

  /**
   * Monitor deduplication effectiveness
   */
  monitorEffectiveness(): void {
    if (__DEV__) {
      setInterval(() => {
        const stats = globalDeduplicationManager.getStats()
        
        if (stats.totalRequests > 0) {
          console.log(`📊 Deduplication: ${stats.deduplicatedRequests}/${stats.totalRequests} requests deduplicated (${(stats.deduplicationRate * 100).toFixed(1)}%)`)
        }
        
        if (stats.inFlightCount > 10) {
          console.warn(`⚠️  High number of in-flight requests: ${stats.inFlightCount}`)
        }
      }, 30000) // Every 30 seconds
    }
  },
}

/**
 * Service-specific deduplication managers
 */
export const ServiceDeduplicationManagers = {
  catalog: DeduplicationUtils.createWithStrategy("aggressive"),
  orders: DeduplicationUtils.createWithStrategy("conservative"),
  profile: DeduplicationUtils.createWithStrategy("standard"),
  auth: DeduplicationUtils.createWithStrategy("disabled"),
}