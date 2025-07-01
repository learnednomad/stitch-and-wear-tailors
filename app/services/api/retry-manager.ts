/**
 * Retry Manager with Exponential Backoff
 *
 * Provides intelligent retry logic for failed API requests with configurable
 * backoff strategies, jitter, and failure classification.
 */

import { ApiResponse } from "apisauce"
import { GeneralApiProblem } from "./apiProblem"

/**
 * Retry configuration options
 */
interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  jitterMax: number
  retryableErrors: GeneralApiProblem[]
  retryableStatusCodes: number[]
  onRetry?: (attempt: number, error: any, delay: number) => void
  onSuccess?: (attempt: number) => void
  onFailure?: (attempts: number, lastError: any) => void
}

/**
 * Retry attempt information
 */
interface RetryAttempt {
  attempt: number
  delay: number
  error: any
  timestamp: number
}

/**
 * Retry result
 */
interface RetryResult<T> {
  success: boolean
  data?: T
  error?: any
  attempts: RetryAttempt[]
  totalDuration: number
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  jitterMax: 1000, // 1 second max jitter
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT_ERROR", 
    "SERVER_ERROR",
    "UNKNOWN_ERROR",
  ],
  retryableStatusCodes: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ],
}

/**
 * Retry strategies for different scenarios
 */
export const RetryStrategies = {
  /**
   * Aggressive retry for critical operations
   */
  critical: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 1.5,
    jitter: true,
  },

  /**
   * Standard retry for normal operations
   */
  standard: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },

  /**
   * Conservative retry for non-critical operations
   */
  conservative: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 3,
    jitter: false,
  },

  /**
   * Fast retry for real-time operations
   */
  realtime: {
    maxAttempts: 2,
    baseDelay: 200,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: true,
    jitterMax: 100,
  },

  /**
   * Background retry for non-urgent operations
   */
  background: {
    maxAttempts: 5,
    baseDelay: 5000,
    maxDelay: 120000, // 2 minutes
    backoffMultiplier: 2,
    jitter: true,
  },
}

/**
 * Retry manager implementation
 */
export class RetryManager {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.config, ...customConfig }
    const attempts: RetryAttempt[] = []
    const startTime = Date.now()

    let lastError: any
    let attempt = 0

    while (attempt < config.maxAttempts) {
      attempt++

      try {
        const result = await operation()
        
        if (config.onSuccess) {
          config.onSuccess(attempt)
        }

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error
        
        const shouldRetry = this.shouldRetry(error, attempt, config)
        
        if (!shouldRetry || attempt >= config.maxAttempts) {
          break
        }

        const delay = this.calculateDelay(attempt, config)
        
        attempts.push({
          attempt,
          delay,
          error,
          timestamp: Date.now(),
        })

        if (config.onRetry) {
          config.onRetry(attempt, error, delay)
        }

        await this.sleep(delay)
      }
    }

    if (config.onFailure) {
      config.onFailure(attempt, lastError)
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration: Date.now() - startTime,
    }
  }

  /**
   * Execute API request with retry logic
   */
  async executeApiRequest<T>(
    request: () => Promise<ApiResponse<T>>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<ApiResponse<T>>> {
    return this.execute(async () => {
      const response = await request()
      
      // Check if response indicates retryable error
      if (!response.ok && this.isRetryableApiResponse(response)) {
        throw new Error(`API Error: ${response.problem} (${response.status})`)
      }
      
      return response
    }, customConfig)
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: any, attempt: number, config: RetryConfig): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= config.maxAttempts) {
      return false
    }

    // Check for retryable API problems
    if (error.problem && config.retryableErrors.includes(error.problem)) {
      return true
    }

    // Check for retryable status codes
    if (error.status && config.retryableStatusCodes.includes(error.status)) {
      return true
    }

    // Check for network-related errors
    if (this.isNetworkError(error)) {
      return true
    }

    // Check for timeout errors
    if (this.isTimeoutError(error)) {
      return true
    }

    return false
  }

  /**
   * Check if API response is retryable
   */
  private isRetryableApiResponse<T>(response: ApiResponse<T>): boolean {
    // Don't retry successful responses
    if (response.ok) {
      return false
    }

    // Check problem type
    if (response.problem && this.config.retryableErrors.includes(response.problem)) {
      return true
    }

    // Check status code
    if (response.status && this.config.retryableStatusCodes.includes(response.status)) {
      return true
    }

    return false
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const networkIndicators = [
      "network",
      "connection",
      "fetch",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ECONNRESET",
      "ETIMEDOUT",
    ]

    const errorMessage = error.message?.toLowerCase() || ""
    return networkIndicators.some(indicator => errorMessage.includes(indicator))
  }

  /**
   * Check if error is timeout-related
   */
  private isTimeoutError(error: any): boolean {
    const timeoutIndicators = [
      "timeout",
      "ETIMEDOUT",
      "request timed out",
      "response timeout",
    ]

    const errorMessage = error.message?.toLowerCase() || ""
    return timeoutIndicators.some(indicator => errorMessage.includes(indicator))
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Cap at max delay
    delay = Math.min(delay, config.maxDelay)
    
    // Add jitter if enabled
    if (config.jitter) {
      const jitterAmount = Math.random() * (config.jitterMax || 1000)
      delay += jitterAmount
    }
    
    return Math.floor(delay)
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private state: "closed" | "open" | "half-open" = "closed"
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private onStateChange?: (state: string) => void
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = "half-open"
        this.onStateChange?.("half-open")
      } else {
        throw new Error("Circuit breaker is open")
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failures = 0
    if (this.state === "half-open") {
      this.state = "closed"
      this.onStateChange?.("closed")
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failures++
    this.lastFailTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = "open"
      this.onStateChange?.("open")
    }
  }

  /**
   * Get circuit breaker state
   */
  getState(): string {
    return this.state
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failures = 0
    this.lastFailTime = 0
    this.state = "closed"
    this.onStateChange?.("closed")
  }
}

