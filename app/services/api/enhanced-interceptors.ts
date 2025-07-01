/**
 * Enhanced API Request and Response Interceptors
 *
 * Provides comprehensive request/response processing with advanced features:
 * - Authentication token injection and refresh handling
 * - Request/response caching with intelligent TTL
 * - Automatic retry with exponential backoff
 * - Request deduplication to prevent duplicate calls
 * - Analytics and performance monitoring
 * - Request/response logging and debugging
 */

import { ApiResponse, ApisauceInstance } from "apisauce"
import { getGeneralApiProblem, GeneralApiProblem } from "./apiProblem"
import { globalCacheManager, CacheUtils, CacheStrategies } from "./cache-manager"
import { ServiceRetryManagers, RetryUtils, RetryStrategies } from "./retry-manager"
import { globalDeduplicationManager, DeduplicationUtils } from "./deduplication-manager"
import { globalAnalyticsManager, AnalyticsUtils } from "./analytics-manager"

/**
 * Enhanced interceptor configuration
 */
export interface EnhancedInterceptorConfig {
  enableLogging?: boolean
  enableAuthInjection?: boolean
  enableCaching?: boolean
  enableRetry?: boolean
  enableDeduplication?: boolean
  enableAnalytics?: boolean
  logLevel?: "minimal" | "detailed" | "debug"
  cacheStrategy?: "aggressive" | "standard" | "conservative" | "disabled"
  retryStrategy?: "critical" | "standard" | "conservative" | "realtime" | "background"
}

/**
 * Enhanced auth token provider interface
 */
export interface EnhancedAuthTokenProvider {
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens?(accessToken: string, refreshToken: string): void
  clearTokens?(): void
  onTokenExpired(): Promise<void>
  getCurrentUserId?(): string | null
  isTokenExpired?(): boolean
}

/**
 * Request metadata interface
 */
interface RequestMetadata {
  startTime: number
  requestId: string
  cached?: boolean
  deduplicated?: boolean
  retryCount?: number
  userId?: string
}

/**
 * Enhanced retry configuration
 */
export interface EnhancedRetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  enableRetry: boolean
  retryableErrors: GeneralApiProblem[]
  retryableStatusCodes: number[]
}

export const ENHANCED_DEFAULT_RETRY_CONFIG: EnhancedRetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  enableRetry: true,
  retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "SERVER_ERROR", "UNKNOWN_ERROR"],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Sets up enhanced request interceptors
 */
export function setupEnhancedRequestInterceptors(
  apisauce: ApisauceInstance,
  authProvider?: EnhancedAuthTokenProvider,
  config: EnhancedInterceptorConfig = {},
) {
  const {
    enableLogging = __DEV__,
    enableAuthInjection = true,
    enableCaching = true,
    enableDeduplication = true,
    enableAnalytics = true,
    logLevel = "minimal",
    cacheStrategy = "standard",
    retryStrategy = "standard"
  } = config

  // 1. Authentication and user context interceptor
  if (enableAuthInjection && authProvider) {
    apisauce.addRequestTransform((request) => {
      const token = authProvider.getAccessToken()
      if (token && !authProvider.isTokenExpired?.()) {
        request.headers = {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        }
      }
      
      // Add user context for analytics and caching
      const userId = authProvider.getCurrentUserId?.()
      if (userId) {
        request.headers = {
          ...request.headers,
          'X-User-ID': userId,
        }
      }
    })
  }

  // 2. Request metadata and timing interceptor
  apisauce.addRequestTransform((request) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const metadata: RequestMetadata = {
      startTime: Date.now(),
      requestId,
      userId: authProvider?.getCurrentUserId?.() || undefined,
    }
    
    request.metadata = { ...request.metadata, ...metadata }
    
    // Add request ID header for tracing
    request.headers = {
      ...request.headers,
      'X-Request-ID': requestId,
    }
  })

  // 3. Cache checking interceptor
  if (enableCaching && cacheStrategy !== "disabled") {
    apisauce.addRequestTransform((request) => {
      const method = request.method?.toUpperCase() || 'GET'
      
      // Only check cache for GET requests
      if (method === 'GET') {
        const userId = authProvider?.getCurrentUserId?.()
        const cacheKey = CacheUtils.createApiKey(
          request.url || '',
          method,
          request.params,
          userId
        )
        
        const cachedResponse = globalCacheManager.get(cacheKey)
        if (cachedResponse) {
          // Store cache info in metadata
          request.metadata = {
            ...request.metadata,
            cached: true,
            cacheKey,
          }
          
          if (logLevel === "debug") {
            console.log(`📦 Cache HIT: ${method} ${request.url}`)
          }
        }
      }
    })
  }

  // 4. Request logging interceptor
  if (enableLogging) {
    apisauce.addRequestTransform((request) => {
      const timestamp = new Date().toISOString()
      const method = request.method?.toUpperCase() || 'GET'
      const url = request.url || ''
      const requestId = request.metadata?.requestId || 'unknown'
      
      if (logLevel === "debug") {
        console.group(`🚀 [${requestId}] ${method} ${url}`)
        console.log("📤 Headers:", request.headers)
        console.log("📤 Params:", request.params)
        if (request.data) {
          console.log("📤 Body:", request.data)
        }
        console.log("📤 Metadata:", request.metadata)
        console.groupEnd()
      } else if (logLevel === "detailed") {
        console.log(`🚀 [${requestId}] ${timestamp} ${method} ${url}`, {
          headers: request.headers,
          data: request.data,
          params: request.params,
        })
      } else {
        const cached = request.metadata?.cached ? " [CACHED]" : ""
        console.log(`🚀 ${method} ${url}${cached}`)
      }
    })
  }
}

