/**
 * Order API Service
 *
 * Handles all order-related API operations including order lifecycle management,
 * pricing calculations, invoicing, and order tracking following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IOrderApiService } from "./service-types"
import { CreateOrderRequest, UpdateOrderRequest, OrderListParams, ApiResponse } from "./api.types"
import { getAppwriteAdapter, AppwriteApiAdapter } from "./appwrite-api-adapter"
import { COLLECTION_IDS } from "../appwrite/appwrite-client"
import { Query } from "appwrite"

/**
 * OrderAPI Service Implementation
 *
 * Provides comprehensive order management functionality:
 * - Order CRUD operations
 * - Order lifecycle management (confirm, start, complete, cancel)
 * - Order tracking and history
 * - Pricing and invoicing
 */
export class OrderApiService extends BaseApiService implements IOrderApiService {
  private appwriteAdapter: AppwriteApiAdapter

  constructor(api: any, authProvider?: any) {
    super(api, authProvider, "/orders")
    this.appwriteAdapter = getAppwriteAdapter()
  }
  /**
   * Service health check
   */
  async ping(): Promise<ServiceResult<boolean>> {
    const result = await this.appwriteAdapter.testConnection()
    if (result.ok) {
      return { success: true, data: result.data?.success || false }
    }
    return {
      success: false,
      problem: { kind: result.problem || "unknown" },
      message: "Appwrite connection failed",
    }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      serviceName: "order",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Validate required fields
    if (!orderData.clientId || !orderData.items || orderData.items.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID and at least one item are required",
      }
    }

    // Validate items
    for (const item of orderData.items) {
      if (!item.fabricId || !item.styleId || !item.quantity || item.quantity <= 0) {
        return {
          success: false,
          problem: { kind: "rejected" },
          message: "Each item must have fabric ID, style ID, and valid quantity",
        }
      }
    }

    // Get current user (tailor creating the order)
    const userResult = await this.appwriteAdapter.getCurrentUser()

    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    // Create order document
    const orderDocument = {
      clientId: orderData.clientId,
      tailorId: userResult.data.$id,
      status: "draft",
      priority: orderData.priority || "medium",
      notes: orderData.notes,
      estimatedCompletion: orderData.estimatedCompletion,
      totalAmount: 0, // Will be calculated after creating order items
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const orderResult = await this.appwriteAdapter.createDocument(
      COLLECTION_IDS.ORDERS,
      orderDocument,
    )

    if (!orderResult.ok) {
      return {
        success: false,
        problem: { kind: orderResult.problem || "unknown" },
        message: "Failed to create order",
      }
    }

    const orderId = orderResult.data.$id
    let totalAmount = 0

    // Create order items
    for (const item of orderData.items) {
      const itemDocument = {
        orderId,
        fabricId: item.fabricId,
        styleId: item.styleId,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.unitPrice || 0) * item.quantity,
        measurements: item.measurements,
        customizations: item.customizations,
        notes: item.notes,
        createdAt: new Date().toISOString(),
      }

      const itemResult = await this.appwriteAdapter.createDocument(
        COLLECTION_IDS.ORDER_ITEMS,
        itemDocument,
      )

      if (!itemResult.ok) {
        console.warn("Failed to create order item:", itemResult.problem)
      } else {
        totalAmount += itemDocument.totalPrice
      }
    }

