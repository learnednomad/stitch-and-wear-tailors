/**
 * Mock API Services
 *
 * Provides mock implementations of all API services for offline development,
 * testing, and demonstration purposes. These services return realistic data
 * with proper delays to simulate network conditions.
 */

import { ServiceResult } from "./base-api-service"
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateUserProfileRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderListParams,
  FabricListParams,
  ApiResponse,
} from "./api.types"

/**
 * Mock configuration
 */
const MOCK_CONFIG = {
  networkDelay: {
    fast: 100,
    normal: 300,
    slow: 800,
  },
  errorRate: 0.1, // 10% chance of random errors in development
  enableRandomErrors: __DEV__,
}

/**
 * Utility function to simulate network delay
 */
const delay = (ms: number = MOCK_CONFIG.networkDelay.normal): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Utility function to randomly simulate errors
 */
const shouldSimulateError = (): boolean =>
  MOCK_CONFIG.enableRandomErrors && Math.random() < MOCK_CONFIG.errorRate

/**
 * Mock data generators
 */
const MockDataGenerators = {
  user: (overrides = {}) => ({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    email: "john.doe@example.com",
    name: "John Doe",
    role: "client",
    profile: {
      name: "John Doe",
      phone: "+1234567890",
      address: "123 Main St, City, State 12345",
      preferences: {
        notifications: true,
        emailUpdates: true,
      },
    },
    avatarUrl: "https://via.placeholder.com/150",
    emailVerification: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  order: (overrides = {}) => ({
    id: `order_${Math.random().toString(36).substr(2, 9)}`,
    clientId: "client_123",
    tailorId: "tailor_456",
    status: "draft",
    priority: "medium",
    totalAmount: 299.99,
    items: [
      {
        id: "item_1",
        fabricId: "fabric_123",
        styleId: "style_456",
        quantity: 1,
        unitPrice: 299.99,
        totalPrice: 299.99,
        measurements: {
          chest: 42,
          waist: 34,
          length: 30,
        },
      },
    ],
    notes: "Custom tailoring requirements",
    estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  fabric: (overrides = {}) => ({
    id: `fabric_${Math.random().toString(36).substr(2, 9)}`,
    name: "Premium Cotton Blend",
    description: "High-quality cotton blend perfect for formal wear",
    category: "cotton",
    type: "shirting",
    color: "navy",
    pattern: "solid",
    pricePerMeter: 45.99,
    inStock: true,
    availableQuantity: 50,
    imageUrl: "https://via.placeholder.com/300x200",
    supplier: "Premium Fabrics Ltd",
    composition: "60% Cotton, 40% Polyester",
    weight: "120 GSM",
    width: "150 cm",
    careInstructions: "Dry clean only",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  progressUpdate: (overrides = {}) => ({
    id: `progress_${Math.random().toString(36).substr(2, 9)}`,
    orderId: "order_123",
    message: "Started cutting the fabric",
    images: [],
    createdBy: "tailor_456",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
}

/**
 * Mock Authentication API Service
 */
export class MockAuthApiService {
  async ping(): Promise<ServiceResult<boolean>> {
    await delay(MOCK_CONFIG.networkDelay.fast)
    return { success: true, data: true }
  }

  async login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    await delay()

    if (shouldSimulateError()) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "Mock network error",
      }
    }

    if (credentials.email === "error@test.com") {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "Invalid credentials",
      }
    }

    const user = MockDataGenerators.user({
      email: credentials.email,
      role: credentials.email.includes("tailor") ? "tailor" : "client",
    })

    return {
      success: true,
      data: {
        user,
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      },
    }
  }

  async register(userData: RegisterRequest): Promise<ServiceResult<LoginResponse>> {
    await delay(MOCK_CONFIG.networkDelay.slow)

    if (shouldSimulateError()) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Mock registration error",
      }
    }

    const user = MockDataGenerators.user({
      email: userData.email,
      role: userData.role,
      profile: userData.profile,
    })

    return {
      success: true,
      data: {
        user,
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      },
    }
  }

  async logout(): Promise<ServiceResult<void>> {
    await delay(MOCK_CONFIG.networkDelay.fast)
    return { success: true, data: undefined }
  }

  async refreshToken(): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    await delay()
    return {
      success: true,
      data: {
        accessToken: "mock_new_access_token",
        refreshToken: "mock_new_refresh_token",
      },
    }
  }

  async forgotPassword(email: string): Promise<ServiceResult<void>> {
    await delay()
    return { success: true, data: undefined }
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResult<void>> {
    await delay()
    return { success: true, data: undefined }
  }
}

/**
 * Mock User API Service
 */
export class MockUserApiService {
  async ping(): Promise<ServiceResult<boolean>> {
    await delay(MOCK_CONFIG.networkDelay.fast)
    return { success: true, data: true }
  }

  async getProfile(userId?: string): Promise<ServiceResult<any>> {
    await delay()

    if (shouldSimulateError()) {
      return {
        success: false,
        problem: { kind: "not_found" },
        message: "Mock user not found",
      }
    }

    const user = MockDataGenerators.user({
      id: userId || "current_user",
    })

    return { success: true, data: user }
  }

  async updateProfile(updates: UpdateUserProfileRequest): Promise<ServiceResult<any>> {
    await delay()

    const user = MockDataGenerators.user({
      profile: { ...MockDataGenerators.user().profile, ...updates.profile },
      updatedAt: new Date().toISOString(),
    })

    return { success: true, data: user }
  }

  async uploadAvatar(file: File): Promise<ServiceResult<{ url: string }>> {
    await delay(MOCK_CONFIG.networkDelay.slow)

    return {
      success: true,
      data: { url: "https://via.placeholder.com/150" },
    }
  }

  async searchUsers(params: any): Promise<ServiceResult<ApiResponse<any[]>>> {
    await delay()

    const users = Array.from({ length: 5 }, () => MockDataGenerators.user())

    return {
      success: true,
      data: {
        data: users,
        total: 25,
        page: 1,
        limit: 10,
        hasMore: true,
      },
    }
  }
}

/**
 * Mock Order API Service
 */
export class MockOrderApiService {
  async ping(): Promise<ServiceResult<boolean>> {
    await delay(MOCK_CONFIG.networkDelay.fast)
    return { success: true, data: true }
  }

  async createOrder(orderData: CreateOrderRequest): Promise<ServiceResult<any>> {
    await delay(MOCK_CONFIG.networkDelay.slow)

    if (shouldSimulateError()) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Mock order creation failed",
      }
    }

    const order = MockDataGenerators.order({
      clientId: orderData.clientId,
      items: orderData.items,
      notes: orderData.notes,
    })

    return { success: true, data: order }
  }

  async getOrder(orderId: string): Promise<ServiceResult<any>> {
    await delay()

    const order = MockDataGenerators.order({ id: orderId })
    return { success: true, data: order }
  }

  async updateOrder(orderId: string, updates: UpdateOrderRequest): Promise<ServiceResult<any>> {
    await delay()

    const order = MockDataGenerators.order({
      id: orderId,
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return { success: true, data: order }
  }

  async getOrders(params?: OrderListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    await delay()

    const orders = Array.from({ length: 10 }, () => MockDataGenerators.order())

    return {
      success: true,
      data: {
        data: orders,
        total: 50,
        page: 1,
        limit: 10,
        hasMore: true,
      },
    }
  }

  async confirmOrder(orderId: string): Promise<ServiceResult<any>> {
    await delay()

    const order = MockDataGenerators.order({
      id: orderId,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })

    return { success: true, data: order }
  }

  async startOrder(orderId: string): Promise<ServiceResult<any>> {
    await delay()

    const order = MockDataGenerators.order({
      id: orderId,
      status: "in_progress",
      startedAt: new Date().toISOString(),
    })

    return { success: true, data: order }
  }

  async completeOrder(orderId: string): Promise<ServiceResult<any>> {
    await delay()

    const order = MockDataGenerators.order({
      id: orderId,
      status: "completed",
      completedAt: new Date().toISOString(),
    })

    return { success: true, data: order }
  }

  async addProgressUpdate(orderId: string, update: any): Promise<ServiceResult<any>> {
    await delay()

    const progressUpdate = MockDataGenerators.progressUpdate({
      orderId,
      message: update.message,
      images: update.images,
    })

    return { success: true, data: progressUpdate }
  }

  async getOrderProgress(orderId: string): Promise<ServiceResult<any[]>> {
    await delay()

    const updates = Array.from({ length: 3 }, () => MockDataGenerators.progressUpdate({ orderId }))

    return { success: true, data: updates }
  }
}

/**
 * Mock Fabric API Service
 */
export class MockFabricApiService {
  async ping(): Promise<ServiceResult<boolean>> {
    await delay(MOCK_CONFIG.networkDelay.fast)
    return { success: true, data: true }
  }

  async getFabrics(params?: FabricListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    await delay()

    const fabrics = Array.from({ length: 20 }, () => MockDataGenerators.fabric())

    return {
      success: true,
      data: {
        data: fabrics,
        total: 100,
        page: 1,
        limit: 20,
        hasMore: true,
      },
    }
  }

  async getFabric(fabricId: string): Promise<ServiceResult<any>> {
    await delay()

    const fabric = MockDataGenerators.fabric({ id: fabricId })
    return { success: true, data: fabric }
  }

  async searchFabrics(
    query: string,
    params?: FabricListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    await delay()

    const fabrics = Array.from({ length: 5 }, () =>
      MockDataGenerators.fabric({
        name: `${query} Fabric`,
      }),
    )

    return {
      success: true,
      data: {
        data: fabrics,
        total: 15,
        page: 1,
        limit: 10,
        hasMore: true,
      },
    }
  }
}

/**
 * Mock service factory
 */
export const MockServices = {
  auth: new MockAuthApiService(),
  user: new MockUserApiService(),
  order: new MockOrderApiService(),
  fabric: new MockFabricApiService(),
}

/**
 * Mock mode configuration
 */
export const MockConfig = {
  isEnabled: __DEV__,
  networkDelay: MOCK_CONFIG.networkDelay,
  errorRate: MOCK_CONFIG.errorRate,

  setNetworkDelay(delay: keyof typeof MOCK_CONFIG.networkDelay) {
    MOCK_CONFIG.networkDelay.normal = MOCK_CONFIG.networkDelay[delay]
  },

  setErrorRate(rate: number) {
    MOCK_CONFIG.errorRate = rate
  },

  enableRandomErrors(enabled: boolean) {
    MOCK_CONFIG.enableRandomErrors = enabled
  },
}
