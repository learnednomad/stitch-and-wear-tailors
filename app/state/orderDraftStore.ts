/**
 * useOrderDraftStore — Zustand replacement for the OrderStore's client-side
 * order-creation wizard state.
 *
 * Owns ONLY ephemeral wizard/client state (step index, in-progress creation
 * data, the built draft order, and the active UI language). All server data —
 * order lists, single orders, statistics, realtime — moved to React Query
 * (`app/api/orders.ts`). The `getTranslation` lookup moved to the pure
 * `app/i18n/orderTranslations.ts` helper (`t`); only `currentLanguage` stays
 * here as state.
 *
 * Ported verbatim from the MST NigerianOrderStore wizard actions: MST
 * `NigerianOrderModel.create(...)` calls become plain object literals, and the
 * derived `views` become selector helpers exported at the bottom.
 *
 * Not persisted — the wizard is a single-session flow (matches the previous
 * behaviour: the MST draft lived only in the in-memory root snapshot and was
 * cleared on submit).
 */

import { create } from "zustand"
import {
  NigerianGarmentType,
  NigerianCity,
  SupportedLanguage,
  OrderType,
  FabricType,
} from "../types/orders"
import { OrderStatus, OrderPriority } from "../types/orders"
import { nigerianBusinessConfig } from "../i18n/nigerian-languages"
import { t } from "../i18n/orderTranslations"

// --- local pure helpers (kept MST-free) --------------------------------------

const createTimestamp = (): string => new Date().toISOString()

const generateId = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

/**
 * Garment pricing configs keyed loosely — not every NigerianGarmentType has an
 * entry, so index through a safe record type with an undefined fallback
 * (mirrors the MST store).
 */
const garmentConfigs: Record<
  string,
  { basePrice: number; complexityLevel: number; estimatedDays: number } | undefined
> = nigerianBusinessConfig.traditionalGarments

// --- wizard data shapes (mirror the MST OrderCreationData model) -------------

export interface DraftCustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: NigerianCity
  preferredLanguage: SupportedLanguage
}

