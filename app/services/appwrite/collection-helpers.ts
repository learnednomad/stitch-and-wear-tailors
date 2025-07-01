/**
 * Collection Helper Utilities
 *
 * Provides type-safe utilities for working with Appwrite collections,
 * including document creation, validation, and query building.
 */

import { Query } from "appwrite"
import { DATABASE_SCHEMA, validateDocument } from "./database-schema"
import { AppwriteDatabaseAdapter, DatabaseQueryParams } from "./appwrite-database-adapter"
import { ServiceResult } from "../api/base-api-service"

/**
 * Type-safe collection helper base class
 */
export abstract class CollectionHelper<T> {
  protected adapter: AppwriteDatabaseAdapter
  protected collectionId: string

  constructor(collectionId: string, adapter?: AppwriteDatabaseAdapter) {
    this.collectionId = collectionId
    this.adapter = adapter || new AppwriteDatabaseAdapter()
  }

  /**
   * Validate document before operations
   */
  protected validate(data: Partial<T>): ServiceResult<boolean> {
    const validation = validateDocument(this.collectionId, data as any)

    if (!validation.isValid) {
      return {
        success: false,
        problem: { kind: "bad-data" },
        message: validation.errors.join(", "),
      }
    }

    return {
      success: true,
      data: true,
    }
  }

  /**
   * Create a new document with validation
   */
  async create(
    data: Omit<T, "$id" | "$createdAt" | "$updatedAt">,
    permissions?: string[],
  ): Promise<ServiceResult<T>> {
    const validation = this.validate(data as any)
    if (!validation.success) {
      return validation as any
    }

    return this.adapter.createDocument<T>(this.collectionId, data as any, permissions)
  }

  /**
   * Get document by ID
   */
  async get(id: string): Promise<ServiceResult<T>> {
    return this.adapter.getDocument<T>(this.collectionId, id)
  }

  /**
   * Update document with validation
   */
  async update(id: string, data: Partial<T>, permissions?: string[]): Promise<ServiceResult<T>> {
    const validation = this.validate(data)
    if (!validation.success) {
      return validation as any
    }

    return this.adapter.updateDocument<T>(this.collectionId, id, data as any, permissions)
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    return this.adapter.deleteDocument(this.collectionId, id)
  }

  /**
   * List documents with query
   */
  async list(
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<{ total: number; documents: T[] }>> {
    return this.adapter.listDocuments<T>(this.collectionId, params)
  }
}

/**
 * User collection helper with specific methods
 */
export class UserCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("users", adapter)
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<ServiceResult<any>> {
    const result = await this.adapter.listDocuments(this.collectionId, {
      queries: [Query.equal("email", email).toString()],
      limit: 1,
    })

    if (result.success && result.data.documents.length > 0) {
      return {
        success: true,
        data: result.data.documents[0],
      }
    }

    return {
      success: false,
      problem: { kind: "not-found" },
      message: "User not found",
    }
  }

  /**
   * Get users by role
   */
  async getByRole(
    role: "client" | "tailor" | "admin",
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("role", role).toString(),
        Query.equal("isActive", true).toString(),
      ],
    })
  }

  /**
   * Search users
   */
  async search(query: string, params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.searchDocuments(this.collectionId, "firstName", query, params)
  }
}

/**
 * Order collection helper
 */
export class OrderCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("orders", adapter)
  }

  /**
   * Get orders by status
   */
  async getByStatus(status: string, params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.filterDocuments(this.collectionId, "status", "equal", status, params)
  }

  /**
   * Get client orders
   */
  async getClientOrders(
    clientId: string,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("clientId", clientId).toString(),
        Query.orderDesc("$createdAt").toString(),
      ],
    })
  }

  /**
   * Get tailor orders
   */
  async getTailorOrders(
    tailorId: string,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("tailorId", tailorId).toString(),
        Query.orderDesc("$createdAt").toString(),
      ],
    })
  }

  /**
   * Generate order number
   */
  async generateOrderNumber(): Promise<string> {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `ORD-${year}${month}-${random}`
  }
}

/**
 * Fabric collection helper
 */
export class FabricCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("fabrics", adapter)
  }

  /**
   * Get featured fabrics
   */
  async getFeatured(params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("isFeatured", true).toString(),
        Query.equal("isActive", true).toString(),
      ],
    })
  }

  /**
   * Get fabrics by category
   */
  async getByCategory(category: string, params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.filterDocuments(this.collectionId, "category", "equal", category, {
      ...params,
      queries: [...(params?.queries || []), Query.equal("isActive", true).toString()],
    })
  }

  /**
   * Search fabrics
   */
  async search(query: string, params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.searchDocuments(this.collectionId, "name", query, {
      ...params,
      queries: [...(params?.queries || []), Query.equal("isActive", true).toString()],
    })
  }

  /**
   * Check stock availability
   */
  async checkStock(fabricId: string, requiredQuantity: number): Promise<ServiceResult<boolean>> {
    const result = await this.get(fabricId)

    if (!result.success) {
      return result as any
    }

    const available = result.data.stockQuantity >= requiredQuantity

    return {
      success: true,
      data: available,
    }
  }
}

/**
 * Measurement collection helper
 */
