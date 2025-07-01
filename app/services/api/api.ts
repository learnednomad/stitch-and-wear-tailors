/**
 * Enhanced API client following Infinite Red patterns
 *
 * This Api class provides a robust foundation for all API interactions:
 * - Authentication token management
 * - Request/response interceptors
 * - Centralized error handling
 * - Integration with state management
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApisauceInstance, create } from "apisauce"
import Config from "../../config"
import type { ApiConfig } from "./api.types"
import {
  setupRequestInterceptors,
  setupResponseInterceptors,
  AuthTokenProvider,
  InterceptorConfig,
  processApiResponse,
  withRetry,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
} from "./interceptors"

/**
 * Configuring the apisauce instance for Appwrite integration.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  timeout: 10000,
}

/**
 * Enhanced API client with authentication and interceptor support
 *
 * Manages all requests to the API with comprehensive error handling,
 * authentication token management, and request/response logging.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig
  authProvider?: AuthTokenProvider
  private interceptorConfig: InterceptorConfig

  /**
   * Set up our API instance with enhanced features
   */
  constructor(
    config: ApiConfig = DEFAULT_API_CONFIG,
    authProvider?: AuthTokenProvider,
    interceptorConfig: InterceptorConfig = {},
  ) {
    this.config = config
    this.authProvider = authProvider
    this.interceptorConfig = {
      enableLogging: __DEV__,
      enableAuthInjection: true,
      logLevel: "minimal",
      ...interceptorConfig,
    }

    // Create the apisauce instance
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    })

    // Set up interceptors
    this.setupInterceptors()
  }

  /**
   * Configure request and response interceptors
   */
  private setupInterceptors() {
    setupRequestInterceptors(this.apisauce, this.authProvider, this.interceptorConfig)
    setupResponseInterceptors(this.apisauce, this.authProvider, this.interceptorConfig)
  }

  /**
   * Update the authentication provider
   */
  setAuthProvider(authProvider: AuthTokenProvider) {
    this.authProvider = authProvider
    // Re-setup interceptors with new auth provider
    this.setupInterceptors()
  }

  /**
   * Update the base URL (useful for environment switching)
   */
  setBaseURL(url: string) {
    this.config.url = url
    this.apisauce.setBaseURL(url)
  }

  /**
   * Add or update default headers
   */
  setHeaders(headers: Record<string, string>) {
    this.apisauce.setHeaders(headers)
  }

  /**
   * Perform a GET request with retry logic and standardized response processing
   */
  async get<T>(url: string, params?: any, retryConfig?: RetryConfig) {
    const response = await withRetry(
      () => this.apisauce.get<T>(url, params),
      retryConfig || DEFAULT_RETRY_CONFIG,
    )
    return processApiResponse(response)
  }

  /**
   * Perform a POST request with retry logic and standardized response processing
   */
  async post<T>(url: string, data?: any, retryConfig?: RetryConfig) {
    const response = await withRetry(
      () => this.apisauce.post<T>(url, data),
      retryConfig || DEFAULT_RETRY_CONFIG,
    )
    return processApiResponse(response)
  }

  /**
   * Perform a PUT request with retry logic and standardized response processing
   */
  async put<T>(url: string, data?: any, retryConfig?: RetryConfig) {
    const response = await withRetry(
      () => this.apisauce.put<T>(url, data),
      retryConfig || DEFAULT_RETRY_CONFIG,
    )
    return processApiResponse(response)
  }

  /**
   * Perform a PATCH request with retry logic and standardized response processing
   */
  async patch<T>(url: string, data?: any, retryConfig?: RetryConfig) {
    const response = await withRetry(
      () => this.apisauce.patch<T>(url, data),
      retryConfig || DEFAULT_RETRY_CONFIG,
    )
    return processApiResponse(response)
  }

  /**
   * Perform a DELETE request with retry logic and standardized response processing
   */
  async delete<T>(url: string, params?: any, retryConfig?: RetryConfig) {
    const response = await withRetry(
      () => this.apisauce.delete<T>(url, {}, { params }),
      retryConfig || DEFAULT_RETRY_CONFIG,
    )
    return processApiResponse(response)
  }

  /**
   * Check if the API is accessible
   */
  async ping() {
    try {
      const result = await this.get("/ping")
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Get current configuration info
   */
  getConfig() {
    return {
      baseURL: this.config.url,
      timeout: this.config.timeout,
      hasAuthProvider: !!this.authProvider,
      interceptorConfig: this.interceptorConfig,
    }
  }
}

// Singleton instance of the API for convenience
export const api = new Api()

// Export types for external use
export type { AuthTokenProvider, InterceptorConfig, RetryConfig }