    // Update order with total amount
    const updateResult = await this.appwriteAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, {
      totalAmount,
      updatedAt: new Date().toISOString(),
    })

    if (!updateResult.ok) {
      console.warn("Failed to update order total:", updateResult.problem)
    }

    return { success: true, data: orderResult.data }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<ServiceResult<any>> {
    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const result = await this.appwriteAdapter.getDocument(COLLECTION_IDS.ORDERS, orderId)

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to get order",
      }
    }

    // Get order items
    const itemsResult = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.ORDER_ITEMS, {
      queries: [Query.equal("orderId", orderId)],
    })

    const orderData = {
      ...result.data,
      items: itemsResult.ok ? itemsResult.data.documents : [],
    }

    return { success: true, data: orderData }
  }

  /**
   * Update order information
   */
  async updateOrder(orderId: string, updates: UpdateOrderRequest): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    const result = await this.appwriteAdapter.updateDocument(
      COLLECTION_IDS.ORDERS,
      orderId,
      updateData,
    )

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to update order",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Delete order (only for draft orders)
   */
  async deleteOrder(orderId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    return this.deleteById<void>(orderId)
  }

  /**
   * Get list of orders with filtering and pagination
   */
  async getOrders(params?: OrderListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const queryOptions = {
      queries: [],
      limit: params?.limit || 50,
      offset: params?.offset || 0,
    }

    // Add filters
    if (params?.status) {
      queryOptions.queries.push(Query.equal("status", params.status))
    }
    if (params?.clientId) {
      queryOptions.queries.push(Query.equal("clientId", params.clientId))
    }
    if (params?.tailorId) {
      queryOptions.queries.push(Query.equal("tailorId", params.tailorId))
    }
    if (params?.priority) {
      queryOptions.queries.push(Query.equal("priority", params.priority))
    }

    // Add date filters if provided
    if (params?.dateFrom) {
      queryOptions.queries.push(Query.greaterThanEqual("createdAt", params.dateFrom))
    }
    if (params?.dateTo) {
      queryOptions.queries.push(Query.lessThanEqual("createdAt", params.dateTo))
    }

    // Add pagination
    queryOptions.queries.push(Query.limit(queryOptions.limit))
    if (queryOptions.offset) {
      queryOptions.queries.push(Query.offset(queryOptions.offset))
    }

    // Add ordering
    queryOptions.queries.push(Query.orderDesc("createdAt"))

    const result = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.ORDERS, queryOptions)

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to get orders",
      }
    }

    const response: ApiResponse<any[]> = {
      data: result.data.documents,
      total: result.data.total,
      page: Math.floor((params?.offset || 0) / (params?.limit || 50)) + 1,
      limit: params?.limit || 50,
      hasMore: (result.data.total || 0) > (params?.offset || 0) + (params?.limit || 50),
    }

    return { success: true, data: response }
  }

  /**
   * Get orders for a specific client
   */
  async getClientOrders(
    clientId: string,
    params?: OrderListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!clientId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID is required",
      }
    }

    const searchParams = {
      ...params,
      clientId,
    }

    return this.getList<any>("/", searchParams)
  }

  /**
   * Get orders assigned to a specific tailor
   */
  async getTailorOrders(
    tailorId: string,
    params?: OrderListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    const searchParams = {
      ...params,
      tailorId,
    }

    return this.getList<any>("/", searchParams)
  }

  /**
   * Confirm order (move from draft to confirmed)
   */
  async confirmOrder(orderId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const result = await this.appwriteAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to confirm order",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Start order (move from confirmed to in progress)
   */
  async startOrder(orderId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const result = await this.appwriteAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, {
      status: "in_progress",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to start order",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Complete order (mark as finished)
   */
  async completeOrder(orderId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const result = await this.appwriteAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to complete order",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Cancel order with reason
   */
  async cancelOrder(orderId: string, reason: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId || !reason) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID and cancellation reason are required",
      }
    }

    const result = await this.appwriteAdapter.updateDocument(COLLECTION_IDS.ORDERS, orderId, {
      status: "cancelled",
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to cancel order",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Get order status history
   */
  async getOrderHistory(orderId: string): Promise<ServiceResult<any[]>> {
    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    return this.get<any[]>(`/${orderId}/history`)
  }

  /**
   * Get order timeline with detailed steps
   */
  async getOrderTimeline(orderId: string): Promise<ServiceResult<any[]>> {
    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    return this.get<any[]>(`/${orderId}/timeline`)
  }

  /**
   * Calculate order price before creation
   */
  async calculateOrderPrice(
    items: any[],
  ): Promise<ServiceResult<{ total: number; breakdown: any[] }>> {
    if (!items || items.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Items are required for price calculation",
      }
    }

    return this.post<{ total: number; breakdown: any[] }>("/calculate-price", { items })
  }

  /**
   * Get order invoice
   */
  async getOrderInvoice(orderId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    return this.get<any>(`/${orderId}/invoice`)
  }

  /**
   * Add progress update to order
   */
  async addProgressUpdate(
    orderId: string,
    update: {
      message: string
      images?: string[]
      estimatedCompletion?: string
    },
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId || !update.message) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID and progress message are required",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()

    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const progressData = {
      orderId,
      message: update.message,
      images: update.images || [],
      estimatedCompletion: update.estimatedCompletion,
      createdBy: userResult.data.$id,
      createdAt: new Date().toISOString(),
    }

    const result = await this.appwriteAdapter.createDocument(
      COLLECTION_IDS.PROGRESS_UPDATES,
      progressData,
    )

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to add progress update",
      }
    }

    // Update order's last activity
    const orderUpdateResult = await this.appwriteAdapter.updateDocument(
      COLLECTION_IDS.ORDERS,
      orderId,
      {
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    )

    if (!orderUpdateResult.ok) {
      console.warn("Failed to update order last activity:", orderUpdateResult.problem)
    }

    return { success: true, data: result.data }
  }

  /**
   * Get order progress updates
   */
  async getOrderProgress(orderId: string): Promise<ServiceResult<any[]>> {
    if (!orderId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID is required",
      }
    }

    const queryOptions = {
      queries: [Query.equal("orderId", orderId), Query.orderDesc("createdAt")],
    }

    const result = await this.appwriteAdapter.listDocuments(
      COLLECTION_IDS.PROGRESS_UPDATES,
      queryOptions,
    )

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to get order progress",
      }
    }

    return { success: true, data: result.data.documents }
  }

  /**
   * Schedule fitting for order
   */
  async scheduleFitting(
    orderId: string,
    fittingData: {
      scheduledDate: string
      duration: number
      location: {
        type: "studio" | "client_home" | "virtual"
        address?: string
        specialInstructions?: string
      }
      notes?: string
    },
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId || !fittingData.scheduledDate) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID and scheduled date are required",
      }
    }

    return this.post<any>(`/${orderId}/fitting`, fittingData)
  }

  /**
   * Update order priority
   */
  async updateOrderPriority(
    orderId: string,
    priority: "low" | "medium" | "high" | "urgent",
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId || !priority) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID and priority level are required",
      }
    }

    return this.patch<any>(`/${orderId}/priority`, { priority })
  }

  /**
   * Assign order to tailor
   */
  async assignOrderToTailor(orderId: string, tailorId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!orderId || !tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Order ID and tailor ID are required",
      }
    }

    return this.patch<any>(`/${orderId}/assign`, { tailorId })
  }

  /**
   * Get order analytics and metrics
   */
  async getOrderAnalytics(params?: {
    dateFrom?: string
    dateTo?: string
    tailorId?: string
    clientId?: string
  }): Promise<
    ServiceResult<{
      totalOrders: number
      completedOrders: number
      averageCompletionTime: number
      revenueGenerated: number
      customerSatisfaction: number
      statusBreakdown: Record<string, number>
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/analytics", params)
  }

  /**
   * Export orders to CSV/PDF
   */
  async exportOrders(params: {
    format: "csv" | "pdf"
    dateFrom?: string
    dateTo?: string
    status?: string
    clientId?: string
    tailorId?: string
  }): Promise<ServiceResult<{ downloadUrl: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!params.format) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Export format is required",
      }
    }

    return this.post<{ downloadUrl: string }>("/export", params)
  }
}
