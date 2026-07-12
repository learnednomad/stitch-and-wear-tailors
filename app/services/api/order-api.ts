/**
 * Order API Service
 *
 * Single data layer for orders on top of PocketBase. Wraps the generic
 * PocketBase adapter with order-specific queries and maps bidirectionally
 * between the server-side schema (orders / order_items / order_stages) and
 * the app's Nigerian domain model (NigerianOrderModel snapshots).
 *
 * Server-side notes:
 * - orderNumber, acceptedAt/completedAt, order_stages records and
 *   depositAmount/balanceAmount/paymentStatus are all server-managed —
 *   never written from the client.
 * - Nigerian-specific fields (garmentType, city, customerInfo, fabric and
 *   style selections, pricing breakdown, paymentMethod) travel inside the
 *   first order_item's `specifications` JSON.
 */

import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"
import { ServiceResult } from "./base-api-service"

/**
 * Raw PocketBase record shapes (loosely typed on purpose — the server is
 * the source of truth, the mapper below normalizes into the domain shape).
 */
export interface PBOrderRecord {
  id: string
  orderNumber: string
  customer: string
  tailor?: string
  status: string
  priority?: string
  orderType?: string
  measurement?: string
  style?: string
  totalAmount?: number
  depositAmount?: number
  balanceAmount?: number
  currency?: string
  estimatedDelivery?: string
  actualDelivery?: string
  specialInstructions?: string
  internalNotes?: string
  cancellationReason?: string
  created: string
  updated: string
  expand?: {
    customer?: Record<string, any>
    tailor?: Record<string, any>
    style?: Record<string, any>
    measurement?: Record<string, any>
  }
}

export interface PBOrderItemRecord {
  id: string
  order: string
  itemType?: string
  quantity?: number
  fabric?: string
  designStyle?: string
  itemPrice?: number
  totalPrice?: number
  specifications?: Record<string, any> | null
  status?: string
  created: string
  updated: string
}

export interface PBOrderStageRecord {
  id: string
  order: string
  status: string
  note?: string
  photo?: string
  changedBy?: string
  created: string
}

/**
 * Query params accepted by fetchOrders.
 */
export interface FetchOrdersParams {
  page?: number
  perPage?: number
  /** domain or PocketBase status value — both are accepted */
  status?: string
  customerId?: string
  tailorId?: string
  /** only orders with no tailor assigned */
  unassigned?: boolean
  /** domain or PocketBase priority value */
  priority?: string
  /** matched against orderNumber */
  search?: string
  dateFrom?: string
  dateTo?: string
}

// ---------------------------------------------------------------------------
// Enum vocabularies (must stay in sync with NigerianOrderModel in
// app/models/stores/OrderStore.ts — every mapped value is validated against
// these lists so NigerianOrderModel.create never throws on server data).
// ---------------------------------------------------------------------------

const DOMAIN_GARMENT_TYPES = [
  "agbada",
  "kaftan",
  "isi_agu",
  "babban_riga",
  "ankara_dress",
  "senator",
  "traditional",
  "modern",
  "custom",
] as const

const DOMAIN_FABRIC_TYPES = [
  "aso_oke",
  "adire",
  "ankara",
  "lace",
  "cotton",
  "silk",
  "linen",
  "brocade",
  "george",
  "custom",
] as const

const DOMAIN_CITIES = ["lagos", "abuja", "kano"] as const
const DOMAIN_LANGUAGES = ["en", "yo", "ha", "ig"] as const
const DOMAIN_ORDER_TYPES = ["custom", "alteration", "repair"] as const
const DOMAIN_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
] as const
const DOMAIN_PRIORITIES = ["low", "normal", "high", "urgent"] as const
const DOMAIN_STAGES = [
  "received",
  "measured",
  "cutting",
  "sewing",
  "finishing",
  "quality_check",
  "completed",
] as const
const DOMAIN_FIT_PREFERENCES = ["slim", "regular", "loose"] as const
const DOMAIN_PAYMENT_METHODS = ["bank_transfer", "mobile_money", "cash", "card", "pos"] as const
const DOMAIN_ITEM_STATUSES = [
  "received",
  "measured",
  "cutting",
  "sewing",
  "finishing",
  "quality_check",
  "completed",
] as const