export interface DraftFabricSelection {
  type: FabricType
  color: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface DraftStyleConfig {
  garmentType: NigerianGarmentType
  fitPreference: "slim" | "regular" | "loose"
  designNotes: string | null
  culturalSpecifications: string | null
}

export interface OrderCreationData {
  customerInfo: DraftCustomerInfo | null
  measurementId: string | null
  fabricSelection: DraftFabricSelection | null
  styleConfig: DraftStyleConfig | null
  orderType: OrderType
  priority: OrderPriority
}

export interface DraftPricing {
  basePrice: number
  fabricCost: number
  complexityMultiplier: number
  urgencyFee: number
  totalPrice: number
  depositRequired: number
  balanceAmount: number
  currency: "NGN"
  city?: NigerianCity
}

export interface DraftOrderItem {
  id: string
  garmentType: NigerianGarmentType
  fabricType: FabricType
  fabricColor: string
  fabricQuantity: number
  unitPrice: number
  totalPrice: number
  measurements: Record<string, number>
  customizations: Record<string, string>
  culturalSpecifications: string | null
  notes: string | null
  status: string
  estimatedDays: number
  actualDays: number | null
  tailorId: string | null
  qualityScore: number | null
  createdAt: string
  updatedAt: string
}

/**
 * The built draft order (a NigerianOrderModel snapshot shape). Kept loose on
 * the deeper nested fields to match the plain-object port.
 */
export interface DraftOrder {
  id: string
  orderNumber: string
  userId: string
  tailorId: string | null
  locationId: string
  type: OrderType
  garmentType: NigerianGarmentType
  city: NigerianCity
  customerLanguage: SupportedLanguage
  items: DraftOrderItem[]
  status: OrderStatus
  priority: OrderPriority
  customerInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
  }
  measurementId: string | null
  fabricSelection: {
    type: FabricType
    color: string
    pattern: string | null
    quantity: number
    unitPrice: number
    totalPrice: number
    supplier: string | null
    inStock: boolean
  }
  styleConfig: {
    designNotes: string | null
    embellishments: string[]
    fitPreference: "slim" | "regular" | "loose"
    necklineStyle: string | null
    sleeveStyle: string | null
    hemStyle: string | null
    culturalSpecifications: string | null
  }
  pricing: DraftPricing
  paymentMethod: string
  orderDate: string
  estimatedDeliveryDate: string
  actualDeliveryDate: string | null
  notes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderDraftState {
  // State
  currentLanguage: SupportedLanguage
  orderCreationStep: number // 0-5
  orderCreationData: OrderCreationData | null
  draftOrder: DraftOrder | null

  // Language
  setLanguage: (language: SupportedLanguage) => void

  // Wizard navigation
  startOrderCreation: () => void
  nextCreationStep: () => void
  previousCreationStep: () => void
  setOrderCreationStep: (step: number) => void

  // Wizard data setters
  setOrderCustomerInfo: (customerInfo: DraftCustomerInfo) => void
  setOrderMeasurement: (measurementId: string) => void
  setOrderFabricSelection: (fabricSelection: {
    type: FabricType
    color: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }) => void
  setOrderStyleConfig: (styleConfig: any) => void
  setOrderPriority: (priority: OrderPriority) => void
  startReorderFrom: (order: any) => void

  // Pricing (reads current creation data)
  calculateNigerianPricing: (
    garmentType: NigerianGarmentType,
    city: NigerianCity,
    isRush?: boolean,
  ) => DraftPricing

  // Draft order lifecycle
  createNigerianDraftOrder: () => void
  addNigerianItemToDraft: (itemData: {
    garmentType: NigerianGarmentType
    fabricType: FabricType
    fabricColor: string
    fabricQuantity: number
    unitPrice: number
    measurements: Record<string, number>
    culturalSpecifications?: string
    notes?: string
  }) => void
  updateNigerianDraftItem: (itemId: string, updates: Partial<DraftOrderItem>) => void
  removeDraftItem: (itemId: string) => void
  clearDraftOrder: () => void

  // Translation (pure lookup against current language)
  getTranslation: (key: string, subKey: string) => string
}

export const useOrderDraftStore = create<OrderDraftState>()((set, get) => ({
  currentLanguage: "en",
  orderCreationStep: 0,
  orderCreationData: null,
  draftOrder: null,

  setLanguage: (language) => set({ currentLanguage: language }),

  startOrderCreation: () =>
    set({
      orderCreationStep: 0,
      orderCreationData: {
        customerInfo: null,
        measurementId: null,
        fabricSelection: null,
        styleConfig: null,
        orderType: "custom",
        priority: "normal",
      },
    }),

  nextCreationStep: () =>
    set((s) => (s.orderCreationStep < 5 ? { orderCreationStep: s.orderCreationStep + 1 } : {})),

  previousCreationStep: () =>
    set((s) => (s.orderCreationStep > 0 ? { orderCreationStep: s.orderCreationStep - 1 } : {})),

  setOrderCreationStep: (step) => set({ orderCreationStep: step }),

  setOrderCustomerInfo: (customerInfo) => {
    const data = get().orderCreationData
    if (!data) return
    set({ orderCreationData: { ...data, customerInfo } })
  },

  setOrderMeasurement: (measurementId) => {
    const data = get().orderCreationData
    if (!data) return
    set({ orderCreationData: { ...data, measurementId } })
  },

  setOrderFabricSelection: (fabricSelection) => {
    const data = get().orderCreationData
    if (!data) return
    set({
      orderCreationData: {
        ...data,
        fabricSelection: {
          type: fabricSelection.type,
          color: fabricSelection.color,
          quantity: fabricSelection.quantity,
          unitPrice: fabricSelection.unitPrice,
          totalPrice: fabricSelection.totalPrice,
        },
      },
    })
  },

  setOrderStyleConfig: (styleConfig) => {
    const data = get().orderCreationData
    if (!data) return
    // Only the fields the creation-data model knows about (parity with MST)
    set({
      orderCreationData: {
        ...data,
        styleConfig: {
          garmentType: styleConfig.garmentType,
          fitPreference: styleConfig.fitPreference,
          designNotes: styleConfig.designNotes ?? null,
          culturalSpecifications: styleConfig.culturalSpecifications ?? null,
        },
      },
    })
  },

  setOrderPriority: (priority) => {
    const data = get().orderCreationData
    if (!data) return
    set({ orderCreationData: { ...data, priority } })
  },

  /**
   * Hydrate the wizard from a past order (reorder). Accepts a mapped domain
   * order (React Query `useOrder` result) and pre-fills the creation data.
   */
  startReorderFrom: (order) =>
    set({
      orderCreationStep: 0,
      orderCreationData: {
        customerInfo: order?.customerInfo
          ? {
              firstName: order.customerInfo.firstName ?? "",
              lastName: order.customerInfo.lastName ?? "",
              email: order.customerInfo.email ?? "",
              phone: order.customerInfo.phone ?? "",
              address: order.customerInfo.address ?? "",
              city: order.city ?? "lagos",
              preferredLanguage: order.customerLanguage ?? "en",
            }
          : null,
        measurementId: order?.measurementId ?? null,
        fabricSelection: order?.fabricSelection
          ? {
              type: order.fabricSelection.type ?? "ankara",
              color: order.fabricSelection.color ?? "",
              quantity: order.fabricSelection.quantity ?? 0,
              unitPrice: order.fabricSelection.unitPrice ?? 0,
              totalPrice: order.fabricSelection.totalPrice ?? 0,
            }
          : null,
        styleConfig: order?.styleConfig
          ? {
              garmentType: order.garmentType ?? "custom",
              fitPreference: order.styleConfig.fitPreference ?? "regular",
              designNotes: order.styleConfig.designNotes ?? null,
              culturalSpecifications: order.styleConfig.culturalSpecifications ?? null,
            }
          : null,
        orderType: order?.type ?? "custom",
        priority: order?.priority ?? "normal",
      },
    }),

  /**
   * Calculate Nigerian pricing based on city and garment type. Reads the
   * current fabric selection total off creation data (parity with MST).
   */
  calculateNigerianPricing: (garmentType, city, isRush = false) => {
    const garmentConfig = garmentConfigs[garmentType] ?? {
      basePrice: 20000,
      complexityLevel: 2,
      estimatedDays: 7,
    }
    const cityConfig = nigerianBusinessConfig.cities[city] ?? nigerianBusinessConfig.cities.lagos

    const basePrice = garmentConfig.basePrice
    const fabricCost = get().orderCreationData?.fabricSelection?.totalPrice || 0
    const complexityMultiplier = garmentConfig.complexityLevel * 0.2 + 1
    const urgencyFee = isRush ? basePrice * (cityConfig.rushFeeMultiplier - 1) : 0
    const totalPrice = (basePrice + fabricCost) * complexityMultiplier + urgencyFee
    const depositRequired = totalPrice * 0.5
    const balanceAmount = totalPrice - depositRequired

    return {
      basePrice,
      fabricCost,
      complexityMultiplier,
      urgencyFee,
      totalPrice,
      depositRequired,
      balanceAmount,
      currency: "NGN",
      city,
    }
  },

  createNigerianDraftOrder: () => {
    const data = get().orderCreationData
    if (!data?.customerInfo || !data?.styleConfig) {
      throw new Error("Customer info and style config are required")
    }

    const orderNumber = `NGR-${Date.now().toString(36).toUpperCase()}`
    const garmentType = data.styleConfig.garmentType as NigerianGarmentType
    const city = data.customerInfo.city as NigerianCity
    const isRush = data.priority === "urgent"

    const pricing = get().calculateNigerianPricing(garmentType, city, isRush)

    const garmentConfig = garmentConfigs[garmentType]
    const estimatedDays = garmentConfig?.estimatedDays || 7
    const rushMultiplier = isRush ? 0.5 : 1
    const actualDays = Math.ceil(estimatedDays * rushMultiplier)
    const estimatedDeliveryDate = new Date(
      Date.now() + actualDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    const draftOrder: DraftOrder = {
      id: generateId(),
      orderNumber,
      userId: generateId(), // overwritten server-side by the authed user
      tailorId: null,
      locationId: generateId(),
      type: data.orderType,
      garmentType,
      city,
      customerLanguage: data.customerInfo.preferredLanguage,
      items: [],
      status: "pending",
      priority: data.priority,
      customerInfo: {
        firstName: data.customerInfo.firstName,
        lastName: data.customerInfo.lastName,
        email: data.customerInfo.email,
        phone: data.customerInfo.phone,
        address: data.customerInfo.address,
      },
      measurementId: data.measurementId,
      fabricSelection: {
        type: data.fabricSelection?.type || "cotton",
        color: data.fabricSelection?.color || "white",
        pattern: null,
        quantity: data.fabricSelection?.quantity || 3,
        unitPrice: data.fabricSelection?.unitPrice || 1000,
        totalPrice: data.fabricSelection?.totalPrice || 3000,
        supplier: null,
        inStock: true,
      },
      styleConfig: {
        designNotes: data.styleConfig.designNotes,
        embellishments: [],
        fitPreference: data.styleConfig.fitPreference,
        necklineStyle: null,
        sleeveStyle: null,
        hemStyle: null,
        culturalSpecifications: data.styleConfig.culturalSpecifications,
      },
      pricing,
      paymentMethod: "bank_transfer",
      orderDate: createTimestamp(),
      estimatedDeliveryDate,
      actualDeliveryDate: null,
      notes: null,
      internalNotes: null,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    }

    set({ draftOrder })
  },

  addNigerianItemToDraft: (itemData) => {
    const draft = get().draftOrder
    if (!draft) return

    const item: DraftOrderItem = {
      id: generateId(),
      garmentType: itemData.garmentType,
      fabricType: itemData.fabricType,
      fabricColor: itemData.fabricColor,
      fabricQuantity: itemData.fabricQuantity,
      unitPrice: itemData.unitPrice,
      totalPrice: itemData.unitPrice * itemData.fabricQuantity,
      measurements: itemData.measurements,
      customizations: {},
      culturalSpecifications: itemData.culturalSpecifications || null,
      notes: itemData.notes || null,
      status: "received",
      estimatedDays: garmentConfigs[itemData.garmentType]?.estimatedDays || 7,
      actualDays: null,
      tailorId: null,
      qualityScore: null,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    }

    set({ draftOrder: { ...draft, items: [...draft.items, item] } })
  },

  updateNigerianDraftItem: (itemId, updates) => {
    const draft = get().draftOrder
    if (!draft) return
    set({
      draftOrder: {
        ...draft,
        items: draft.items.map((i) =>
          i.id === itemId ? { ...i, ...updates, updatedAt: createTimestamp() } : i,
        ),
      },
    })
  },

  removeDraftItem: (itemId) => {
    const draft = get().draftOrder
    if (!draft) return
    const items = draft.items.filter((i) => i.id !== itemId)
    if (items.length === draft.items.length) return

    // Keep pricing totals in sync with the remaining items (parity with the
    // MST `recalculateDraftTotals`).
    const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalPrice =
      (draft.pricing.basePrice + itemsTotal) * draft.pricing.complexityMultiplier +
      draft.pricing.urgencyFee
    const depositRequired = totalPrice * 0.5
    set({
      draftOrder: {
        ...draft,
        items,
        pricing: {
          ...draft.pricing,
          fabricCost: itemsTotal,
          totalPrice,
          depositRequired,
          balanceAmount: totalPrice - depositRequired,
        },
      },
    })
  },

  clearDraftOrder: () =>
    set({ draftOrder: null, orderCreationData: null, orderCreationStep: 0 }),

  getTranslation: (key, subKey) => t(key, subKey, get().currentLanguage),
}))

/* ------------------------------------------------------------------ *
 * Selector helpers — replace the MST derived `views`. Use as
 *   useOrderDraftStore(selectIsNigerianDraftOrderValid)
 * or off-hook via useOrderDraftStore.getState() with the pure helpers.
 * ------------------------------------------------------------------ */

export const selectIsNigerianDraftOrderValid = (s: OrderDraftState): boolean => {
  const draft = s.draftOrder
  if (!draft) return false
  return (
    draft.customerInfo.firstName.length > 0 &&
    draft.customerInfo.email.length > 0 &&
    draft.garmentType.length > 0 &&
    draft.pricing.totalPrice > 0
  )
}

export const selectIsOrderCreationComplete = (s: OrderDraftState): boolean => {
  const data = s.orderCreationData
  if (!data) return false
  return (
    data.customerInfo !== null && data.fabricSelection !== null && data.styleConfig !== null
  )
}

/** Localised name of the current wizard step. */
export const selectCurrentCreationStepName = (s: OrderDraftState): string => {
  const steps = [
    t("customerInfo", "en", s.currentLanguage),
    t("measurements", "en", s.currentLanguage),
    t("fabricSelection", "en", s.currentLanguage),
    t("styleSelection", "en", s.currentLanguage),
    t("pricing", "en", s.currentLanguage),
    t("confirmation", "en", s.currentLanguage),
  ]
  return steps[s.orderCreationStep] || "Unknown Step"
}

/* ------------------------------------------------------------------ *
 * Pure Nigerian-business config lookups (were MST views). Not state —
 * exported as plain functions for the wizard step screens.
 * ------------------------------------------------------------------ */

export const getCityConfig = (city: NigerianCity) =>
  nigerianBusinessConfig.cities[city] || nigerianBusinessConfig.cities.lagos

export const getGarmentConfig = (garmentType: NigerianGarmentType) => garmentConfigs[garmentType]
