/**
 * Service Testing Patterns
 *
 * Provides standardized testing patterns and utilities for API services,
 * including test setup, mock configurations, and common test scenarios.
 */

import { mockController, MockHelpers, MockScenarios } from "./mock-utilities"
import { MockServices } from "./mock-services"
import { ServiceResult } from "./base-api-service"

/**
 * Test environment setup
 */
export class TestEnvironment {
  private originalConsoleError = console.error
  private originalConsoleWarn = console.warn

  /**
   * Setup test environment before tests
   */
  setup(
    options: {
      suppressConsoleErrors?: boolean
      mockScenario?: keyof typeof MockScenarios
      enableMocks?: boolean
    } = {},
  ) {
    // Suppress console errors/warnings in tests if needed
    if (options.suppressConsoleErrors) {
      console.error = jest.fn()
      console.warn = jest.fn()
    }

    // Configure mock controller
    if (options.enableMocks !== false) {
      mockController.setEnabled(true)
    }

    if (options.mockScenario) {
      mockController.setScenario(options.mockScenario)
    }

    // Clear any previous mock state
    mockController.reset()
  }

  /**
   * Cleanup test environment after tests
   */
  cleanup() {
    console.error = this.originalConsoleError
    console.warn = this.originalConsoleWarn
    mockController.reset()
  }

  /**
   * Configure network conditions for testing
   */
  setNetworkConditions(conditions: {
    delay?: number
    errorRate?: number
    scenario?: keyof typeof MockScenarios
  }) {
    if (conditions.delay !== undefined) {
      mockController.setDelay(conditions.delay)
    }

    if (conditions.errorRate !== undefined) {
      mockController.setErrorRate(conditions.errorRate)
    }

    if (conditions.scenario) {
      mockController.setScenario(conditions.scenario)
    }
  }
}

/**
 * Service test utilities
 */
export class ServiceTestUtils {
  /**
   * Test service health check
   */
  static async testServiceHealth(service: { ping: () => Promise<ServiceResult<boolean>> }) {
    const result = await service.ping()
    expect(result.success).toBe(true)
    expect(result.data).toBe(true)
  }

  /**
   * Test service error handling
   */
  static async testServiceErrorHandling(
    serviceMethod: () => Promise<ServiceResult<any>>,
    expectedErrorKind?: string,
  ) {
    mockController.setErrorRate(1) // Force errors

    const result = await serviceMethod()

    expect(result.success).toBe(false)
    expect(result.problem).toBeDefined()
    expect(result.message).toBeDefined()

    if (expectedErrorKind) {
      expect(result.problem?.kind).toBe(expectedErrorKind)
    }

    mockController.reset()
  }

  /**
   * Test service network timeout
   */
  static async testServiceTimeout(
    serviceMethod: () => Promise<ServiceResult<any>>,
    timeoutMs = 5000,
  ) {
    mockController.setScenario("slowNetwork")

    const startTime = Date.now()
    const result = await serviceMethod()
    const duration = Date.now() - startTime

    // Should either succeed quickly or fail with timeout
    expect(duration < timeoutMs || !result.success).toBe(true)

    mockController.reset()
  }

  /**
   * Test pagination
   */
  static async testPagination(
    serviceMethod: (params: any) => Promise<ServiceResult<any>>,
    testParams = {},
  ) {
    // Test first page
    const firstPage = await serviceMethod({ ...testParams, limit: 5, offset: 0 })
    expect(firstPage.success).toBe(true)
    expect(firstPage.data?.data).toBeDefined()
    expect(firstPage.data?.total).toBeDefined()
    expect(firstPage.data?.page).toBe(1)
    expect(firstPage.data?.limit).toBe(5)

    // Test second page if available
    if (firstPage.data?.hasMore) {
      const secondPage = await serviceMethod({ ...testParams, limit: 5, offset: 5 })
      expect(secondPage.success).toBe(true)
      expect(secondPage.data?.page).toBe(2)
    }
  }