/**
 * Sets up enhanced response interceptors
 */
export function setupEnhancedResponseInterceptors(
  apisauce: ApisauceInstance,
  authProvider?: EnhancedAuthTokenProvider,
  config: EnhancedInterceptorConfig = {},
) {
  const {
    enableLogging = __DEV__,
    enableCaching = true,
    enableAnalytics = true,
    logLevel = "minimal",
    cacheStrategy = "standard"
  } = config

  // Response processing interceptor
  apisauce.addResponseTransform(async (response: ApiResponse<any>) => {
    const requestMetadata = response.config?.metadata as RequestMetadata
    const duration = requestMetadata ? Date.now() - requestMetadata.startTime : 0
    const method = response.config?.method?.toUpperCase() || 'GET'
    const url = response.config?.url || ''
    
    // 1. Analytics tracking
    if (enableAnalytics) {
      globalAnalyticsManager.trackRequest({
        url,
        method,
        response,
        duration,
        userId: requestMetadata?.userId,
        retryCount: requestMetadata?.retryCount,
        cached: requestMetadata?.cached,
        deduplicated: requestMetadata?.deduplicated,
      })
    }

    // 2. Response caching
    if (enableCaching && cacheStrategy !== "disabled" && method === 'GET') {
      if (globalCacheManager.shouldCache(response)) {
        const userId = authProvider?.getCurrentUserId?.()
        const cacheKey = CacheUtils.createApiKey(url, method, response.config?.params, userId)
        
        // Determine TTL based on strategy and response headers
        let ttl = globalCacheManager.getTtlFromHeaders(response)
        
        // Apply strategy-specific TTL if no cache headers
        if (ttl === globalCacheManager.getConfig().defaultTtl) {
          const strategyConfig = CacheStrategies[cacheStrategy as keyof typeof CacheStrategies]
          if (strategyConfig) {
            ttl = strategyConfig.ttl
          }
        }
        
        globalCacheManager.set(cacheKey, response, ttl)
        
        if (logLevel === "debug") {
          console.log(`📦 Cache SET: ${method} ${url} (TTL: ${ttl}ms)`)
        }
      }
    }

    // 3. Response logging
    if (enableLogging) {
      const status = response.status || 0
      const statusEmoji = response.ok ? "✅" : "❌"
      const requestId = requestMetadata?.requestId || 'unknown'
      const cached = requestMetadata?.cached ? " [CACHED]" : ""
      const retried = requestMetadata?.retryCount ? ` [RETRY:${requestMetadata.retryCount}]` : ""
      
      if (logLevel === "debug") {
        console.group(`${statusEmoji} [${requestId}] ${status} ${url} - ${duration}ms${cached}${retried}`)
        console.log("📥 Headers:", response.headers)
        if (response.data) {
          console.log("📥 Data:", response.data)
        }
        if (response.problem) {
          console.log("⚠️ Problem:", response.problem)
        }
        console.log("📊 Duration:", `${duration}ms`)
        console.groupEnd()
      } else if (logLevel === "detailed") {
        console.log(`${statusEmoji} [${requestId}] ${status} ${url} - ${duration}ms${cached}${retried}`)
        if (response.problem) {
          console.log("⚠️ Problem:", response.problem)
        }
      } else {
        console.log(`${statusEmoji} ${status} ${url} - ${duration}ms${cached}${retried}`)
        if (response.problem && response.status !== 404) { // Don't log 404s in minimal mode
          console.log(`⚠️ ${response.problem}`)
        }
      }
    }

    // 4. Handle authentication errors
    if (response.status === 401 && authProvider) {
      if (logLevel !== "minimal") {
        console.log("🔄 Token expired, attempting refresh...")
      }
      
      try {
        await authProvider.onTokenExpired()
      } catch (error) {
        console.error("💥 Token refresh failed:", error)
        authProvider.clearTokens?.()
      }
    }

    // 5. Cache invalidation on mutations
    if (enableCaching && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      // Invalidate related cache entries
      if (url.includes("/orders")) {
        globalCacheManager.invalidate("/orders")
      } else if (url.includes("/profile")) {
        globalCacheManager.invalidate("/profile")
      } else if (url.includes("/fabrics")) {
        globalCacheManager.invalidate("/fabrics")
      }
    }
  })
}

/**
 * Enhanced API response processing with retry logic
 */