export class MeasurementCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("measurements", adapter)
  }

  /**
   * Get client measurements
   */
  async getClientMeasurements(clientId: string, garmentType?: string): Promise<ServiceResult<any>> {
    const queries = [
      Query.equal("clientId", clientId).toString(),
      Query.orderDesc("$createdAt").toString(),
    ]

    if (garmentType) {
      queries.push(Query.equal("garmentType", garmentType).toString())
    }

    return this.adapter.listDocuments(this.collectionId, { queries })
  }

  /**
   * Get default measurement for client
   */
  async getDefaultMeasurement(clientId: string, garmentType: string): Promise<ServiceResult<any>> {
    const result = await this.adapter.listDocuments(this.collectionId, {
      queries: [
        Query.equal("clientId", clientId).toString(),
        Query.equal("garmentType", garmentType).toString(),
        Query.equal("isDefault", true).toString(),
      ],
      limit: 1,
    })

    if (result.success && result.data.documents.length > 0) {
      return {
        success: true,
        data: result.data.documents[0],
      }
    }

    return {
      success: false,
      problem: { kind: "not-found" },
      message: "No default measurement found",
    }
  }
}

/**
 * Appointment collection helper
 */
export class AppointmentCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("appointments", adapter)
  }

  /**
   * Get upcoming appointments
   */
  async getUpcoming(
    userId: string,
    role: "client" | "tailor",
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<any>> {
    const now = new Date().toISOString()
    const userField = role === "client" ? "clientId" : "tailorId"

    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal(userField, userId).toString(),
        Query.greaterThan("scheduledDate", now).toString(),
        Query.notEqual("status", "cancelled").toString(),
        Query.orderAsc("scheduledDate").toString(),
      ],
    })
  }

  /**
   * Check appointment conflicts
   */
  async checkConflicts(
    tailorId: string,
    scheduledDate: string,
    duration: number,
  ): Promise<ServiceResult<boolean>> {
    const startTime = new Date(scheduledDate)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    const result = await this.adapter.listDocuments(this.collectionId, {
      queries: [
        Query.equal("tailorId", tailorId).toString(),
        Query.greaterThan("scheduledDate", startTime.toISOString()).toString(),
        Query.lessThan("scheduledDate", endTime.toISOString()).toString(),
        Query.notEqual("status", "cancelled").toString(),
      ],
    })

    return {
      success: true,
      data: result.success ? result.data.documents.length === 0 : true,
    }
  }
}

/**
 * Notification collection helper
 */
export class NotificationCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("notifications", adapter)
  }

  /**
   * Get unread notifications
   */
  async getUnread(userId: string, params?: DatabaseQueryParams): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("userId", userId).toString(),
        Query.equal("isRead", false).toString(),
        Query.orderDesc("$createdAt").toString(),
      ],
    })
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<ServiceResult<any>> {
    const updates = notificationIds.map((id) => ({
      documentId: id,
      data: { isRead: true, readAt: new Date().toISOString() },
    }))

    return this.adapter.batchUpdateDocuments(this.collectionId, updates)
  }

  /**
   * Send notification
   */
  async send(notificationData: any): Promise<ServiceResult<any>> {
    const data = {
      ...notificationData,
      sentAt: new Date().toISOString(),
    }

    return this.create(data)
  }
}

/**
 * Review collection helper
 */
export class ReviewCollectionHelper extends CollectionHelper<any> {
  constructor(adapter?: AppwriteDatabaseAdapter) {
    super("reviews", adapter)
  }

  /**
   * Get tailor reviews
   */
  async getTailorReviews(
    tailorId: string,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<any>> {
    return this.adapter.listDocuments(this.collectionId, {
      ...params,
      queries: [
        ...(params?.queries || []),
        Query.equal("tailorId", tailorId).toString(),
        Query.equal("isPublic", true).toString(),
        Query.orderDesc("$createdAt").toString(),
      ],
    })
  }

  /**
   * Get average rating for tailor
   */
  async getTailorRating(
    tailorId: string,
  ): Promise<ServiceResult<{ average: number; total: number }>> {
    const result = await this.adapter.listDocuments(this.collectionId, {
      queries: [
        Query.equal("tailorId", tailorId).toString(),
        Query.equal("isPublic", true).toString(),
      ],
    })

    if (!result.success || result.data.documents.length === 0) {
      return {
        success: true,
        data: { average: 0, total: 0 },
      }
    }

    const ratings = result.data.documents.map((doc: any) => doc.rating)
    const average =
      ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length

    return {
      success: true,
      data: {
        average: Math.round(average * 10) / 10,
        total: ratings.length,
      },
    }
  }
}

/**
 * Collection helper factory
 */
export class CollectionHelpers {
  private adapter: AppwriteDatabaseAdapter

  public users: UserCollectionHelper
  public orders: OrderCollectionHelper
  public fabrics: FabricCollectionHelper
  public measurements: MeasurementCollectionHelper
  public appointments: AppointmentCollectionHelper
  public notifications: NotificationCollectionHelper
  public reviews: ReviewCollectionHelper

  constructor(adapter?: AppwriteDatabaseAdapter) {
    this.adapter = adapter || new AppwriteDatabaseAdapter()

    this.users = new UserCollectionHelper(this.adapter)
    this.orders = new OrderCollectionHelper(this.adapter)
    this.fabrics = new FabricCollectionHelper(this.adapter)
    this.measurements = new MeasurementCollectionHelper(this.adapter)
    this.appointments = new AppointmentCollectionHelper(this.adapter)
    this.notifications = new NotificationCollectionHelper(this.adapter)
    this.reviews = new ReviewCollectionHelper(this.adapter)
  }
}

/**
 * Export singleton instance
 */
export const collections = new CollectionHelpers()
