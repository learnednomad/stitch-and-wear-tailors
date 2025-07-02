/**
 * API Analytics and Monitoring Manager
 *
 * Provides comprehensive analytics and monitoring for API requests,
 * including performance metrics, error tracking, and usage statistics.
 */

import { ApiResponse } from "apisauce"

/**
 * Request metrics
 */
interface RequestMetrics {
  url: string
  method: string
  status: number
  duration: number
  success: boolean
  error?: string
  timestamp: number
  userId?: string
  retryCount?: number
  cached?: boolean
  deduplicated?: boolean
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  averageResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  errorRate: number
}

/**
 * Error metrics
 */
interface ErrorMetrics {
  errorType: string
  count: number
  percentage: number
  lastOccurrence: number
  averageResponseTime: number
}

/**
 * Endpoint metrics
 */
interface EndpointMetrics {
  endpoint: string
  method: string
  totalRequests: number
  averageResponseTime: number
  successRate: number
  errorRate: number
  lastAccessed: number
}

/**
 * Usage patterns
 */
interface UsagePattern {
  hour: number
  requestCount: number
  averageResponseTime: number
  errorRate: number
}

/**
 * Analytics configuration
 */
interface AnalyticsConfig {
  enabled: boolean
  maxHistorySize: number
  aggregationInterval: number
  enableDetailedLogging: boolean
  enableErrorTracking: boolean
  enablePerformanceTracking: boolean
  enableUsageTracking: boolean
  excludeEndpoints: string[]
  onErrorThreshold?: (errorRate: number) => void
  onPerformanceThreshold?: (avgResponseTime: number) => void
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  maxHistorySize: 1000,
  aggregationInterval: 60000, // 1 minute
  enableDetailedLogging: __DEV__,
  enableErrorTracking: true,
  enablePerformanceTracking: true,
  enableUsageTracking: true,
  excludeEndpoints: ["/health", "/ping"],
}

/**
 * Analytics manager implementation
 */