const PB_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "measuring",
  "cutting",
  "sewing",
  "finishing",
  "ready",
  "delivered",
  "cancelled",
] as const

/** PB order status → domain order status */
const PB_TO_DOMAIN_STATUS: Record<string, (typeof DOMAIN_STATUSES)[number]> = {
  pending: "pending",
  accepted: "confirmed",
  rejected: "cancelled",
  measuring: "in_progress",
  cutting: "in_progress",
  sewing: "in_progress",
  finishing: "in_progress",
  ready: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
}

/** domain order status → PB statuses (for filtering; in_progress fans out) */
const DOMAIN_TO_PB_STATUSES: Record<string, string[]> = {
  pending: ["pending"],
  confirmed: ["accepted"],
  in_progress: ["measuring", "cutting", "sewing", "finishing"],
  ready: ["ready"],
  delivered: ["delivered"],
  cancelled: ["cancelled", "rejected"],
}

/** PB order status → domain progress stage */
const PB_STATUS_TO_STAGE: Record<string, (typeof DOMAIN_STAGES)[number]> = {
  pending: "received",
  accepted: "received",
  rejected: "received",
  measuring: "measured",
  cutting: "cutting",
  sewing: "sewing",
  finishing: "finishing",
  ready: "quality_check",
  delivered: "completed",
  cancelled: "received",
}

/** domain progress stage → completion percentage */
const STAGE_PERCENTAGES: Record<string, number> = {
  received: 0,
  measured: 15,
  cutting: 30,
  sewing: 50,
  finishing: 70,
  quality_check: 85,
  completed: 100,
}

const PB_TO_DOMAIN_PRIORITY: Record<string, (typeof DOMAIN_PRIORITIES)[number]> = {
  normal: "normal",
  express: "high",
  urgent: "urgent",
}

const DOMAIN_TO_PB_PRIORITY: Record<string, string> = {
  low: "normal",
  normal: "normal",
  high: "express",
  urgent: "urgent",
}

const PB_TO_DOMAIN_ORDER_TYPE: Record<string, (typeof DOMAIN_ORDER_TYPES)[number]> = {
  new_clothing: "custom",
  alteration: "alteration",
  repair: "repair",
}

const DOMAIN_TO_PB_ORDER_TYPE: Record<string, string> = {
  custom: "new_clothing",
  alteration: "alteration",
  repair: "repair",
}

const PB_ITEM_STATUS_TO_DOMAIN: Record<string, (typeof DOMAIN_ITEM_STATUSES)[number]> = {
  pending: "received",
  in_progress: "sewing",
  completed: "completed",
}

/**
 * Map a domain status to the single PB status used when writing an update
 * (in_progress collapses to "sewing" as the representative mid-work stage).
 */
export function domainStatusToPB(status: string): string {
  const map: Record<string, string> = {
    pending: "pending",
    confirmed: "accepted",
    in_progress: "sewing",
    ready: "ready",
    delivered: "delivered",
    cancelled: "cancelled",
  }
  return map[status] ?? status
}

/**
 * Validate a value against an enum list, falling back to a safe default.
 */
function pickEnum<T extends string>(value: any, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function asNumber(value: any, fallback: number = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function asString(value: any, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback
}

function asStringOrNull(value: any): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/**
 * Parse the `specifications` JSON off an order_item (PocketBase returns JSON
 * fields already parsed, but guard against strings and nulls).
 */
function parseSpecifications(item?: PBOrderItemRecord | null): Record<string, any> {
  const raw = item?.specifications
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) ?? {}
    } catch {
      return {}
    }
  }
  return typeof raw === "object" ? raw : {}
}

// ---------------------------------------------------------------------------
// PB → domain mapping
// ---------------------------------------------------------------------------

