/**
 * Fabric API Service
 *
 * Handles all fabric catalog API operations including browsing, searching,
 * inventory management, and recommendations following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IFabricApiService } from "./service-types"
import { FabricListParams, ApiResponse } from "./api.types"
import { getAppwriteAdapter, AppwriteApiAdapter } from "./appwrite-api-adapter"
import { COLLECTION_IDS } from "../appwrite/appwrite-client"
import { Query } from "appwrite"

/**
 * FabricAPI Service Implementation
 *
 * Provides comprehensive fabric catalog functionality:
 * - Fabric browsing and search
 * - Categories and filtering
 * - Availability checking and reservations
 * - Recommendations and featured fabrics
 */
export class FabricApiService extends BaseApiService implements IFabricApiService {
  private appwriteAdapter: AppwriteApiAdapter

  constructor(api: any, authProvider?: any) {
    super(api, authProvider, "/fabrics")
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
      serviceName: "fabric",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Get fabrics with filtering and pagination
   */
  async getFabrics(params?: FabricListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const queryOptions = {
      queries: [],
      limit: params?.limit || 50,
      offset: params?.offset || 0,
    }

    // Add filters
    if (params?.category) {
      queryOptions.queries.push(Query.equal("category", params.category))
    }
    if (params?.type) {
      queryOptions.queries.push(Query.equal("type", params.type))
    }
    if (params?.color) {
      queryOptions.queries.push(Query.equal("color", params.color))
    }
    if (params?.minPrice) {
      queryOptions.queries.push(Query.greaterThanEqual("pricePerMeter", params.minPrice))
    }
    if (params?.maxPrice) {
      queryOptions.queries.push(Query.lessThanEqual("pricePerMeter", params.maxPrice))
    }
    if (params?.inStock !== undefined) {
      queryOptions.queries.push(Query.equal("inStock", params.inStock))
    }

    // Add pagination
    queryOptions.queries.push(Query.limit(queryOptions.limit))
    if (queryOptions.offset) {
      queryOptions.queries.push(Query.offset(queryOptions.offset))
    }

    // Add ordering
    queryOptions.queries.push(Query.orderDesc("createdAt"))

    const result = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.FABRICS, queryOptions)

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to get fabrics",
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
   * Get fabric by ID
   */
  async getFabric(fabricId: string): Promise<ServiceResult<any>> {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    const result = await this.appwriteAdapter.getDocument(COLLECTION_IDS.FABRICS, fabricId)

    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to get fabric",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Search fabrics by query with filters
   */
  async searchFabrics(
    query: string,
    params?: FabricListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Search query is required",
      }
    }

    const searchParams = {
      ...params,
      search: query.trim(),
    }

    return this.getFabrics(searchParams)
  }

  /**
   * Get fabric categories
   */
  async getCategories(): Promise<ServiceResult<any[]>> {
    return this.get<any[]>("/categories")
  }

  /**
   * Get available fabric colors
   */
  async getColors(): Promise<ServiceResult<any[]>> {
    return this.get<any[]>("/colors")
  }

  /**
   * Get fabric price ranges for filtering
   */
  async getPriceRanges(): Promise<ServiceResult<any>> {
    return this.get<any>("/price-ranges")
  }

  /**
   * Check fabric availability and stock
   */
  async checkAvailability(
    fabricId: string,
    quantity: number,
  ): Promise<ServiceResult<{ available: boolean; stock: number }>> {
    if (!fabricId || !quantity || quantity <= 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Valid fabric ID and quantity are required",
      }
    }

