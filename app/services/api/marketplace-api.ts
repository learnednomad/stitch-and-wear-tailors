/**
 * Marketplace API Service
 *
 * ServiceResult layer over the PocketBase `products` and `marketplace_orders`
 * collections. Buyers browse active products and place orders; there is no
 * payment gateway, so an order is created in `pending_payment` carrying the
 * buyer's chosen payment method + reference for the seller to confirm.
 */

import { ServiceResult } from "./base-api-service"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"

export type ProductCategory =
  | "menswear"
  | "womenswear"
  | "childrenswear"
  | "accessories"
  | "footwear"
  | "fabric"
  | "other"

export interface PBProductRecord {
  id: string
  seller: string
  name: string
  description: string
  category: ProductCategory
  price: number
  currency: string
  stock: number
  images: string[] | null
  tags: string[] | null
  isActive: boolean
  created: string
  updated: string
  expand?: {
    seller?: Record<string, any>
  }
}

export type MarketplaceOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type MarketplacePaymentMethod = "bank_transfer" | "cash" | "pos" | "other"

export interface MarketplaceOrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface PBMarketplaceOrderRecord {
  id: string
  buyer: string
  seller: string
  orderNumber: string
  items: MarketplaceOrderItem[] | null
  subtotal: number
  currency: string
  contactName: string
  contactPhone: string
  shippingAddress: string
  status: MarketplaceOrderStatus
  paymentMethod: MarketplacePaymentMethod
  paymentReference: string
  notes: string
  created: string
  updated: string
  expand?: {
    buyer?: Record<string, any>
    seller?: Record<string, any>
  }
}

export interface ProductListParams {
  search?: string
  category?: ProductCategory
  sellerId?: string
}

export interface SellerProductInput {
  name: string
  description?: string
  category: ProductCategory
  price: number
  stock: number
  currency?: string
  isActive?: boolean
  /** local file URIs (from the image picker) to upload as the images field */
  imageUris?: string[]
}

/**
 * Build a multipart FormData body carrying the record fields plus picked
 * image files, so PocketBase stores them on the `images` file field. Sending
 * `images` on update replaces the existing files.
 */
function toProductFormData(
  fields: Record<string, string | number | boolean | undefined>,
  imageUris: string[],
): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    form.append(key, typeof value === "string" ? value : String(value))
  }
  imageUris.forEach((uri, index) => {
    const filename = uri.split("/").pop() || `product-${index}.jpg`
    const ext = filename.split(".").pop()?.toLowerCase()
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
    form.append("images", { uri, name: filename, type } as any)
  })
  return form
}

export interface PlaceOrderInput {
  items: MarketplaceOrderItem[]
  sellerId: string
  contactName: string
  contactPhone: string
  shippingAddress: string
  paymentMethod: MarketplacePaymentMethod
  paymentReference?: string
  currency?: string
  notes?: string
}

/** Sum of item price × quantity. */
export function cartSubtotal(items: MarketplaceOrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0)
}

export const productApi = {
  /**
   * Active products, newest first, optionally filtered by search/category/seller.
   */
  async list(params: ProductListParams = {}): Promise<ServiceResult<PBProductRecord[]>> {
    return getPocketBaseAdapter().fullList<PBProductRecord>(COLLECTIONS.PRODUCTS, {
      filter: filters.and(
        filters.eq("isActive", true),
        params.category ? filters.eq("category", params.category) : "",
        params.sellerId ? filters.eq("seller", params.sellerId) : "",
        params.search
          ? filters.or(
              filters.like("name", params.search),
              filters.like("description", params.search),
            )
          : "",
      ),
      sort: "-created",
      expand: "seller",
    })
  },

  /**
   * Single product with its seller expanded.
   */
  async getOne(productId: string): Promise<ServiceResult<PBProductRecord>> {
    return getPocketBaseAdapter().getOne<PBProductRecord>(
      COLLECTIONS.PRODUCTS,
      productId,
      "seller",
    )
  },

  /**
   * The current seller's own listings (active and inactive), newest first.
   */
  async listMine(): Promise<ServiceResult<PBProductRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBProductRecord>(COLLECTIONS.PRODUCTS, {
      filter: filters.eq("seller", adapter.currentUserId),
      sort: "-created",
    })
  },

  /**
   * Create a listing owned by the current seller. Defaults to active.
   */
  async create(input: SellerProductInput): Promise<ServiceResult<PBProductRecord>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to create a product",
      }
    }
    const fields = {
      seller: adapter.currentUserId,
      name: input.name,
      category: input.category,
      price: input.price,
      stock: input.stock,
      currency: input.currency ?? "NGN",
      isActive: input.isActive ?? true,
      ...(input.description ? { description: input.description } : {}),
    }
    const body = input.imageUris?.length ? toProductFormData(fields, input.imageUris) : fields
    return adapter.create<PBProductRecord>(COLLECTIONS.PRODUCTS, body)
  },

  /**
   * Update one of the current seller's listings. Passing imageUris replaces
   * the product's existing images; omit them to keep the current images.
   */
  async update(
    productId: string,
    input: Partial<SellerProductInput>,
  ): Promise<ServiceResult<PBProductRecord>> {
    const { imageUris, ...fields } = input
    const body = imageUris?.length ? toProductFormData(fields, imageUris) : fields
    return getPocketBaseAdapter().update<PBProductRecord>(COLLECTIONS.PRODUCTS, productId, body)
  },

  /**
   * Delete one of the current seller's listings.
   */
  async remove(productId: string): Promise<ServiceResult<void>> {
    return getPocketBaseAdapter().remove(COLLECTIONS.PRODUCTS, productId)
  },
}