/**
 * Map a PB order_item record to a NigerianOrderItemModel snapshot.
 */
export function mapPBOrderItemToDomain(item: PBOrderItemRecord): Record<string, any> {
  const specs = parseSpecifications(item)
  return {
    id: item.id,
    garmentType: pickEnum(specs.garmentType, DOMAIN_GARMENT_TYPES, "custom"),
    fabricType: pickEnum(
      specs.fabricType ?? specs.fabricSelection?.type,
      DOMAIN_FABRIC_TYPES,
      "ankara",
    ),
    fabricColor: asString(specs.fabricSelection?.color ?? specs.fabricColor),
    fabricQuantity: asNumber(specs.fabricSelection?.quantity ?? specs.fabricQuantity),
    unitPrice: asNumber(item.itemPrice),
    totalPrice: asNumber(item.totalPrice),
    measurements: {},
    customizations: {},
    culturalSpecifications: asStringOrNull(specs.styleConfig?.culturalSpecifications),
    notes: asStringOrNull(item.designStyle),
    status: PB_ITEM_STATUS_TO_DOMAIN[item.status ?? ""] ?? "received",
    estimatedDays: 14,
    actualDays: null,
    tailorId: null,
    qualityScore: null,
    createdAt: item.created,
    updatedAt: item.updated,
  }
}

/**
 * Map a PB order record (+ its order_items and optional order_stages) to a
 * NigerianOrderModel snapshot. Every enum is validated with a safe default
 * so `NigerianOrderModel.create(mapPBOrderToDomain(...))` never throws.
 */
