/**
 * Catalog API Service
 *
 * Read-only browsing data over PocketBase: catalog styles, fabrics and
 * tailors. Screens call these functions directly (the legacy FabricStore
 * flows still point at unwired /api mock endpoints, so they are bypassed).
 */

import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"
import { ServiceResult } from "./base-api-service"

/**
 * Raw PocketBase record shapes (server is the source of truth).
 */
export interface PBCatalogStyle {
  id: string
  collectionId: string
  collectionName: string
  name: string
  category: string
  gender: "male" | "female" | "unisex"
  description: string
  basePrice: number
  currency: string
  images: string[]
  tags: string[] | null
  isActive: boolean
  created: string
  updated: string
}

export interface PBFabric {
  id: string
  collectionId: string
  collectionName: string
  name: string
  type: string
  color: string
  pattern: string
  pricePerMeter: number
  availableQuantity: number
  supplier: string
  description: string
  owner: string
  images: string[]
  isActive: boolean
  created: string
  updated: string
}

export interface PBTailor {
  id: string
  collectionId: string
  collectionName: string
  firstName: string
  lastName: string
  businessName: string
  location: string
  bio: string
  avatar: string
  userType: string
}

export interface StyleListParams {
  category?: string
  gender?: string
  search?: string
}

export interface FabricSearchParams {
  type?: string
  search?: string
  availableOnly?: boolean
}

export const catalogApi = {
  /**
   * Active catalog styles, optionally filtered by category/gender/name.
   */
  async listStyles(params: StyleListParams = {}): Promise<ServiceResult<PBCatalogStyle[]>> {
    const adapter = getPocketBaseAdapter()
    const filter = filters.and(
      filters.eq("isActive", true),
      params.category ? filters.eq("category", params.category) : "",
      params.gender ? filters.eq("gender", params.gender) : "",
      params.search ? filters.like("name", params.search) : "",
    )
    return adapter.fullList<PBCatalogStyle>(COLLECTIONS.CATALOG_STYLES, {
      filter,
      sort: "name",
    })
  },

  /**
   * Single style by id.
   */
  async getStyle(styleId: string): Promise<ServiceResult<PBCatalogStyle>> {
    return getPocketBaseAdapter().getOne<PBCatalogStyle>(COLLECTIONS.CATALOG_STYLES, styleId)
  },

  /**
   * Active fabrics with search + type filtering (fabrics use `type`,
   * not `category`, in the PB schema).
   */
  async listFabrics(params: FabricSearchParams = {}): Promise<ServiceResult<PBFabric[]>> {
    const adapter = getPocketBaseAdapter()
    const filter = filters.and(
      filters.eq("isActive", true),
      params.type ? filters.eq("type", params.type) : "",
      params.search ? filters.like("name", params.search) : "",
      params.availableOnly ? filters.gt("availableQuantity", 0) : "",
    )
    return adapter.fullList<PBFabric>(COLLECTIONS.FABRICS, {
      filter,
      sort: "name",
    })
  },

  /**
   * All tailor users (listable by any authenticated user).
   */
  async listTailors(): Promise<ServiceResult<PBTailor[]>> {
    return getPocketBaseAdapter().fullList<PBTailor>(COLLECTIONS.USERS, {
      filter: filters.eq("userType", "tailor"),
      sort: "firstName",
    })
  },
}

export type CatalogApi = typeof catalogApi