  /**
   * Test data validation
   */
  static expectValidData<T>(result: ServiceResult<T>, validator: (data: T) => boolean) {
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(validator(result.data!)).toBe(true)
  }

  /**
   * Test authentication requirement
   */
  static async testAuthRequired(serviceMethod: () => Promise<ServiceResult<any>>) {
    // Mock unauthorized response
    const result = await MockHelpers.simulateAuthFlow.expiredToken()
    expect(result.ok).toBe(false)
    expect(result.problem).toBe("UNAUTHORIZED")
  }
}

/**
 * Common test scenarios
 */
export const TestScenarios = {
  /**
   * Authentication flow tests
   */
  authentication: {
    async testValidLogin() {
      const result = await MockServices.auth.login({
        email: "test@example.com",
        password: "password123",
      })

      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.user && data.accessToken && data.refreshToken)
      })
    },

    async testInvalidLogin() {
      const result = await MockServices.auth.login({
        email: "error@test.com",
        password: "wrongpassword",
      })

      expect(result.success).toBe(false)
      expect(result.problem?.kind).toBe("unauthorized")
    },

    async testRegistration() {
      const result = await MockServices.auth.register({
        email: "newuser@example.com",
        password: "newpassword123",
        role: "client",
        profile: {
          name: "New User",
          phone: "+1234567890",
        },
      })

      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.user && data.accessToken && data.refreshToken)
      })
    },

    async testLogout() {
      const result = await MockServices.auth.logout()
      expect(result.success).toBe(true)
    },

    async testTokenRefresh() {
      const result = await MockServices.auth.refreshToken()
      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.accessToken && data.refreshToken)
      })
    },
  },

  /**
   * User management tests
   */
  userManagement: {
    async testGetProfile() {
      const result = await MockServices.user.getProfile()
      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.id && data.email && data.profile)
      })
    },

    async testUpdateProfile() {
      const result = await MockServices.user.updateProfile({
        profile: {
          name: "Updated Name",
          phone: "+1987654321",
        },
      })

      ServiceTestUtils.expectValidData(result, (data) => {
        return data.profile?.name === "Updated Name"
      })
    },

    async testAvatarUpload() {
      const mockFile = new File(["mock"], "avatar.jpg", { type: "image/jpeg" })
      const result = await MockServices.user.uploadAvatar(mockFile)

      ServiceTestUtils.expectValidData(result, (data) => {
        return !!data.url
      })
    },

    async testUserSearch() {
      const result = await MockServices.user.searchUsers({ search: "john" })

      ServiceTestUtils.expectValidData(result, (data) => {
        return Array.isArray(data.data) && data.total >= 0
      })
    },
  },

  /**
   * Order management tests
   */
  orderManagement: {
    async testCreateOrder() {
      const orderData = {
        clientId: "client_123",
        items: [
          {
            fabricId: "fabric_123",
            styleId: "style_456",
            quantity: 1,
            unitPrice: 299.99,
            measurements: { chest: 42, waist: 34 },
          },
        ],
        notes: "Test order",
      }

      const result = await MockServices.order.createOrder(orderData)

      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.id && data.clientId && data.items?.length)
      })
    },

    async testOrderLifecycle() {
      const orderId = "test_order_123"

      // Test order progression
      const confirmed = await MockServices.order.confirmOrder(orderId)
      expect(confirmed.success).toBe(true)
      expect(confirmed.data?.status).toBe("confirmed")

      const started = await MockServices.order.startOrder(orderId)
      expect(started.success).toBe(true)
      expect(started.data?.status).toBe("in_progress")

      const completed = await MockServices.order.completeOrder(orderId)
      expect(completed.success).toBe(true)
      expect(completed.data?.status).toBe("completed")
    },

    async testProgressTracking() {
      const orderId = "test_order_123"

      const progressUpdate = await MockServices.order.addProgressUpdate(orderId, {
        message: "Started cutting fabric",
        images: [],
      })

      expect(progressUpdate.success).toBe(true)

      const progress = await MockServices.order.getOrderProgress(orderId)
      ServiceTestUtils.expectValidData(progress, (data) => {
        return Array.isArray(data) && data.length > 0
      })
    },

    async testOrderListing() {
      await ServiceTestUtils.testPagination((params) => MockServices.order.getOrders(params), {
        status: "confirmed",
      })
    },
  },

  /**
   * Fabric catalog tests
   */
  fabricCatalog: {
    async testFabricListing() {
      await ServiceTestUtils.testPagination((params) => MockServices.fabric.getFabrics(params), {
        category: "cotton",
      })
    },

    async testFabricDetails() {
      const result = await MockServices.fabric.getFabric("fabric_123")

      ServiceTestUtils.expectValidData(result, (data) => {
        return !!(data.id && data.name && data.pricePerMeter)
      })
    },

    async testFabricSearch() {
      const result = await MockServices.fabric.searchFabrics("cotton", {
        limit: 10,
      })

      ServiceTestUtils.expectValidData(result, (data) => {
        return Array.isArray(data.data) && data.total >= 0
      })
    },
  },
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Test service response time
   */
  static async testResponseTime(
    serviceMethod: () => Promise<ServiceResult<any>>,
    maxResponseTime = 1000,
  ) {
    const startTime = Date.now()
    await serviceMethod()
    const responseTime = Date.now() - startTime

    expect(responseTime).toBeLessThan(maxResponseTime)
    return responseTime
  }

  /**
   * Test concurrent requests
   */
  static async testConcurrentRequests(
    serviceMethod: () => Promise<ServiceResult<any>>,
    concurrency = 10,
  ) {
    const requests = Array.from({ length: concurrency }, () => serviceMethod())
    const results = await Promise.all(requests)

    // All requests should complete
    expect(results).toHaveLength(concurrency)

    // Most should succeed (allowing for some mock failures)
    const successCount = results.filter((r) => r.success).length
    expect(successCount).toBeGreaterThan(concurrency * 0.7) // At least 70% success

    return results
  }

  /**
   * Test memory usage during operations
   */
  static async testMemoryUsage(serviceMethod: () => Promise<ServiceResult<any>>, iterations = 100) {
    const initialMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < iterations; i++) {
      await serviceMethod()
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be reasonable (less than 50MB for 100 operations)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

    return memoryIncrease
  }
}

