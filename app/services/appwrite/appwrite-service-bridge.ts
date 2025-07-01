/**
 * Appwrite Service Bridge
 *
 * Connects our existing API services with Appwrite backend,
 * providing a seamless integration layer that maintains our
 * existing service interfaces while using Appwrite as the backend.
 */

import { AppwriteAuthAdapter, getAppwriteAuthAdapter } from "./appwrite-auth-adapter"
import { AppwriteDatabaseAdapter, getAppwriteDatabaseAdapter } from "./appwrite-database-adapter"
import { COLLECTION_IDS } from "./appwrite-client"
import { ServiceResult } from "../api/base-api-service"
import { Query } from "appwrite"

/**
 * Bridge configuration
 */
export interface ServiceBridgeConfig {
  enableCaching?: boolean
  retryAttempts?: number
  timeout?: number
}

/**
 * Cache interface for service responses
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Service bridge that connects API services to Appwrite
 */
export class AppwriteServiceBridge {
  private authAdapter: AppwriteAuthAdapter
  private dbAdapter: AppwriteDatabaseAdapter
  private cache: Map<string, CacheEntry<any>> = new Map()
  private config: ServiceBridgeConfig

  constructor(config: ServiceBridgeConfig = {}) {
    this.authAdapter = getAppwriteAuthAdapter()
    this.dbAdapter = getAppwriteDatabaseAdapter()
    this.config = {
      enableCaching: true,
      retryAttempts: 3,
      timeout: 10000,
      ...config,
    }
  }

  /**
   * Cache management
   */
  private getCacheKey(collection: string, operation: string, params?: any): string {
    return `${collection}:${operation}:${JSON.stringify(params || {})}`
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 300000): void {
    if (!this.config.enableCaching) return

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  private getCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null

    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * Authentication operations
   */
  async authenticateUser(email: string, password: string): Promise<ServiceResult<any>> {
    try {
      const result = await this.authAdapter.login(email, password)
      if (result.success) {
        this.clearCache() // Clear cache on auth change
      }
      return result
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Authentication failed",
      }
    }
  }

