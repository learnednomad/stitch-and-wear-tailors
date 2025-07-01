/**
 * Reactotron API Plugin for Services Layer Integration
 *
 * Provides comprehensive API monitoring and debugging capabilities for
 * the enhanced services layer from Issue #46.
 */

import { Reactotron } from "./ReactotronClient"
import { ApiResponse } from "apisauce"
import { globalAnalyticsManager } from "../services/api/analytics-manager"
import { globalCacheManager } from "../services/api/cache-manager"
import { globalDeduplicationManager } from "../services/api/deduplication-manager"

/**
 * API request tracking interface
 */
interface ApiRequestLog {
  id: string
  method: string
  url: string
  headers: Record<string, string>
  data?: any
  params?: any
  timestamp: number
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  response?: any
  error?: any
  cached?: boolean
  deduplicated?: boolean
  retryCount?: number
  userId?: string
}

/**
 * API monitoring plugin for Reactotron
 */
export class ReactotronApiPlugin {
  private requests = new Map<string, ApiRequestLog>()
  private isEnabled = __DEV__

  /**
   * Track API request start
   */
  trackRequest(options: {
    id: string
    method: string
    url: string
    headers?: Record<string, string>
    data?: any
    params?: any
    userId?: string
  }): void {
    if (!this.isEnabled) return

    const { id, method, url, headers = {}, data, params, userId } = options

    const request: ApiRequestLog = {
      id,
      method: method.toUpperCase(),
      url,
      headers,
      data,
      params,
      timestamp: Date.now(),
      startTime: Date.now(),
      userId,
    }

    this.requests.set(id, request)

    // Log to Reactotron
    Reactotron.log(`🚀 API Request Started: ${method.toUpperCase()} ${url}`, {
      id,
      headers,
      data,
      params,
      userId,
    })
  }

  /**
   * Track API request completion
   */
  trackResponse(options: {
    id: string
    response?: ApiResponse<any>
    error?: any
    cached?: boolean
    deduplicated?: boolean
    retryCount?: number
  }): void {
    if (!this.isEnabled) return

    const { id, response, error, cached, deduplicated, retryCount } = options
    const request = this.requests.get(id)

    if (!request) return

    const endTime = Date.now()
    const duration = endTime - request.startTime

    const updatedRequest: ApiRequestLog = {
      ...request,
      endTime,
      duration,
      status: response?.status,
      response: response?.data,
      error: error?.message || response?.problem,
      cached,
      deduplicated,
      retryCount,
    }

    this.requests.set(id, updatedRequest)

    // Determine log level and emoji
    const success = response?.ok || false
    const emoji = success ? "✅" : "❌"
    const cacheInfo = cached ? " [CACHED]" : ""
    const dedupInfo = deduplicated ? " [DEDUPED]" : ""
    const retryInfo = retryCount ? ` [RETRY:${retryCount}]` : ""

    // Log to Reactotron with detailed info
    Reactotron.log(
      `${emoji} API Response: ${request.method} ${request.url} - ${duration}ms${cacheInfo}${dedupInfo}${retryInfo}`,
      {
        id,
        status: response?.status,
        duration: `${duration}ms`,
        success,
        data: response?.data,
        error: error?.message || response?.problem,
        cached,
        deduplicated,
        retryCount,
      }
    )

    // For errors, use Reactotron's error display
    if (!success && (error || response?.problem)) {
      Reactotron.error(
        `API Error: ${request.method} ${request.url}`,
        error || response?.problem
      )
    }

    // Clean up old requests (keep last 100)
    if (this.requests.size > 100) {
      const oldestKey = Array.from(this.requests.keys())[0]
      this.requests.delete(oldestKey)
    }
  }