export class AnalyticsManager {
  private config: AnalyticsConfig
  private requestHistory: RequestMetrics[] = []
  private errorCounts = new Map<string, number>()
  private endpointStats = new Map<string, EndpointMetrics>()
  private usageByHour = new Map<number, UsagePattern>()
  private aggregationTimer?: NodeJS.Timeout

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enabled) {
      this.startAggregation()
    }
  }

  /**
   * Track API request
   */
  trackRequest(request: {
    url: string
    method: string
    response?: ApiResponse<any>
    duration: number
    userId?: string
    retryCount?: number
    cached?: boolean
    deduplicated?: boolean
    error?: any
  }): void {
    if (!this.config.enabled) return

    const { url, method, response, duration, userId, retryCount, cached, deduplicated, error } =
      request

    // Check if endpoint should be excluded
    if (this.config.excludeEndpoints.some((pattern) => url.includes(pattern))) {
      return
    }

    const metrics: RequestMetrics = {
      url,
      method: method.toUpperCase(),
      status: response?.status || 0,
      duration,
      success: response?.ok || false,
      error: error?.message || response?.problem,
      timestamp: Date.now(),
      userId,
      retryCount,
      cached,
      deduplicated,
    }

    // Add to history
    this.addToHistory(metrics)

    // Update endpoint stats
    this.updateEndpointStats(metrics)

    // Track errors
    if (this.config.enableErrorTracking && !metrics.success) {
      this.trackError(metrics)
    }

    // Track usage patterns
    if (this.config.enableUsageTracking) {
      this.trackUsagePattern(metrics)
    }

    // Log detailed info in development
    if (this.config.enableDetailedLogging) {
      this.logRequest(metrics)
    }

    // Check thresholds
    this.checkThresholds()
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(timeWindow?: number): PerformanceMetrics {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    const requests = this.requestHistory.filter((r) => r.timestamp > cutoff)

    if (requests.length === 0) {
      return {
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        errorRate: 0,
      }
    }

    const durations = requests.map((r) => r.duration).sort((a, b) => a - b)
    const successfulRequests = requests.filter((r) => r.success).length
    const failedRequests = requests.length - successfulRequests

    return {
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50ResponseTime: this.percentile(durations, 50),
      p95ResponseTime: this.percentile(durations, 95),
      p99ResponseTime: this.percentile(durations, 99),
      minResponseTime: durations[0] || 0,
      maxResponseTime: durations[durations.length - 1] || 0,
      totalRequests: requests.length,
      successfulRequests,
      failedRequests,
      successRate: successfulRequests / requests.length,
      errorRate: failedRequests / requests.length,
    }
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(timeWindow?: number): ErrorMetrics[] {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    const requests = this.requestHistory.filter((r) => r.timestamp > cutoff && !r.success)

    const errorGroups = new Map<string, RequestMetrics[]>()

    requests.forEach((request) => {
      const errorKey = request.error || `HTTP_${request.status}`
      if (!errorGroups.has(errorKey)) {
        errorGroups.set(errorKey, [])
      }
      errorGroups.get(errorKey)!.push(request)
    })

    const totalRequests = this.requestHistory.filter((r) => r.timestamp > cutoff).length

    return Array.from(errorGroups.entries()).map(([errorType, errorRequests]) => ({
      errorType,
      count: errorRequests.length,
      percentage: totalRequests > 0 ? errorRequests.length / totalRequests : 0,
      lastOccurrence: Math.max(...errorRequests.map((r) => r.timestamp)),
      averageResponseTime:
        errorRequests.reduce((sum, r) => sum + r.duration, 0) / errorRequests.length,
    }))
  }

  /**
   * Get endpoint metrics
   */
  getEndpointMetrics(): EndpointMetrics[] {
    return Array.from(this.endpointStats.values()).sort((a, b) => b.totalRequests - a.totalRequests)
  }

  /**
   * Get usage patterns
   */
  getUsagePatterns(): UsagePattern[] {
    return Array.from(this.usageByHour.values()).sort((a, b) => a.hour - b.hour)
  }

  /**
   * Get top slow endpoints
   */
  getSlowEndpoints(limit = 10): EndpointMetrics[] {
    return Array.from(this.endpointStats.values())
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit)
  }

  /**
   * Get most error-prone endpoints
   */
  getErrorProneEndpoints(limit = 10): EndpointMetrics[] {
    return Array.from(this.endpointStats.values())
      .filter((endpoint) => endpoint.totalRequests > 5) // Minimum requests for statistical significance
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit)
  }

  /**
   * Generate analytics report
   */
  generateReport(timeWindow?: number): {
    performance: PerformanceMetrics
    errors: ErrorMetrics[]
    endpoints: EndpointMetrics[]
    slowEndpoints: EndpointMetrics[]
    errorProneEndpoints: EndpointMetrics[]
    usagePatterns: UsagePattern[]
    summary: {
      totalRequests: number
      uniqueEndpoints: number
      averageResponseTime: number
      errorRate: number
      cacheHitRate: number
      deduplicationRate: number
    }
  } {
    const performance = this.getPerformanceMetrics(timeWindow)
    const errors = this.getErrorMetrics(timeWindow)
    const endpoints = this.getEndpointMetrics()
    const slowEndpoints = this.getSlowEndpoints(5)
    const errorProneEndpoints = this.getErrorProneEndpoints(5)
    const usagePatterns = this.getUsagePatterns()

    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    const relevantRequests = this.requestHistory.filter((r) => r.timestamp > cutoff)

    const cachedRequests = relevantRequests.filter((r) => r.cached).length
    const deduplicatedRequests = relevantRequests.filter((r) => r.deduplicated).length

    return {
      performance,
      errors,
      endpoints,
      slowEndpoints,
      errorProneEndpoints,
      usagePatterns,
      summary: {
        totalRequests: relevantRequests.length,
        uniqueEndpoints: new Set(relevantRequests.map((r) => `${r.method} ${r.url}`)).size,
        averageResponseTime: performance.averageResponseTime,
        errorRate: performance.errorRate,
        cacheHitRate: relevantRequests.length > 0 ? cachedRequests / relevantRequests.length : 0,
        deduplicationRate:
          relevantRequests.length > 0 ? deduplicatedRequests / relevantRequests.length : 0,
      },
    }
  }

  /**
   * Export analytics data
   */
  exportData(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      return this.exportToCsv()
    }

    return JSON.stringify(
      {
        config: this.config,
        requestHistory: this.requestHistory,
        endpointStats: Array.from(this.endpointStats.entries()),
        usagePatterns: Array.from(this.usageByHour.entries()),
        exportTimestamp: Date.now(),
      },
      null,
      2,
    )
  }

  /**
   * Clear analytics data
   */
  clearData(): void {
    this.requestHistory = []
    this.errorCounts.clear()
    this.endpointStats.clear()
    this.usageByHour.clear()
  }

  /**
   * Add request to history
   */
  private addToHistory(metrics: RequestMetrics): void {
    this.requestHistory.push(metrics)

    // Limit history size
    if (this.requestHistory.length > this.config.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.config.maxHistorySize)
    }
  }

  /**
   * Update endpoint statistics
   */
  private updateEndpointStats(metrics: RequestMetrics): void {
    const key = `${metrics.method} ${this.normalizeUrl(metrics.url)}`
    const existing = this.endpointStats.get(key)

    if (existing) {
      const totalRequests = existing.totalRequests + 1
      const totalDuration = existing.averageResponseTime * existing.totalRequests + metrics.duration
      const successfulRequests =
        existing.successRate * existing.totalRequests + (metrics.success ? 1 : 0)

      this.endpointStats.set(key, {
        ...existing,
        totalRequests,
        averageResponseTime: totalDuration / totalRequests,
        successRate: successfulRequests / totalRequests,
        errorRate: 1 - successfulRequests / totalRequests,
        lastAccessed: metrics.timestamp,
      })
    } else {
      this.endpointStats.set(key, {
        endpoint: this.normalizeUrl(metrics.url),
        method: metrics.method,
        totalRequests: 1,
        averageResponseTime: metrics.duration,
        successRate: metrics.success ? 1 : 0,
        errorRate: metrics.success ? 0 : 1,
        lastAccessed: metrics.timestamp,
      })
    }
  }

  /**
   * Track error occurrence
   */
  private trackError(metrics: RequestMetrics): void {
    const errorKey = metrics.error || `HTTP_${metrics.status}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)
  }

  /**
   * Track usage patterns by hour
   */
  private trackUsagePattern(metrics: RequestMetrics): void {
    const hour = new Date(metrics.timestamp).getHours()
    const existing = this.usageByHour.get(hour)

    if (existing) {
      const totalRequests = existing.requestCount + 1
      const totalDuration = existing.averageResponseTime * existing.requestCount + metrics.duration
      const errors = existing.errorRate * existing.requestCount + (metrics.success ? 0 : 1)

      this.usageByHour.set(hour, {
        hour,
        requestCount: totalRequests,
        averageResponseTime: totalDuration / totalRequests,
        errorRate: errors / totalRequests,
      })
    } else {
      this.usageByHour.set(hour, {
        hour,
        requestCount: 1,
        averageResponseTime: metrics.duration,
        errorRate: metrics.success ? 0 : 1,
      })
    }
  }

  /**
   * Log request details
   */
  private logRequest(metrics: RequestMetrics): void {
    const status = metrics.success ? "✅" : "❌"
    const cached = metrics.cached ? " [CACHED]" : ""
    const deduplicated = metrics.deduplicated ? " [DEDUPED]" : ""
    const retry = metrics.retryCount ? ` [RETRY:${metrics.retryCount}]` : ""

    console.log(
      `🌐 ${status} ${metrics.method} ${metrics.url} - ${metrics.duration}ms${cached}${deduplicated}${retry}`,
    )

    if (!metrics.success && metrics.error) {
      console.log(`   Error: ${metrics.error}`)
    }
  }

  /**
   * Check performance and error thresholds
   */
  private checkThresholds(): void {
    const recentMetrics = this.getPerformanceMetrics(5 * 60 * 1000) // Last 5 minutes

    // Check error rate threshold
    if (this.config.onErrorThreshold && recentMetrics.errorRate > 0.1) {
      // 10% error rate
      this.config.onErrorThreshold(recentMetrics.errorRate)
    }

    // Check performance threshold
    if (this.config.onPerformanceThreshold && recentMetrics.averageResponseTime > 5000) {
      // 5 second average
      this.config.onPerformanceThreshold(recentMetrics.averageResponseTime)
    }
  }

  /**
   * Normalize URL for grouping (remove IDs, query params)
   */
  private normalizeUrl(url: string): string {
    return url
      .replace(/\/\d+/g, "/:id") // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, "/:uuid") // Replace UUIDs
      .replace(/\?.*$/, "") // Remove query parameters
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0

    const index = Math.ceil((p / 100) * values.length) - 1
    return values[Math.max(0, Math.min(index, values.length - 1))]
  }

  /**
   * Export data to CSV format
   */
  private exportToCsv(): string {
    const headers = [
      "timestamp",
      "method",
      "url",
      "status",
      "duration",
      "success",
      "error",
      "userId",
      "retryCount",
      "cached",
      "deduplicated",
    ]

    const rows = this.requestHistory.map((metrics) => [
      new Date(metrics.timestamp).toISOString(),
      metrics.method,
      metrics.url,
      metrics.status,
      metrics.duration,
      metrics.success,
      metrics.error || "",
      metrics.userId || "",
      metrics.retryCount || 0,
      metrics.cached || false,
      metrics.deduplicated || false,
    ])

    return [headers, ...rows].map((row) => row.join(",")).join("\n")
  }

  /**
   * Start aggregation timer
   */
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregate()
    }, this.config.aggregationInterval)
  }

  /**
   * Perform periodic aggregation
   */
  private aggregate(): void {
    // This could be extended to perform more complex aggregations
    // or send data to external analytics services

    if (__DEV__) {
      const metrics = this.getPerformanceMetrics(this.config.aggregationInterval)
      if (metrics.totalRequests > 0) {
        console.log(`📊 API Analytics (last ${this.config.aggregationInterval / 1000}s):`, {
          requests: metrics.totalRequests,
          avgResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
          successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
        })
      }
    }
  }

  /**
   * Destroy analytics manager
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
    }

    this.clearData()
  }
}

/**
 * Global analytics manager instance
 */
export const globalAnalyticsManager = new AnalyticsManager({
  enabled: true,
  maxHistorySize: 1000,
  aggregationInterval: 60000,
  enableDetailedLogging: __DEV__,
  onErrorThreshold: (errorRate) => {
    console.warn(`⚠️  High error rate detected: ${(errorRate * 100).toFixed(1)}%`)
  },
  onPerformanceThreshold: (avgResponseTime) => {
    console.warn(`⚠️  Slow performance detected: ${avgResponseTime.toFixed(0)}ms average`)
  },
})

/**
 * Analytics utilities
 */
export const AnalyticsUtils = {
  /**
   * Track API request with analytics
   */
  trackApiRequest<T>(
    url: string,
    method: string,
    requestFunction: () => Promise<ApiResponse<T>>,
    options: {
      userId?: string
      retryCount?: number
      cached?: boolean
      deduplicated?: boolean
    } = {},
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now()

    return requestFunction()
      .then((response) => {
        globalAnalyticsManager.trackRequest({
          url,
          method,
          response,
          duration: Date.now() - startTime,
          ...options,
        })

        return response
      })
      .catch((error) => {
        globalAnalyticsManager.trackRequest({
          url,
          method,
          duration: Date.now() - startTime,
          error,
          ...options,
        })

        throw error
      })
  },

  /**
   * Generate analytics dashboard data
   */
  getDashboardData(timeWindow = 24 * 60 * 60 * 1000) {
    const report = globalAnalyticsManager.generateReport(timeWindow)

    return {
      ...report,
      alerts: {
        highErrorRate: report.performance.errorRate > 0.05,
        slowPerformance: report.performance.averageResponseTime > 2000,
        lowSuccessRate: report.performance.successRate < 0.95,
      },
    }
  },

  /**
   * Export analytics for reporting
   */
  exportAnalytics(format: "json" | "csv" = "json"): string {
    return globalAnalyticsManager.exportData(format)
  },

  /**
   * Monitor API health
   */
  getHealthStatus() {
    const metrics = globalAnalyticsManager.getPerformanceMetrics(5 * 60 * 1000) // Last 5 minutes

    let status = "healthy"
    if (metrics.errorRate > 0.1) status = "degraded"
    if (metrics.errorRate > 0.25 || metrics.averageResponseTime > 10000) status = "unhealthy"

    return {
      status,
      metrics: {
        responseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
        errorRate: `${(metrics.errorRate * 100).toFixed(1)}%`,
        totalRequests: metrics.totalRequests,
      },
    }
  },
}
