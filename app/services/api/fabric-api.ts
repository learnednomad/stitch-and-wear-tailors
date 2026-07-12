/**
 * Fabric API Service
 *
 * IFabricApiService implementation over the PocketBase `fabrics` collection.
 * Field names follow the PB schema: owner (relation), pricePerMeter,
 * availableQuantity, isActive, category, type, color, pattern, images.
 */

import { ServiceResult } from "./base-api-service"
import { IFabricApiService } from "./service-types"
import { ApiResponse, FabricListParams } from "./api.types"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"

export class FabricApiService implements IFabricApiService {
  private get adapter() {
    return getPocketBaseAdapter()
  }

  async ping(): Promise<ServiceResult<boolean>> {
    return this.adapter.testConnection()
  }

  getStatus() {
    return {
      serviceName: "fabric",
      baseEndpoint: "/fabrics",
      isAuthenticated: !!this.adapter.currentUserId,
      isConfigured: true,
    }
  }

  /**
   * Paginated fabric catalog with filters.
   */
  async getFabrics(params?: FabricListParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const filter = filters.and(
      params?.category ? filters.eq("category", params.category) : "",
      params?.color ? filters.eq("color", params.color) : "",
      params?.priceMin !== undefined ? filters.gte("pricePerMeter", params.priceMin) : "",
      params?.priceMax !== undefined ? filters.lte("pricePerMeter", params.priceMax) : "",
      params?.available ? filters.gt("availableQuantity", 0) : "",
      params?.search ? filters.like("name", params.search) : "",
      filters.eq("isActive", true),
    )

    const result = await this.adapter.list(COLLECTIONS.FABRICS, {
      filter,
      sort: "-created",
      page: params?.page ?? 1,
      perPage: params?.limit ?? 50,
    })
    if (!result.success) return result

    return {
      success: true,
      data: {
        success: true,
        data: result.data.items,
        meta: {
          page: result.data.page,
          totalPages: result.data.totalPages,
          totalItems: result.data.totalItems,
          hasMore: result.data.page < result.data.totalPages,
        },
      },
    }
  }

  /**
   * Single fabric by id.
   */
  async getFabric(fabricId: string): Promise<ServiceResult<any>> {
    if (!fabricId) {
      return { success: false, problem: { kind: "rejected" }, message: "Fabric ID is required" }
    }
    return this.adapter.getOne(COLLECTIONS.FABRICS, fabricId, "owner")
  }

  /**
   * Search fabrics by name/description.
   */
  async searchFabrics(
    query: string,
    params?: FabricListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.getFabrics({ ...params, search: query })
  }

  /**
   * Distinct fabric categories (derived client-side).
   */
  async getCategories(): Promise<ServiceResult<any[]>> {
    const result = await this.adapter.fullList(COLLECTIONS.FABRICS, {
      filter: filters.eq("isActive", true),
    })
    if (!result.success) return result
    const categories = [...new Set(result.data.map((f: any) => f.category).filter(Boolean))]
    return { success: true, data: categories }
  }

  /**
   * Distinct fabric colors (derived client-side).
   */
  async getColors(): Promise<ServiceResult<any[]>> {
    const result = await this.adapter.fullList(COLLECTIONS.FABRICS, {
      filter: filters.eq("isActive", true),
    })
    if (!result.success) return result
    const colors = [...new Set(result.data.map((f: any) => f.color).filter(Boolean))]
    return { success: true, data: colors }
  }

  /**
   * Min/max price range across active fabrics.
   */
  async getPriceRanges(): Promise<ServiceResult<any>> {
    const result = await this.adapter.fullList(COLLECTIONS.FABRICS, {
      filter: filters.eq("isActive", true),
    })
    if (!result.success) return result
    const prices = result.data.map((f: any) => f.pricePerMeter ?? 0)
    return {
      success: true,
      data: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
    }
  }

  /**
   * Stock check against availableQuantity.
   */
  async checkAvailability(
    fabricId: string,
    quantity: number,
  ): Promise<ServiceResult<{ available: boolean; stock: number }>> {
    const result = await this.adapter.getOne<any>(COLLECTIONS.FABRICS, fabricId)
    if (!result.success) return result
    const stock = result.data.availableQuantity ?? 0
    return { success: true, data: { available: stock >= quantity, stock } }
  }

  /**
   * Reservations are not modelled server-side yet.
   */
  async reserveFabric(
    _fabricId: string,
    _quantity: number,
  ): Promise<ServiceResult<{ reservationId: string }>> {
    return {
      success: false,
      problem: { kind: "rejected" },
      message: "Fabric reservations are not supported yet",
    }
  }

  async releaseFabricReservation(_reservationId: string): Promise<ServiceResult<void>> {
    return {
      success: false,
      problem: { kind: "rejected" },
      message: "Fabric reservations are not supported yet",
    }
  }

  /**
   * Newest active fabrics as the featured set.
   */
  async getFeaturedFabrics(): Promise<ServiceResult<any[]>> {
    const result = await this.adapter.list(COLLECTIONS.FABRICS, {
      filter: filters.eq("isActive", true),
      sort: "-created",
      perPage: 10,
    })
    if (!result.success) return result
    return { success: true, data: result.data.items }
  }

  async getRecommendedFabrics(_userId?: string): Promise<ServiceResult<any[]>> {
    return this.getFeaturedFabrics()
  }

  /**
   * Fabrics sharing the category of the given fabric.
   */
  async getSimilarFabrics(fabricId: string): Promise<ServiceResult<any[]>> {
    const fabric = await this.adapter.getOne<any>(COLLECTIONS.FABRICS, fabricId)
    if (!fabric.success) return fabric
    const result = await this.adapter.list(COLLECTIONS.FABRICS, {
      filter: filters.and(
        filters.eq("category", fabric.data.category),
        filters.neq("id", fabricId),
        filters.eq("isActive", true),
      ),
      perPage: 10,
    })
    if (!result.success) return result
    return { success: true, data: result.data.items }
  }
}