export function mapPBOrderToDomain(
  order: PBOrderRecord,
  items: PBOrderItemRecord[] = [],
  stages: PBOrderStageRecord[] = [],
): Record<string, any> {
  // Nigerian-specific fields live in the first item's specifications JSON
  const specs = parseSpecifications(items[0])

  const status = PB_TO_DOMAIN_STATUS[order.status] ?? "pending"
  const currentStage = PB_STATUS_TO_STAGE[order.status] ?? "received"
  const percentage =
    status === "cancelled" ? 0 : (STAGE_PERCENTAGES[currentStage] ?? 0)

  // Customer info: specifications first, then the expanded customer record
  const expandedCustomer = order.expand?.customer ?? {}
  const specCustomer = typeof specs.customerInfo === "object" && specs.customerInfo ? specs.customerInfo : {}
  const customerInfo = {
    firstName: asString(specCustomer.firstName ?? expandedCustomer.firstName ?? expandedCustomer.name),
    lastName: asString(specCustomer.lastName ?? expandedCustomer.lastName),
    email: asString(specCustomer.email ?? expandedCustomer.email),
    phone: asString(specCustomer.phone ?? expandedCustomer.phone),
    address: asString(specCustomer.address ?? expandedCustomer.location),
  }

  const specFabric = typeof specs.fabricSelection === "object" && specs.fabricSelection ? specs.fabricSelection : {}
  const fabricSelection = {
    type: pickEnum(specFabric.type, DOMAIN_FABRIC_TYPES, "ankara"),
    color: asString(specFabric.color),
    pattern: asStringOrNull(specFabric.pattern),
    quantity: asNumber(specFabric.quantity),
    unitPrice: asNumber(specFabric.unitPrice),
    totalPrice: asNumber(specFabric.totalPrice),
    supplier: asStringOrNull(specFabric.supplier),
    inStock: specFabric.inStock === true,
  }

  const specStyle = typeof specs.styleConfig === "object" && specs.styleConfig ? specs.styleConfig : {}
  const styleConfig = {
    designNotes: asStringOrNull(specStyle.designNotes),
    embellishments: Array.isArray(specStyle.embellishments)
      ? specStyle.embellishments.filter((e: any) => typeof e === "string")
      : [],
    fitPreference: pickEnum(specStyle.fitPreference, DOMAIN_FIT_PREFERENCES, "regular"),
    necklineStyle: asStringOrNull(specStyle.necklineStyle),
    sleeveStyle: asStringOrNull(specStyle.sleeveStyle),
    hemStyle: asStringOrNull(specStyle.hemStyle),
    culturalSpecifications: asStringOrNull(specStyle.culturalSpecifications),
  }

  const totalAmount = asNumber(order.totalAmount)
  const specPricing = typeof specs.pricing === "object" && specs.pricing ? specs.pricing : {}
  const pricing = {
    basePrice: asNumber(specPricing.basePrice, totalAmount),
    fabricCost: asNumber(specPricing.fabricCost, 0),
    complexityMultiplier: asNumber(specPricing.complexityMultiplier, 1),
    urgencyFee: asNumber(specPricing.urgencyFee, 0),
    totalPrice: asNumber(specPricing.totalPrice, totalAmount),
    depositRequired: asNumber(specPricing.depositRequired, asNumber(order.depositAmount)),
    balanceAmount: asNumber(specPricing.balanceAmount, asNumber(order.balanceAmount)),
    currency: "NGN" as const,
  }

  // Fold server-side stage history into the progress model (dedup by stage,
  // keeping the most recent record for each)
  const stageProgress: Record<string, any>[] = []
  for (const stage of stages) {
    const domainStage = PB_STATUS_TO_STAGE[stage.status] ?? "received"
    const entry = {
      stage: domainStage,
      status: "completed",
      startedAt: stage.created,
      completedAt: stage.created,
      tailorId: asStringOrNull(stage.changedBy),
      qualityScore: null,
      notes: asStringOrNull(stage.note),
    }
    const existingIndex = stageProgress.findIndex((s) => s.stage === domainStage)
    if (existingIndex >= 0) {
      stageProgress[existingIndex] = entry
    } else {
      stageProgress.push(entry)
    }
  }

  return {
    id: order.id,
    orderNumber: asString(order.orderNumber),
    userId: asString(order.customer),
    tailorId: asStringOrNull(order.tailor),
    locationId: "main",
    type: PB_TO_DOMAIN_ORDER_TYPE[order.orderType ?? ""] ?? "custom",
    garmentType: pickEnum(specs.garmentType, DOMAIN_GARMENT_TYPES, "traditional"),
    city: pickEnum(specs.city, DOMAIN_CITIES, "lagos"),
    customerLanguage: pickEnum(specs.customerLanguage, DOMAIN_LANGUAGES, "en"),
    items: items.map(mapPBOrderItemToDomain),
    status,
    priority: PB_TO_DOMAIN_PRIORITY[order.priority ?? ""] ?? "normal",
    customerInfo,
    measurementId: asStringOrNull(order.measurement),
    fabricSelection,
    styleConfig,
    pricing,
    paymentMethod: pickEnum(specs.paymentMethod, DOMAIN_PAYMENT_METHODS, "bank_transfer"),
    orderDate: order.created,
    estimatedDeliveryDate: asString(order.estimatedDelivery) || order.created,
    actualDeliveryDate: asStringOrNull(order.actualDelivery),
    progress: {
      currentStage,
      status,
      percentage,
      estimatedCompletion: asStringOrNull(order.estimatedDelivery),
      actualCompletion: asStringOrNull(order.actualDelivery),
      stageProgress,
      lastUpdated: order.updated || order.created,
    },
    notes: asStringOrNull(order.specialInstructions),
    internalNotes: asStringOrNull(order.internalNotes),
    createdAt: order.created,
    updatedAt: order.updated || order.created,
  }
}

// ---------------------------------------------------------------------------
// domain → PB mapping (for order creation)
// ---------------------------------------------------------------------------

/**
 * Map a domain draft order (NigerianOrderModel snapshot) to the PB payloads.
 * Returns the order record body and the single order_item body (without the
 * `order` relation, which is set after the order is created).
 *
 * Server-computed fields (orderNumber, status, depositAmount, balanceAmount,
 * paymentStatus, stamps) are intentionally omitted.
 */