    return this.get<{ available: boolean; stock: number }>(`/${fabricId}/availability`, {
      quantity,
    })
  }

  /**
   * Reserve fabric for a limited time
   */
  async reserveFabric(
    fabricId: string,
    quantity: number,
  ): Promise<ServiceResult<{ reservationId: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!fabricId || !quantity || quantity <= 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Valid fabric ID and quantity are required",
      }
    }

    return this.post<{ reservationId: string }>(`/${fabricId}/reserve`, { quantity })
  }

  /**
   * Release fabric reservation
   */
  async releaseFabricReservation(reservationId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!reservationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Reservation ID is required",
      }
    }

    return this.delete<void>(`/reservations/${reservationId}`)
  }

  /**
   * Get featured fabrics
   */
  async getFeaturedFabrics(): Promise<ServiceResult<any[]>> {
    return this.get<any[]>("/featured")
  }

  /**
   * Get recommended fabrics for user
   */
  async getRecommendedFabrics(userId?: string): Promise<ServiceResult<any[]>> {
    if (userId) {
      return this.get<any[]>("/recommendations", { userId })
    } else {
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      return this.get<any[]>("/recommendations")
    }
  }

  /**
   * Get similar fabrics based on a fabric
   */
  async getSimilarFabrics(fabricId: string): Promise<ServiceResult<any[]>> {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.get<any[]>(`/${fabricId}/similar`)
  }

  /**
   * Get fabric care instructions
   */
  async getFabricCareInstructions(fabricId: string): Promise<
    ServiceResult<{
      washing: string[]
      drying: string[]
      ironing: string[]
      storage: string[]
      warnings: string[]
    }>
  > {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.get<any>(`/${fabricId}/care-instructions`)
  }

  /**
   * Get fabric compatibility with garment types
   */
  async getFabricCompatibility(fabricId: string): Promise<
    ServiceResult<{
      suitableFor: string[]
      notSuitableFor: string[]
      recommendations: string[]
    }>
  > {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.get<any>(`/${fabricId}/compatibility`)
  }

  /**
   * Add fabric to favorites
   */
  async addToFavorites(fabricId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.post<void>(`/${fabricId}/favorite`)
  }

  /**
   * Remove fabric from favorites
   */
  async removeFromFavorites(fabricId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.delete<void>(`/${fabricId}/favorite`)
  }

  /**
   * Get user's favorite fabrics
   */
  async getFavoriteFabrics(params?: FabricListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.getList<any>("/favorites", params)
  }

  /**
   * Get fabric reviews and ratings
   */
  async getFabricReviews(
    fabricId: string,
    params?: {
      page?: number
      limit?: number
      sortBy?: "newest" | "oldest" | "rating_high" | "rating_low"
    },
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.getList<any>(`/${fabricId}/reviews`, params)
  }

  /**
   * Submit fabric review
   */
  async submitFabricReview(
    fabricId: string,
    review: {
      rating: number
      comment: string
      orderId?: string
      images?: string[]
    },
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!fabricId || !review.rating || review.rating < 1 || review.rating > 5) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Valid fabric ID and rating (1-5) are required",
      }
    }

    return this.post<any>(`/${fabricId}/reviews`, review)
  }

  /**
   * Get fabric pricing tiers
   */
  async getFabricPricing(fabricId: string): Promise<
    ServiceResult<{
      basePrice: number
      quantityTiers: Array<{
        minQuantity: number
        pricePerUnit: number
        discount: number
      }>
      bulkDiscounts: Array<{
        threshold: number
        discountPercent: number
      }>
    }>
  > {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.get<any>(`/${fabricId}/pricing`)
  }

  /**
   * Request fabric sample
   */
  async requestFabricSample(
    fabricId: string,
    sampleData: {
      deliveryAddress: {
        street: string
        city: string
        state: string
        zipCode: string
        country: string
      }
      notes?: string
    },
  ): Promise<ServiceResult<{ sampleRequestId: string; estimatedDelivery: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!fabricId || !sampleData.deliveryAddress) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID and delivery address are required",
      }
    }

    return this.post<{ sampleRequestId: string; estimatedDelivery: string }>(
      `/${fabricId}/sample-request`,
      sampleData,
    )
  }

  /**
   * Get fabric inventory status across locations
   */
  async getFabricInventory(fabricId: string): Promise<
    ServiceResult<
      Array<{
        location: string
        quantity: number
        reserved: number
        available: number
        lastUpdated: string
      }>
    >
  > {
    if (!fabricId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Fabric ID is required",
      }
    }

    return this.get<any[]>(`/${fabricId}/inventory`)
  }

  /**
   * Get fabric analytics for business insights
   */
  async getFabricAnalytics(params?: {
    dateFrom?: string
    dateTo?: string
    category?: string
  }): Promise<
    ServiceResult<{
      mostPopular: any[]
      topRated: any[]
      revenueByCategory: Record<string, number>
      seasonalTrends: any[]
      stockMovement: any[]
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/analytics", params)
  }
}