export async function processEnhancedApiResponse<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: {
    retryConfig?: Partial<EnhancedRetryConfig>
    enableDeduplication?: boolean
    requestKey?: string
    authProvider?: EnhancedAuthTokenProvider
  } = {}
): Promise<{ success: true; data: T } | { success: false; problem: GeneralApiProblem; message?: string }> {
  const {
    retryConfig = {},
    enableDeduplication = true,
    requestKey,
    authProvider
  } = options

  const config = { ...ENHANCED_DEFAULT_RETRY_CONFIG, ...retryConfig }
  
  // Deduplication wrapper
  const executeRequest = enableDeduplication && requestKey
    ? () => globalDeduplicationManager.execute(
        { url: requestKey, method: "GET" }, // Simplified for deduplication
        () => apiCall()
      )
    : apiCall

  // Retry wrapper
  const retryManager = ServiceRetryManagers.default
  const result = await retryManager.executeApiRequest(executeRequest, config)

  if (result.success && result.data?.ok && result.data.data) {
    return { success: true, data: result.data.data }
  }

  const lastResponse = result.error || result.data
  const problem = getGeneralApiProblem(lastResponse)
  
  return {
    success: false,
    problem: problem || { kind: "unknown" },
    message: getEnhancedErrorMessage(problem, result.attempts.length)
  }
}

/**
 * Enhanced error message generation
 */
export function getEnhancedErrorMessage(
  problem: GeneralApiProblem | null,
  attemptCount: number = 1
): string {
  const retryInfo = attemptCount > 1 ? ` (after ${attemptCount} attempts)` : ""
  
  if (!problem) {
    return `An unexpected error occurred${retryInfo}. Please try again.`
  }

  switch (problem.kind) {
    case "TIMEOUT_ERROR":
      return `Request timed out${retryInfo}. Please check your connection and try again.`
    case "NETWORK_ERROR":
      return `Unable to connect to the server${retryInfo}. Please check your internet connection.`
    case "SERVER_ERROR":
      return `Server error occurred${retryInfo}. Please try again later.`
    case "UNAUTHORIZED":
      return "You are not authorized to perform this action. Please sign in again."
    case "FORBIDDEN":
      return "Access denied. You don't have permission for this action."
    case "NOT_FOUND":
      return "The requested resource was not found."
    case "CLIENT_ERROR":
      return "Request was rejected. Please check your input and try again."
    case "BAD_DATA":
      return `Invalid response from server${retryInfo}. Please try again.`
    case "UNKNOWN_ERROR":
    default:
      return `An unexpected error occurred${retryInfo}. Please try again.`
  }
}

/**
 * Utility function to setup all enhanced interceptors
 */
export function setupAllEnhancedInterceptors(
  apisauce: ApisauceInstance,
  authProvider?: EnhancedAuthTokenProvider,
  config: EnhancedInterceptorConfig = {}
) {
  setupEnhancedRequestInterceptors(apisauce, authProvider, config)
  setupEnhancedResponseInterceptors(apisauce, authProvider, config)
  
  // Initialize analytics monitoring in development
  if (__DEV__ && config.enableAnalytics !== false) {
    console.log("📊 Enhanced API analytics enabled")
    AnalyticsUtils.getDashboardData() // Initialize
  }
  
  // Initialize cache monitoring in development
  if (__DEV__ && config.enableCaching !== false) {
    console.log("📦 Enhanced API caching enabled")
    setTimeout(() => {
      CacheUtils.debugCache()
    }, 5000) // Debug after 5 seconds
  }
  
  // Initialize deduplication monitoring in development
  if (__DEV__ && config.enableDeduplication !== false) {
    console.log("🔄 Enhanced API deduplication enabled")
    DeduplicationUtils.monitorEffectiveness()
  }
}

/**
 * Create optimized configuration for different environments
 */
export const EnhancedInterceptorPresets = {
  development: {
    enableLogging: true,
    enableAuthInjection: true,
    enableCaching: true,
    enableRetry: true,
    enableDeduplication: true,
    enableAnalytics: true,
    logLevel: "detailed" as const,
    cacheStrategy: "standard" as const,
    retryStrategy: "standard" as const,
  },

  production: {
    enableLogging: false,
    enableAuthInjection: true,
    enableCaching: true,
    enableRetry: true,
    enableDeduplication: true,
    enableAnalytics: true,
    logLevel: "minimal" as const,
    cacheStrategy: "aggressive" as const,
    retryStrategy: "standard" as const,
  },

  testing: {
    enableLogging: false,
    enableAuthInjection: true,
    enableCaching: false,
    enableRetry: false,
    enableDeduplication: false,
    enableAnalytics: false,
    logLevel: "minimal" as const,
    cacheStrategy: "disabled" as const,
    retryStrategy: "standard" as const,
  },

  debug: {
    enableLogging: true,
    enableAuthInjection: true,
    enableCaching: true,
    enableRetry: true,
    enableDeduplication: true,
    enableAnalytics: true,
    logLevel: "debug" as const,
    cacheStrategy: "standard" as const,
    retryStrategy: "standard" as const,
  },
}