export const marketplaceOrderApi = {
  /**
   * Orders the current user has placed as a buyer, newest first.
   */
  async listMyPurchases(): Promise<ServiceResult<PBMarketplaceOrderRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBMarketplaceOrderRecord>(COLLECTIONS.MARKETPLACE_ORDERS, {
      filter: filters.eq("buyer", adapter.currentUserId),
      sort: "-created",
      expand: "seller",
    })
  },

  /**
   * Single marketplace order.
   */
  async getOne(orderId: string): Promise<ServiceResult<PBMarketplaceOrderRecord>> {
    return getPocketBaseAdapter().getOne<PBMarketplaceOrderRecord>(
      COLLECTIONS.MARKETPLACE_ORDERS,
      orderId,
      "seller,buyer",
    )
  },

  /**
   * Derive the next order number (MKT-<year>-<seq>). Sequence resets yearly.
   */
  async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const result = await getPocketBaseAdapter().list<PBMarketplaceOrderRecord>(
      COLLECTIONS.MARKETPLACE_ORDERS,
      { sort: "-created", perPage: 1 },
    )
    let seq = 1
    if (result.success && result.data.items[0]) {
      const match = /^MKT-(\d{4})-(\d+)$/.exec(result.data.items[0].orderNumber ?? "")
      if (match && Number(match[1]) === year) {
        seq = Number(match[2]) + 1
      }
    }
    return `MKT-${year}-${String(seq).padStart(5, "0")}`
  },

  /**
   * Place an order from the cart. Created as `pending_payment`; the seller
   * confirms receipt of the (offline) payment afterwards. On an orderNumber
   * uniqueness collision the create is retried once with a random suffix.
   */
  async placeOrder(input: PlaceOrderInput): Promise<ServiceResult<PBMarketplaceOrderRecord>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to place an order",
      }
    }

    const buildBody = (orderNumber: string) => ({
      buyer: adapter.currentUserId,
      seller: input.sellerId,
      orderNumber,
      items: input.items,
      subtotal: cartSubtotal(input.items),
      currency: input.currency ?? "NGN",
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      shippingAddress: input.shippingAddress,
      status: "pending_payment" as const,
      paymentMethod: input.paymentMethod,
      ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    })

    const orderNumber = await this.nextOrderNumber()
    const result = await adapter.create<PBMarketplaceOrderRecord>(
      COLLECTIONS.MARKETPLACE_ORDERS,
      buildBody(orderNumber),
    )
    if (result.success) return result

    if (result.message?.toLowerCase().includes("ordernumber")) {
      const random = String(Math.floor(Math.random() * 90000) + 10000)
      return adapter.create<PBMarketplaceOrderRecord>(
        COLLECTIONS.MARKETPLACE_ORDERS,
        buildBody(`MKT-${new Date().getFullYear()}-${random}`),
      )
    }
    return result
  },

  /**
   * Buyer cancels a not-yet-shipped order.
   */
  async cancel(orderId: string): Promise<ServiceResult<PBMarketplaceOrderRecord>> {
    return getPocketBaseAdapter().update<PBMarketplaceOrderRecord>(
      COLLECTIONS.MARKETPLACE_ORDERS,
      orderId,
      { status: "cancelled" },
    )
  },
}

export type ProductApi = typeof productApi
export type MarketplaceOrderApi = typeof marketplaceOrderApi