export function mapDomainOrderToPB(draft: Record<string, any>): {
  order: Record<string, any>
  item: Record<string, any>
} {
  const adapter = getPocketBaseAdapter()
  const pricing = draft.pricing ?? {}
  const totalPrice = asNumber(pricing.totalPrice)

  const order: Record<string, any> = {
    customer: adapter.currentUserId,
    orderType: DOMAIN_TO_PB_ORDER_TYPE[draft.type] ?? "new_clothing",
    priority: DOMAIN_TO_PB_PRIORITY[draft.priority] ?? "normal",
    totalAmount: totalPrice,
    currency: "NGN",
    fabricSource: "tailor",
  }
  if (draft.measurementId) order.measurement = draft.measurementId
  if (draft.estimatedDeliveryDate) order.estimatedDelivery = draft.estimatedDeliveryDate
  if (draft.notes) order.specialInstructions = draft.notes

  const item: Record<string, any> = {
    itemType: "traditional",
    quantity: 1,
    itemPrice: totalPrice,
    totalPrice,
    designStyle: draft.styleConfig?.designNotes ?? "",
    specifications: {
      garmentType: draft.garmentType,
      city: draft.city,
      customerLanguage: draft.customerLanguage,
      customerInfo: draft.customerInfo,
      fabricSelection: draft.fabricSelection,
      styleConfig: draft.styleConfig,
      pricing: draft.pricing,
      paymentMethod: draft.paymentMethod,
    },
  }

  return { order, item }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const ORDER_EXPAND = "customer,tailor,style,measurement"

/**
 * Fetch the order_items for a set of orders in a single call, grouped by
 * order id (avoids an N+1 when mapping lists).
 */
async function fetchItemsGrouped(
  orderIds: string[],
): Promise<Record<string, PBOrderItemRecord[]>> {
  if (orderIds.length === 0) return {}
  const adapter = getPocketBaseAdapter()
  const result = await adapter.fullList<PBOrderItemRecord>(COLLECTIONS.ORDER_ITEMS, {
    filter: filters.in("order", orderIds),
    sort: "created",
  })
  const grouped: Record<string, PBOrderItemRecord[]> = {}
  if (result.success) {
    for (const item of result.data) {
      ;(grouped[item.order] ??= []).push(item)
    }
  }
  return grouped
}

/**
 * Build the PB status filter clause from a domain or PB status value.
 */
function statusFilter(status: string): string {
  const pbStatuses = DOMAIN_TO_PB_STATUSES[status]
  if (pbStatuses) return filters.in("status", pbStatuses)
  if ((PB_STATUSES as readonly string[]).includes(status)) return filters.eq("status", status)
  return ""
}

export interface FetchOrdersResult {
  /** NigerianOrderModel snapshots */
  orders: Record<string, any>[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  hasMore: boolean
}

export const orderApi = {
  /**
   * Paginated order list with filters, newest first, mapped to the domain.
   */
  async fetchOrders(params: FetchOrdersParams = {}): Promise<ServiceResult<FetchOrdersResult>> {
    const adapter = getPocketBaseAdapter()

    const filter = filters.and(
      params.customerId ? filters.eq("customer", params.customerId) : "",
      params.tailorId ? filters.eq("tailor", params.tailorId) : "",
      params.unassigned ? filters.eq("tailor", "") : "",
      params.status ? statusFilter(params.status) : "",
      params.priority
        ? filters.eq("priority", DOMAIN_TO_PB_PRIORITY[params.priority] ?? params.priority)
        : "",
      params.search ? filters.like("orderNumber", params.search) : "",
      params.dateFrom ? filters.gte("created", params.dateFrom) : "",
      params.dateTo ? filters.lte("created", params.dateTo) : "",
    )

    const result = await adapter.list<PBOrderRecord>(COLLECTIONS.ORDERS, {
      filter: filter || undefined,
      sort: "-created",
      expand: ORDER_EXPAND,
      page: params.page ?? 1,
      perPage: params.perPage ?? 25,
    })
    if (!result.success) return result

    const itemsByOrder = await fetchItemsGrouped(result.data.items.map((o) => o.id))

    return {
      success: true,
      data: {
        orders: result.data.items.map((order) =>
          mapPBOrderToDomain(order, itemsByOrder[order.id] ?? []),
        ),
        page: result.data.page,
        perPage: result.data.perPage,
        totalItems: result.data.totalItems,
        totalPages: result.data.totalPages,
        hasMore: result.data.page < result.data.totalPages,
      },
    }
  },

  /**
   * Single order with its items and stage history, mapped to the domain.
   */
  async fetchOrder(orderId: string): Promise<ServiceResult<Record<string, any>>> {
    const adapter = getPocketBaseAdapter()

    const orderResult = await adapter.getOne<PBOrderRecord>(
      COLLECTIONS.ORDERS,
      orderId,
      ORDER_EXPAND,
    )
    if (!orderResult.success) return orderResult

    const [itemsResult, stagesResult] = await Promise.all([
      adapter.fullList<PBOrderItemRecord>(COLLECTIONS.ORDER_ITEMS, {
        filter: filters.eq("order", orderId),
        sort: "created",
      }),
      adapter.fullList<PBOrderStageRecord>(COLLECTIONS.ORDER_STAGES, {
        filter: filters.eq("order", orderId),
        sort: "created",
      }),
    ])

    return {
      success: true,
      data: mapPBOrderToDomain(
        orderResult.data,
        itemsResult.success ? itemsResult.data : [],
        stagesResult.success ? stagesResult.data : [],
      ),
    }
  },

  /**
   * Create an order (+ its order_item) from a domain draft snapshot.
   * Returns the created order mapped back to the domain, including the
   * server-generated orderNumber.
   */
  async createOrder(draft: Record<string, any>): Promise<ServiceResult<Record<string, any>>> {
    const adapter = getPocketBaseAdapter()

    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to create an order",
      }
    }

    const { order, item } = mapDomainOrderToPB(draft)

    const orderResult = await adapter.create<PBOrderRecord>(COLLECTIONS.ORDERS, order)
    if (!orderResult.success) return orderResult

    const itemResult = await adapter.create<PBOrderItemRecord>(COLLECTIONS.ORDER_ITEMS, {
      ...item,
      order: orderResult.data.id,
    })
    if (!itemResult.success) {
      if (__DEV__) {
        console.warn("Order created but order_item failed:", itemResult.message)
      }
      return itemResult
    }

    // Re-fetch to pick up server-side fields (orderNumber, stage history)
    return this.fetchOrder(orderResult.data.id)
  },

  /**
   * Update raw PB order fields. Returns the updated order mapped to the
   * domain shape.
   */
  async updateOrder(
    orderId: string,
    updates: Record<string, any>,
  ): Promise<ServiceResult<Record<string, any>>> {
    const adapter = getPocketBaseAdapter()
    const result = await adapter.update<PBOrderRecord>(COLLECTIONS.ORDERS, orderId, updates)
    if (!result.success) return result
    return this.fetchOrder(orderId)
  },

  /**
   * Transition an order to a new PB status. Stage records and timestamp
   * stamping happen in server hooks. A note is only persisted for
   * cancellations (as cancellationReason) in v1.
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string,
  ): Promise<ServiceResult<Record<string, any>>> {
    const updates: Record<string, any> = { status }
    if (status === "cancelled" && note) {
      updates.cancellationReason = note
    }
    return this.updateOrder(orderId, updates)
  },

  /**
   * Cancel an order with a reason.
   */
  async cancelOrder(
    orderId: string,
    reason: string,
  ): Promise<ServiceResult<Record<string, any>>> {
    return this.updateOrderStatus(orderId, "cancelled", reason)
  },

  /**
   * Raw stage history for an order, oldest first.
   */
  async fetchOrderStages(orderId: string): Promise<ServiceResult<PBOrderStageRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBOrderStageRecord>(COLLECTIONS.ORDER_STAGES, {
      filter: filters.eq("order", orderId),
      sort: "created",
    })
  },
}

export type OrderApi = typeof orderApi
