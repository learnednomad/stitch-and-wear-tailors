/**
 * API Request and Response Interceptors
 *
 * Provides centralized request/response processing following Infinite Red patterns
 * - Request logging and authentication token injection
 * - Response logging and error handling
 * - Integration with state management for global error states
 */

import { ApiResponse, ApisauceInstance } from "apisauce"
import { getGeneralApiProblem, GeneralApiProblem } from "./apiProblem"

// Types for interceptor configuration
export interface InterceptorConfig {
  enableLogging?: boolean
  enableAuthInjection?: boolean
  logLevel?: "minimal" | "detailed"
}

export interface AuthTokenProvider {
  getAccessToken(): string | null
  getRefreshToken(): string | null
  onTokenExpired(): Promise<void>
}

/**
 * Sets up request interceptors for the API client
 */
export function setupRequestInterceptors(
  apisauce: ApisauceInstance,
  authProvider?: AuthTokenProvider,
  config: InterceptorConfig = {},
) {
  const { enableLogging = __DEV__, enableAuthInjection = true, logLevel = "minimal" } = config

  // Request interceptor for authentication token injection
  if (enableAuthInjection && authProvider) {
    apisauce.addRequestTransform((request) => {
      const token = authProvider.getAccessToken()
      if (token) {
        request.headers = {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    })
  }

  // Request logging interceptor
  if (enableLogging) {
    apisauce.addRequestTransform((request) => {
      if (logLevel === "detailed") {
        console.log(`🚀 [API REQUEST] ${request.method?.toUpperCase()} ${request.url}`)
        console.log("📤 Headers:", request.headers)
        if (request.data) {
          console.log("📤 Body:", request.data)
        }
      } else {
        console.log(`🚀 [API] ${request.method?.toUpperCase()} ${request.url}`)
      }
    })
  }
}

/**
 * Sets up response interceptors for the API client
 */
export function setupResponseInterceptors(
  apisauce: ApisauceInstance,
  authProvider?: AuthTokenProvider,
  config: InterceptorConfig = {},
) {
  const { enableLogging = __DEV__, logLevel = "minimal" } = config

  // Response logging and error handling interceptor
  apisauce.addResponseTransform(async (response: ApiResponse<any>) => {
    if (enableLogging) {
      const status = response.status || 0
      const statusEmoji = status >= 200 && status < 300 ? "✅" : "❌"

      if (logLevel === "detailed") {
        console.log(`${statusEmoji} [API RESPONSE] ${status} ${response.config?.url}`)
        console.log("📥 Headers:", response.headers)
        if (response.data) {
          console.log("📥 Data:", response.data)
        }
        if (response.problem) {
          console.log("⚠️ Problem:", response.problem)
        }
      } else {
        console.log(`${statusEmoji} [API] ${status} ${response.config?.url}`)
        if (response.problem) {
          console.log(`⚠️ ${response.problem}`)
        }
      }
    }

    // Handle token expiration
    if (response.status === 401 && authProvider) {
      console.log("🔄 Token expired, attempting refresh...")
      try {
        await authProvider.onTokenExpired()
      } catch (error) {
        console.error("💥 Token refresh failed:", error)
      }
    }
  })
}

/**
 * Processes API responses and returns standardized result
 */
export function processApiResponse<T>(
  response: ApiResponse<T>,
): { success: true; data: T } | { success: false; problem: GeneralApiProblem } {
  if (response.ok && response.data) {
    return { success: true, data: response.data }
  }

  const problem = getGeneralApiProblem(response)
  if (problem) {
    return { success: false, problem }
  }

  // If no specific problem, treat as bad data
  return { success: false, problem: { kind: "bad-data" } }
}

/**
 * Creates a standardized error message from API problem
 */
export function getErrorMessage(problem: GeneralApiProblem): string {
  switch (problem.kind) {
    case "timeout":
      return "Request timed out. Please check your connection and try again."
    case "cannot-connect":
      return "Unable to connect to the server. Please check your internet connection."
    case "server":
      return "Server error occurred. Please try again later."
    case "unauthorized":
      return "You are not authorized to perform this action."
    case "forbidden":
      return "Access denied. You don't have permission for this action."
    case "not-found":
      return "The requested resource was not found."
    case "rejected":
      return "Request was rejected. Please check your input and try again."
    case "bad-data":
      return "Invalid response from server. Please try again."
    case "unknown":
    default:
      return "An unexpected error occurred. Please try again."
  }
}

/**
 * Retry configuration for failed requests
 */
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryOn: Array<GeneralApiProblem["kind"]>
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: ["timeout", "cannot-connect", "server", "unknown"],
}

/**
 * Implements retry logic for failed API requests
 */
export async function withRetry<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<ApiResponse<T>> {
  let lastResponse: ApiResponse<T>

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    lastResponse = await apiCall()

    if (lastResponse.ok) {
      return lastResponse
    }

    const problem = getGeneralApiProblem(lastResponse)
    if (!problem || !config.retryOn.includes(problem.kind)) {
      // Don't retry for these types of errors
      break
    }

    if (attempt < config.maxRetries) {
      console.log(`🔄 Retrying API call (attempt ${attempt + 1}/${config.maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, config.retryDelay * (attempt + 1)))
    }
  }

  return lastResponse!
}