/**
 * Test suite factory for services
 */
export const createServiceTestSuite = (serviceName: string, service: any) => {
  return {
    [`${serviceName} Service Tests`]: () => {
      let testEnv: TestEnvironment

      beforeEach(() => {
        testEnv = new TestEnvironment()
        testEnv.setup()
      })

      afterEach(() => {
        testEnv.cleanup()
      })

      test("should have working health check", async () => {
        await ServiceTestUtils.testServiceHealth(service)
      })

      test("should handle network errors gracefully", async () => {
        await ServiceTestUtils.testServiceErrorHandling(() => service.ping())
      })

      test("should handle timeouts", async () => {
        await ServiceTestUtils.testServiceTimeout(() => service.ping())
      })

      test("should maintain reasonable response times", async () => {
        const responseTime = await PerformanceTestUtils.testResponseTime(
          () => service.ping(),
          500, // 500ms max for health check
        )
        console.log(`${serviceName} ping response time: ${responseTime}ms`)
      })

      test("should handle concurrent requests", async () => {
        const results = await PerformanceTestUtils.testConcurrentRequests(() => service.ping(), 5)
        console.log(
          `${serviceName} concurrent requests: ${results.filter((r) => r.success).length}/5 succeeded`,
        )
      })
    },
  }
}

/**
 * Export test environment for use in actual test files
 */
export const testEnvironment = new TestEnvironment()
