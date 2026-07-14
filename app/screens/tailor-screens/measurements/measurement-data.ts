/**
 * Tailor measurement data layer
 *
 * Direct PocketBase access for the tailor-side measurement screens. The
 * former MST MeasurementStore was mock machinery hitting a nonexistent
 * /api/measurements REST backend (removed in Phase 4b), so these screens talk
 * to the `measurements` collection directly through the PocketBase adapter.
 * The client side reads the same collection via `useClientMeasurements`
 * (app/api/measurements.ts).
 *
 * Access rules: tailors can VIEW every measurement but can only create/edit
 * their OWN records (user = self) — customer profiles are read-only, the
 * tailor's own records act as house templates.
 */

import { ServiceResult } from "@/services/api/base-api-service"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "@/services/api/pocketbase-api-adapter"
import { orderApi } from "@/services/api/order-api"

export type MeasurementType = "suit" | "shirt" | "trouser" | "dress" | "traditional"
export type MeasurementUnit = "cm" | "inch"

export const MEASUREMENT_TYPES: MeasurementType[] = [
  "suit",
  "shirt",
  "trouser",
  "dress",
  "traditional",
]

export interface PBMeasurementRecord {
  id: string
  user: string
  name: string
  measurementType: MeasurementType
  unit: MeasurementUnit
  chest: number
  waist: number
  hips: number
  shoulderWidth: number
  sleeveLength: number
  armhole: number
  bicep: number
  wrist: number
  neck: number
  backLength: number
  frontLength: number
  inseam: number
  outseam: number
  thigh: number
  knee: number
  ankle: number
  rise: number
  customMeasurements: Record<string, any> | null
  notes: string
  isDefault: boolean
  photos: string[]
  created: string
  updated: string
  expand?: { user?: Record<string, any> }
}

export interface MeasurementFieldDef {
  key: string
  label: string
}

/**
 * The 18 numeric measurement fields, grouped the way the form renders them
 * (mirrors the client measurement flow's grouping/labels).
 */
export const MEASUREMENT_FIELD_GROUPS: { title: string; fields: MeasurementFieldDef[] }[] = [
  {
    title: "Upper Body",
    fields: [
      { key: "neck", label: "Neck" },
      { key: "shoulderWidth", label: "Shoulder Width" },
      { key: "chest", label: "Chest/Bust" },
      { key: "armhole", label: "Armhole" },
      { key: "bicep", label: "Bicep" },
      { key: "sleeveLength", label: "Sleeve Length" },
      { key: "wrist", label: "Wrist" },
    ],
  },
  {
    title: "Lower Body",
    fields: [
      { key: "waist", label: "Waist" },
      { key: "hips", label: "Hips" },
      { key: "rise", label: "Rise" },
      { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" },
      { key: "ankle", label: "Ankle" },
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
    ],
  },
  {
    title: "General",
    fields: [
      { key: "backLength", label: "Back Length" },
      { key: "frontLength", label: "Front Length" },
    ],
  },
]

export interface CustomerProfilesResult {
  measurements: PBMeasurementRecord[]
  /** customer id → display name (from the tailor's orders; users are not readable) */
  customerNames: Record<string, string>
}

export const tailorMeasurementApi = {
  /**
   * Measurement profiles of every customer who has an order with this
   * tailor. Customer display names come from the orders' customerInfo (the
   * users collection is not readable by tailors); expand.user is used when
   * available as a bonus.
   */
  async listCustomerProfiles(): Promise<ServiceResult<CustomerProfilesResult>> {
    const adapter = getPocketBaseAdapter()

    const ordersResult = await orderApi.fetchOrders({
      tailorId: adapter.currentUserId,
      perPage: 100,
    })
    if (!ordersResult.success) return ordersResult

    const customerNames: Record<string, string> = {}
    for (const order of ordersResult.data.orders) {
      const info = order.customerInfo ?? {}
      const name = [info.firstName, info.lastName].filter(Boolean).join(" ").trim()
      if (order.userId && (name || !customerNames[order.userId])) {
        customerNames[order.userId] =
          name || customerNames[order.userId] || `Customer ${order.userId.slice(0, 5)}`
      }
    }

    const customerIds = Object.keys(customerNames).filter(
      (id) => id !== adapter.currentUserId,
    )
    if (customerIds.length === 0) {
      return { success: true, data: { measurements: [], customerNames } }
    }

    const result = await adapter.fullList<PBMeasurementRecord>(COLLECTIONS.MEASUREMENTS, {
      filter: filters.in("user", customerIds),
      sort: "-created",
      expand: "user",
    })
    if (!result.success) return result

    // Prefer an expanded user name when the rules allow it
    for (const record of result.data) {
      const expandedName = record.expand?.user?.name
      if (expandedName) customerNames[record.user] = expandedName
    }

    return { success: true, data: { measurements: result.data, customerNames } }
  },

  /**
   * The tailor's own measurement records (house templates), full CRUD.
   */
  async listMyTemplates(): Promise<ServiceResult<PBMeasurementRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBMeasurementRecord>(COLLECTIONS.MEASUREMENTS, {
      filter: filters.eq("user", adapter.currentUserId),
      sort: "-created",
    })
  },

  /**
   * Single measurement by id.
   */
  async getOne(measurementId: string): Promise<ServiceResult<PBMeasurementRecord>> {
    return getPocketBaseAdapter().getOne<PBMeasurementRecord>(
      COLLECTIONS.MEASUREMENTS,
      measurementId,
      "user",
    )
  },

  /**
   * Create a template owned by the current tailor (rules require user = self).
   */
  async create(data: Record<string, any>): Promise<ServiceResult<PBMeasurementRecord>> {
    const adapter = getPocketBaseAdapter()
    return adapter.create<PBMeasurementRecord>(COLLECTIONS.MEASUREMENTS, {
      ...data,
      user: adapter.currentUserId,
    })
  },

  /**
   * Update one of the tailor's own records.
   */
  async update(
    measurementId: string,
    data: Record<string, any>,
  ): Promise<ServiceResult<PBMeasurementRecord>> {
    return getPocketBaseAdapter().update<PBMeasurementRecord>(
      COLLECTIONS.MEASUREMENTS,
      measurementId,
      data,
    )
  },

  /**
   * Delete one of the tailor's own records.
   */
  async remove(measurementId: string): Promise<ServiceResult<void>> {
    return getPocketBaseAdapter().remove(COLLECTIONS.MEASUREMENTS, measurementId)
  },

  /**
   * Whether the record belongs to the logged-in tailor (i.e. editable).
   */
  isOwn(record: PBMeasurementRecord): boolean {
    return record.user === getPocketBaseAdapter().currentUserId
  },
}