  async getCurrentUser(): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("auth", "current-user")
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.authAdapter.getCurrentUser()
    if (result.success) {
      this.setCache(cacheKey, result, 60000) // Cache for 1 minute
    }
    return result
  }

  async logoutUser(): Promise<ServiceResult<void>> {
    const result = await this.authAdapter.logout()
    if (result.success) {
      this.clearCache() // Clear all cache on logout
    }
    return result
  }

  /**
   * User operations
   */
  async createUser(userData: any): Promise<ServiceResult<any>> {
    try {
      const result = await this.dbAdapter.createDocument(
        COLLECTION_IDS.USERS,
        userData,
        this.dbAdapter.createUserPermissions(userData.userId || userData.$id),
      )

      if (result.success) {
        this.clearCache("users")
      }

      return result
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to create user",
      }
    }
  }

  async getUserById(userId: string): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("users", "get", { userId })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.getDocument(COLLECTION_IDS.USERS, userId)
    if (result.success) {
      this.setCache(cacheKey, result)
    }
    return result
  }

  async updateUser(userId: string, updates: any): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.updateDocument(COLLECTION_IDS.USERS, userId, updates)
    if (result.success) {
      this.clearCache("users")
    }
    return result
  }

  async searchUsers(query: string, limit?: number): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("users", "search", { query, limit })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.searchDocuments(COLLECTION_IDS.USERS, "name", query, {
      limit: limit || 20,
    })

    if (result.success) {
      this.setCache(cacheKey, result, 180000) // Cache for 3 minutes
    }
    return result
  }

  /**
   * Order operations
   */
  async createOrder(orderData: any): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.createDocument(
      COLLECTION_IDS.ORDERS,
      orderData,
      this.dbAdapter.createUserPermissions(orderData.userId),
    )

    if (result.success) {
      this.clearCache("orders")
    }
    return result
  }

  async getOrderById(orderId: string): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("orders", "get", { orderId })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.getDocument(COLLECTION_IDS.ORDERS, orderId)
    if (result.success) {
      this.setCache(cacheKey, result)
    }
    return result
  }

  async getUserOrders(userId: string, params?: any): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("orders", "user-orders", { userId, ...params })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.filterDocuments(
      COLLECTION_IDS.ORDERS,
      "userId",
      "equal",
      userId,
      params,
    )

    if (result.success) {
      this.setCache(cacheKey, result, 120000) // Cache for 2 minutes
    }
    return result
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    updates?: any,
  ): Promise<ServiceResult<any>> {
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...updates,
    }

    const result = await this.dbAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, updateData)
    if (result.success) {
      this.clearCache("orders")
    }
    return result
  }

  /**
   * Fabric operations
   */
  async getFabrics(params?: any): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("fabrics", "list", params)
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.listDocuments(COLLECTION_IDS.FABRICS, params)
    if (result.success) {
      this.setCache(cacheKey, result, 600000) // Cache for 10 minutes
    }
    return result
  }

  async searchFabrics(query: string, params?: any): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("fabrics", "search", { query, ...params })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.searchDocuments(
      COLLECTION_IDS.FABRICS,
      "name",
      query,
      params,
    )

    if (result.success) {
      this.setCache(cacheKey, result, 300000) // Cache for 5 minutes
    }
    return result
  }

  async getFabricById(fabricId: string): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("fabrics", "get", { fabricId })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.getDocument(COLLECTION_IDS.FABRICS, fabricId)
    if (result.success) {
      this.setCache(cacheKey, result, 600000) // Cache for 10 minutes
    }
    return result
  }

  /**
   * Measurement operations
   */
  async createMeasurement(measurementData: any): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.createDocument(
      COLLECTION_IDS.MEASUREMENTS,
      measurementData,
      this.dbAdapter.createUserPermissions(measurementData.userId),
    )

    if (result.success) {
      this.clearCache("measurements")
    }
    return result
  }

  async getUserMeasurements(userId: string): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("measurements", "user-measurements", { userId })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.filterDocuments(
      COLLECTION_IDS.MEASUREMENTS,
      "userId",
      "equal",
      userId,
    )

    if (result.success) {
      this.setCache(cacheKey, result, 300000) // Cache for 5 minutes
    }
    return result
  }

  /**
   * Appointment operations
   */
  async createAppointment(appointmentData: any): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.createDocument(
      COLLECTION_IDS.APPOINTMENTS,
      appointmentData,
      this.dbAdapter.createUserPermissions(appointmentData.userId),
    )

    if (result.success) {
      this.clearCache("appointments")
    }
    return result
  }

  async getUserAppointments(userId: string, params?: any): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("appointments", "user-appointments", { userId, ...params })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.filterDocuments(
      COLLECTION_IDS.APPOINTMENTS,
      "userId",
      "equal",
      userId,
      params,
    )

    if (result.success) {
      this.setCache(cacheKey, result, 60000) // Cache for 1 minute
    }
    return result
  }

  async getAvailableSlots(tailorId: string, date: string): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("appointments", "available-slots", { tailorId, date })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    // Get appointments for the tailor on the specified date
    const result = await this.dbAdapter.filterDocuments(
      COLLECTION_IDS.APPOINTMENTS,
      "tailorId",
      "equal",
      tailorId,
      {
        queries: [Query.equal("date", date)],
      },
    )

    if (result.success) {
      this.setCache(cacheKey, result, 300000) // Cache for 5 minutes
    }
    return result
  }

  /**
   * Notification operations
   */
  async createNotification(notificationData: any): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.createDocument(
      COLLECTION_IDS.NOTIFICATIONS,
      notificationData,
      this.dbAdapter.createUserPermissions(notificationData.userId),
    )

    if (result.success) {
      this.clearCache("notifications")
    }
    return result
  }

  async getUserNotifications(userId: string, params?: any): Promise<ServiceResult<any>> {
    const cacheKey = this.getCacheKey("notifications", "user-notifications", { userId, ...params })
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const result = await this.dbAdapter.filterDocuments(
      COLLECTION_IDS.NOTIFICATIONS,
      "userId",
      "equal",
      userId,
      params,
    )

    if (result.success) {
      this.setCache(cacheKey, result, 30000) // Cache for 30 seconds
    }
    return result
  }

  async markNotificationAsRead(notificationId: string): Promise<ServiceResult<any>> {
    const result = await this.dbAdapter.updateDocument(
      COLLECTION_IDS.NOTIFICATIONS,
      notificationId,
      {
        isRead: true,
        readAt: new Date().toISOString(),
      },
    )

    if (result.success) {
      this.clearCache("notifications")
    }
    return result
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<
    ServiceResult<{
      auth: boolean
      database: boolean
      overall: boolean
    }>
  > {
    try {
      const [authResult, dbResult] = await Promise.allSettled([
        this.authAdapter.testConnection(),
        this.dbAdapter.testConnection(),
      ])

      const authHealth = authResult.status === "fulfilled" && authResult.value.success
      const dbHealth = dbResult.status === "fulfilled" && dbResult.value.success

      return {
        success: true,
        data: {
          auth: authHealth,
          database: dbHealth,
          overall: authHealth && dbHealth,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "network" },
        message: error.message || "Health check failed",
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.clearCache()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    keys: string[]
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

/**
 * Create singleton service bridge
 */
let appwriteServiceBridge: AppwriteServiceBridge | null = null

export function getAppwriteServiceBridge(config?: ServiceBridgeConfig): AppwriteServiceBridge {
  if (!appwriteServiceBridge) {
    appwriteServiceBridge = new AppwriteServiceBridge(config)
  }
  return appwriteServiceBridge
}

export function resetAppwriteServiceBridge(): void {
  appwriteServiceBridge = null
}
