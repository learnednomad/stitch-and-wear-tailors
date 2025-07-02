/**
 * API Mocking Utilities
 *
 * Provides utilities for mocking API responses, testing different scenarios,
 * and controlling mock behavior during development and testing.
 */

import { ApiResponse } from "apisauce"
import { GeneralApiProblem } from "./apiProblem"
import { ServiceResult } from "./base-api-service"

/**
 * Mock response templates for different scenarios
 */
export const MockResponseTemplates = {
  /**
   * Success response template
   */
  success<T>(data: T, status = 200): ApiResponse<T> {
    return {
      ok: true,
      status,
      data,
      problem: null,
      originalError: null,
      config: {},
      duration: Math.random() * 500 + 100, // 100-600ms
      headers: {
        "content-type": "application/json",
        "x-request-id": `mock_${Date.now()}`,
      },
    }
  },

  /**
   * Error response template
   */
  error<T>(problem: GeneralApiProblem, status = 400, message?: string): ApiResponse<T> {
    return {
      ok: false,
      status,
      data: undefined,
      problem,
      originalError: new Error(message || `Mock ${problem} error`),
      config: {},
      duration: Math.random() * 200 + 50, // 50-250ms for errors
      headers: {
        "content-type": "application/json",
        "x-request-id": `mock_${Date.now()}`,
      },
    }
  },

  /**
   * Network timeout response
   */
  timeout<T>(): ApiResponse<T> {
    return this.error<T>("TIMEOUT_ERROR", 0, "Request timed out")
  },

  /**
   * Network connection error
   */
  networkError<T>(): ApiResponse<T> {
    return this.error<T>("NETWORK_ERROR", 0, "Network connection failed")
  },

  /**
   * Server error response
   */
  serverError<T>(): ApiResponse<T> {
    return this.error<T>("SERVER_ERROR", 500, "Internal server error")
  },

  /**
   * Unauthorized response
   */
  unauthorized<T>(): ApiResponse<T> {
    return this.error<T>("UNAUTHORIZED", 401, "Authentication required")
  },

  /**
   * Forbidden response
   */
  forbidden<T>(): ApiResponse<T> {
    return this.error<T>("FORBIDDEN", 403, "Access forbidden")
  },

  /**
   * Not found response
   */
  notFound<T>(): ApiResponse<T> {
    return this.error<T>("NOT_FOUND", 404, "Resource not found")
  },

  /**
   * Validation error response
   */
  validationError<T>(errors: Record<string, string[]>): ApiResponse<T> {
    return {
      ok: false,
      status: 422,
      data: { errors } as any,
      problem: "CLIENT_ERROR" as GeneralApiProblem,
      originalError: new Error("Validation failed"),
      config: {},
      duration: Math.random() * 100 + 50,
      headers: {
        "content-type": "application/json",
        "x-request-id": `mock_${Date.now()}`,
      },
    }
  },
}

/**
 * Mock scenario configurations
 */
export const MockScenarios = {
  /**
   * Normal operation - mostly success with occasional errors
   */
  normal: {
    successRate: 0.9,
    networkDelay: { min: 100, max: 500 },
    errorDistribution: {
      SERVER_ERROR: 0.3,
      NETWORK_ERROR: 0.2,
      TIMEOUT_ERROR: 0.2,
      CLIENT_ERROR: 0.3,
    },
  },

  /**
   * Slow network conditions
   */
  slowNetwork: {
    successRate: 0.8,
    networkDelay: { min: 1000, max: 3000 },
    errorDistribution: {
      TIMEOUT_ERROR: 0.5,
      NETWORK_ERROR: 0.3,
      SERVER_ERROR: 0.2,
    },
  },

  /**
   * Unreliable network
   */
  unreliable: {
    successRate: 0.6,
    networkDelay: { min: 200, max: 2000 },
    errorDistribution: {
      NETWORK_ERROR: 0.4,
      TIMEOUT_ERROR: 0.3,
      SERVER_ERROR: 0.3,
    },
  },

  /**
   * Server maintenance mode
   */
  maintenance: {
    successRate: 0.1,
    networkDelay: { min: 100, max: 300 },
    errorDistribution: {
      SERVER_ERROR: 0.8,
      FORBIDDEN: 0.2,
    },
  },

  /**
   * Authentication issues
   */
  authProblems: {
    successRate: 0.7,
    networkDelay: { min: 100, max: 500 },
    errorDistribution: {
      UNAUTHORIZED: 0.6,
      FORBIDDEN: 0.2,
      SERVER_ERROR: 0.2,
    },
  },
}

/**
 * Mock controller for managing mock behavior
 */
export class MockController {
  private currentScenario: keyof typeof MockScenarios = "normal"
  private isEnabled = __DEV__
  private customErrorRate = 0
  private customDelay = 0

  /**
   * Enable or disable mocking
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  /**
   * Check if mocking is enabled
   */
  isActive(): boolean {
    return this.isEnabled
  }

  /**
   * Set the current scenario
   */
  setScenario(scenario: keyof typeof MockScenarios) {
    this.currentScenario = scenario
  }

  /**
   * Get current scenario configuration
   */
  getScenario() {
    return MockScenarios[this.currentScenario]
  }

  /**
   * Set custom error rate (overrides scenario)
   */
  setErrorRate(rate: number) {
    this.customErrorRate = Math.max(0, Math.min(1, rate))
  }

  /**
   * Set custom delay (overrides scenario)
   */
  setDelay(ms: number) {
    this.customDelay = Math.max(0, ms)
  }

  /**
   * Reset to default scenario settings
   */
  reset() {
    this.currentScenario = "normal"
    this.customErrorRate = 0
    this.customDelay = 0
  }