/**
 * Retry utilities and factory functions
 */
export const RetryUtils = {
  /**
   * Create retry manager with predefined strategy
   */
  createWithStrategy(strategy: keyof typeof RetryStrategies): RetryManager {
    return new RetryManager(RetryStrategies[strategy])
  },

  /**
   * Create retry manager for authentication operations
   */
  createForAuth(): RetryManager {
    return new RetryManager({
      ...RetryStrategies.critical,
      retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "SERVER_ERROR"],
      retryableStatusCodes: [500, 502, 503, 504], // Don't retry 401/403 for auth
      onRetry: (attempt, error, delay) => {
        console.log(`🔄 Auth retry ${attempt}: ${error.message} (waiting ${delay}ms)`)
      },
    })
  },

  /**
   * Create retry manager for order operations
   */
  createForOrders(): RetryManager {
    return new RetryManager({
      ...RetryStrategies.standard,
      onRetry: (attempt, error, delay) => {
        console.log(`🔄 Order retry ${attempt}: ${error.message} (waiting ${delay}ms)`)
      },
    })
  },

  /**
   * Create retry manager for catalog operations
   */
  createForCatalog(): RetryManager {
    return new RetryManager({
      ...RetryStrategies.conservative,
      onRetry: (attempt, error, delay) => {
        console.log(`🔄 Catalog retry ${attempt}: ${error.message} (waiting ${delay}ms)`)
      },
    })
  },

  /**
   * Wrap function with retry logic
   */
  withRetry<T>(
    operation: () => Promise<T>,
    strategy: keyof typeof RetryStrategies = "standard"
  ): Promise<RetryResult<T>> {
    const retryManager = RetryUtils.createWithStrategy(strategy)
    return retryManager.execute(operation)
  },

  /**
   * Wrap API request with retry logic
   */
  withApiRetry<T>(
    request: () => Promise<ApiResponse<T>>,
    strategy: keyof typeof RetryStrategies = "standard"
  ): Promise<RetryResult<ApiResponse<T>>> {
    const retryManager = RetryUtils.createWithStrategy(strategy)
    return retryManager.executeApiRequest(request)
  },
}

/**
 * Global retry managers for different services
 */
export const ServiceRetryManagers = {
  auth: RetryUtils.createForAuth(),
  orders: RetryUtils.createForOrders(),
  catalog: RetryUtils.createForCatalog(),
  default: new RetryManager(RetryStrategies.standard),
}

/**
 * Global circuit breakers for different services
 */
export const ServiceCircuitBreakers = {
  auth: new CircuitBreaker(3, 30000), // More sensitive for auth
  orders: new CircuitBreaker(5, 60000),
  catalog: new CircuitBreaker(10, 120000), // Less sensitive for catalog
  default: new CircuitBreaker(),
}