  /**
   * Get all API requests for debugging
   */
  getAllRequests(): ApiRequestLog[] {
    return Array.from(this.requests.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): ApiRequestLog[] {
    return this.getAllRequests().filter(req => !req.response || req.error)
  }

  /**
   * Get slow requests (> 2 seconds)
   */
  getSlowRequests(): ApiRequestLog[] {
    return this.getAllRequests().filter(req => req.duration && req.duration > 2000)
  }

  /**
   * Clear all request history
   */
  clearHistory(): void {
    this.requests.clear()
    Reactotron.log("📝 API request history cleared")
  }

  /**
   * Get API analytics summary
   */
  getAnalyticsSummary() {
    if (!this.isEnabled) return null

    const analytics = globalAnalyticsManager.generateReport(60 * 60 * 1000) // Last hour
    return {
      performance: analytics.performance,
      summary: analytics.summary,
      errors: analytics.errors.slice(0, 5), // Top 5 errors
      slowEndpoints: analytics.slowEndpoints.slice(0, 5), // Top 5 slow endpoints
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.isEnabled) return null

    return {
      stats: globalCacheManager.getStats(),
      // Add any other available cache information
    }
  }

  /**
   * Get deduplication statistics
   */
  getDeduplicationStats() {
    if (!this.isEnabled) return null

    return globalDeduplicationManager.getStats()
  }
}

/**
 * Global API plugin instance
 */
export const reactotronApiPlugin = new ReactotronApiPlugin()

/**
 * Utility functions for API monitoring
 */
export const ReactotronApiUtils = {
  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Track API call with automatic request/response logging
   */
  async trackApiCall<T>(
    method: string,
    url: string,
    apiCall: () => Promise<ApiResponse<T>>,
    options: {
      headers?: Record<string, string>
      data?: any
      params?: any
      userId?: string
      cached?: boolean
      deduplicated?: boolean
      retryCount?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const id = ReactotronApiUtils.generateRequestId()
    
    // Track request start
    reactotronApiPlugin.trackRequest({
      id,
      method,
      url,
      headers: options.headers,
      data: options.data,
      params: options.params,
      userId: options.userId,
    })

    try {
      const response = await apiCall()
      
      // Track response
      reactotronApiPlugin.trackResponse({
        id,
        response,
        cached: options.cached,
        deduplicated: options.deduplicated,
        retryCount: options.retryCount,
      })

      return response
    } catch (error) {
      // Track error
      reactotronApiPlugin.trackResponse({
        id,
        error,
        cached: options.cached,
        deduplicated: options.deduplicated,
        retryCount: options.retryCount,
      })

      throw error
    }
  },

  /**
   * Log service layer statistics to Reactotron
   */
  logServiceStats(): void {
    if (!__DEV__) return

    const analytics = reactotronApiPlugin.getAnalyticsSummary()
    const cache = reactotronApiPlugin.getCacheStats()
    const deduplication = reactotronApiPlugin.getDeduplicationStats()

    Reactotron.display({
      name: "📊 API Service Statistics",
      preview: "Performance, Cache, and Deduplication Stats",
      value: {
        analytics,
        cache,
        deduplication,
      },
      important: true,
    })
  },

  /**
   * Show API request history in Reactotron
   */
  showRequestHistory(): void {
    if (!__DEV__) return

    const allRequests = reactotronApiPlugin.getAllRequests()
    const failedRequests = reactotronApiPlugin.getFailedRequests()
    const slowRequests = reactotronApiPlugin.getSlowRequests()

    Reactotron.display({
      name: "📋 API Request History",
      preview: `${allRequests.length} total requests`,
      value: {
        summary: {
          total: allRequests.length,
          failed: failedRequests.length,
          slow: slowRequests.length,
        },
        recentRequests: allRequests.slice(0, 10),
        failedRequests: failedRequests.slice(0, 5),
        slowRequests: slowRequests.slice(0, 5),
      },
      important: false,
    })
  },

  /**
   * Clear all API monitoring data
   */
  clearAll(): void {
    if (!__DEV__) return

    reactotronApiPlugin.clearHistory()
    globalAnalyticsManager.clearData()
    globalDeduplicationManager.clearStats()

    Reactotron.log("🧹 All API monitoring data cleared")
  },
}