  /**
   * Generate a mock response based on current configuration
   */
  async generateResponse<T>(
    successData: T,
    options: {
      forceSuccess?: boolean
      forceError?: GeneralApiProblem
      customDelay?: number
    } = {},
  ): Promise<ApiResponse<T>> {
    // Apply delay
    const delay = options.customDelay ?? (this.customDelay || this.getRandomDelay())

    await new Promise((resolve) => setTimeout(resolve, delay))

    // Force specific responses
    if (options.forceSuccess) {
      return MockResponseTemplates.success(successData)
    }

    if (options.forceError) {
      return MockResponseTemplates.error<T>(options.forceError)
    }

    // Determine if should return error
    const errorRate = this.customErrorRate || 1 - this.getScenario().successRate
    const shouldError = Math.random() < errorRate

    if (!shouldError) {
      return MockResponseTemplates.success(successData)
    }

    // Generate error based on scenario distribution
    const errorType = this.getRandomErrorType()
    return MockResponseTemplates.error<T>(errorType)
  }

  /**
   * Convert ApiResponse to ServiceResult
   */
  toServiceResult<T>(apiResponse: ApiResponse<T>): ServiceResult<T> {
    if (apiResponse.ok && apiResponse.data !== undefined) {
      return {
        success: true,
        data: apiResponse.data,
      }
    }

    return {
      success: false,
      problem: { kind: apiResponse.problem || "unknown" },
      message: apiResponse.originalError?.message || "Mock API error",
    }
  }

  /**
   * Get random delay based on scenario
   */
  private getRandomDelay(): number {
    const { networkDelay } = this.getScenario()
    return Math.random() * (networkDelay.max - networkDelay.min) + networkDelay.min
  }

  /**
   * Get random error type based on scenario distribution
   */
  private getRandomErrorType(): GeneralApiProblem {
    const { errorDistribution } = this.getScenario()
    const errorTypes = Object.keys(errorDistribution) as GeneralApiProblem[]
    const weights = Object.values(errorDistribution)

    let random = Math.random()
    for (let i = 0; i < errorTypes.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return errorTypes[i]
      }
    }

    return errorTypes[0] // Fallback
  }
}

/**
 * Global mock controller instance
 */
export const mockController = new MockController()

/**
 * Convenience functions for common mock scenarios
 */
export const MockHelpers = {
  /**
   * Test authentication flows
   */
  simulateAuthFlow: {
    validLogin: () =>
      mockController.generateResponse(
        {
          user: { id: "user_123", email: "test@example.com", role: "client" },
          accessToken: "mock_token",
          refreshToken: "mock_refresh",
        },
        { forceSuccess: true },
      ),

    invalidCredentials: () =>
      mockController.generateResponse(null, {
        forceError: "UNAUTHORIZED",
      }),

    expiredToken: () =>
      mockController.generateResponse(null, {
        forceError: "UNAUTHORIZED",
      }),
  },

  /**
   * Test network conditions
   */
  simulateNetwork: {
    slow: (data: any) =>
      mockController.generateResponse(data, {
        customDelay: 2000,
      }),

    timeout: (data: any) =>
      mockController.generateResponse(data, {
        forceError: "TIMEOUT_ERROR",
      }),

    offline: (data: any) =>
      mockController.generateResponse(data, {
        forceError: "NETWORK_ERROR",
      }),
  },

  /**
   * Test error handling
   */
  simulateErrors: {
    serverError: (data: any) =>
      mockController.generateResponse(data, {
        forceError: "SERVER_ERROR",
      }),

    validationError: () =>
      MockResponseTemplates.validationError({
        email: ["Email is required"],
        password: ["Password must be at least 8 characters"],
      }),

    notFound: (data: any) =>
      mockController.generateResponse(data, {
        forceError: "NOT_FOUND",
      }),
  },

  /**
   * Test pagination
   */
  paginatedResponse: <T>(items: T[], page = 1, limit = 10) => {
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedItems = items.slice(start, end)

    return mockController.generateResponse(
      {
        data: paginatedItems,
        total: items.length,
        page,
        limit,
        hasMore: end < items.length,
      },
      { forceSuccess: true },
    )
  },
}

/**
 * Development utilities for testing mock configurations
 */
export const MockDevUtils = {
  /**
   * Log current mock configuration
   */
  logConfig() {
    if (__DEV__) {
      console.log("📱 Mock Configuration:", {
        enabled: mockController.isActive(),
        scenario: mockController.getScenario(),
        controller: mockController,
      })
    }
  },

  /**
   * Test all error scenarios
   */
  async testErrorScenarios() {
    if (!__DEV__) return

    console.log("🧪 Testing mock error scenarios...")

    const scenarios = Object.keys(MockScenarios) as Array<keyof typeof MockScenarios>

    for (const scenario of scenarios) {
      mockController.setScenario(scenario)
      console.log(`Testing scenario: ${scenario}`)

      // Test a few requests
      for (let i = 0; i < 5; i++) {
        const response = await mockController.generateResponse({ test: true })
        console.log(
          `  Request ${i + 1}: ${response.ok ? "✅ Success" : "❌ Error"} (${response.problem || "OK"})`,
        )
      }
    }

    mockController.reset()
  },

  /**
   * Benchmark mock performance
   */
  async benchmarkMocks() {
    if (!__DEV__) return

    console.log("⚡ Benchmarking mock performance...")

    const iterations = 100
    const start = Date.now()

    await Promise.all(
      Array.from({ length: iterations }, () =>
        mockController.generateResponse({ benchmark: true }, { customDelay: 0 }),
      ),
    )

    const duration = Date.now() - start
    console.log(
      `Completed ${iterations} mock requests in ${duration}ms (${(duration / iterations).toFixed(2)}ms avg)`,
    )
  },
}
