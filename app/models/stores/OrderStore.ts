/**
 * Nigerian order domain models (MST).
 *
 * Phase 4b batch 2 removed the MST `OrderStoreModel` (server data → React Query
 * in `app/api/orders.ts`; the creation wizard → Zustand `useOrderDraftStore`).
 *
 * What remains here are the three MST domain models — `NigerianOrderItemModel`,
 * `NigerianOrderProgressModel`, `NigerianOrderModel` — kept because
 * `app/services/api/__tests__/order-mapper.test.ts` uses `NigerianOrderModel.create()`
 * as a validation oracle: every enum in `mapPBOrderToDomain` (order-api.ts) must
 * stay in sync with these models so a mapped server record never throws.
 */

import { types } from "mobx-state-tree"
import { createTimestamp } from "../mst"

/**
 * MST model for Nigerian garment order items
 */
const NigerianOrderItemModel = types.model("NigerianOrderItem", {
  id: types.string,
  garmentType: types.enumeration("NigerianGarmentType", [
    "agbada",
    "kaftan",
    "isi_agu",
    "babban_riga",
    "ankara_dress",
    "senator",
    "traditional",
    "modern",
    "custom",
  ]),
  fabricType: types.enumeration("FabricType", [
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
  ]),
  fabricColor: types.string,
  fabricQuantity: types.number, // in meters
  unitPrice: types.number,
  totalPrice: types.number,
  measurements: types.map(types.number),
  customizations: types.map(types.string),
  culturalSpecifications: types.maybeNull(types.string),
  notes: types.maybeNull(types.string),
  status: types.enumeration("OrderItemStatus", [
    "received",
    "measured",
    "cutting",
    "sewing",
    "finishing",
    "quality_check",
    "completed",
  ]),
  estimatedDays: types.number,
  actualDays: types.maybeNull(types.number),
  tailorId: types.maybeNull(types.string),
  qualityScore: types.maybeNull(types.number),
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * MST model for Nigerian order progress tracking
 */
const NigerianOrderProgressModel = types.model("NigerianOrderProgress", {
  currentStage: types.enumeration("OrderStage", [
    "received",
    "measured",
    "cutting",
    "sewing",
    "finishing",
    "quality_check",
    "completed",
  ]),
  status: types.enumeration("OrderStatus", [
    "pending",
    "confirmed",
    "in_progress",
    "ready",
    "delivered",
    "cancelled",
  ]),
  percentage: types.number,
  estimatedCompletion: types.maybeNull(types.string),
  actualCompletion: types.maybeNull(types.string),
  stageProgress: types.array(
    types.model("StageProgress", {
      stage: types.enumeration("OrderStage", [
        "received",
        "measured",
        "cutting",
        "sewing",
        "finishing",
        "quality_check",
        "completed",
      ]),
      status: types.enumeration("StageStatus", ["pending", "in_progress", "completed"]),
      startedAt: types.maybeNull(types.string),
      completedAt: types.maybeNull(types.string),
      tailorId: types.maybeNull(types.string),
      qualityScore: types.maybeNull(types.number),
      notes: types.maybeNull(types.string),
    }),
  ),
  lastUpdated: types.string,
})

/**
 * Main Nigerian Order model
 */
const NigerianOrderModel = types.model("NigerianOrder", {
  id: types.string,
  orderNumber: types.string,
  userId: types.string,
  tailorId: types.maybeNull(types.string),
  locationId: types.string,

  // Nigerian order specifics
  type: types.enumeration("OrderType", ["custom", "alteration", "repair"]),
  garmentType: types.enumeration("NigerianGarmentType", [
    "agbada",
    "kaftan",
    "isi_agu",
    "babban_riga",
    "ankara_dress",
    "senator",
    "traditional",
    "modern",
    "custom",
  ]),
  city: types.enumeration("NigerianCity", ["lagos", "abuja", "kano"]),
  customerLanguage: types.enumeration("SupportedLanguage", ["en", "yo", "ha", "ig"]),

  // Order details
  items: types.array(NigerianOrderItemModel),
  status: types.enumeration("OrderStatus", [
    "pending",
    "confirmed",
    "in_progress",
    "ready",
    "delivered",
    "cancelled",
  ]),
  priority: types.enumeration("OrderPriority", ["low", "normal", "high", "urgent"]),

  // Customer info
  customerInfo: types.model("CustomerInfo", {
    firstName: types.string,
    lastName: types.string,
    email: types.string,
    phone: types.string,
    address: types.string,
  }),

  // Measurements (if available)
  measurementId: types.maybeNull(types.string),

  // Fabric selection
  fabricSelection: types.model("FabricSelection", {
    type: types.enumeration("FabricType", [
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
    ]),
    color: types.string,
    pattern: types.maybeNull(types.string),
    quantity: types.number,
    unitPrice: types.number,
    totalPrice: types.number,
    supplier: types.maybeNull(types.string),
    inStock: types.boolean,
  }),

  // Style configuration
  styleConfig: types.model("StyleConfig", {
    designNotes: types.maybeNull(types.string),
    embellishments: types.array(types.string),
    fitPreference: types.enumeration("FitPreference", ["slim", "regular", "loose"]),
    necklineStyle: types.maybeNull(types.string),
    sleeveStyle: types.maybeNull(types.string),
    hemStyle: types.maybeNull(types.string),
    culturalSpecifications: types.maybeNull(types.string),
  }),

  // Nigerian pricing (in Naira)
  pricing: types.model("PricingBreakdown", {
    basePrice: types.number,
    fabricCost: types.number,
    complexityMultiplier: types.number,
    urgencyFee: types.number,
    totalPrice: types.number,
    depositRequired: types.number,
    balanceAmount: types.number,
    currency: types.literal("NGN"),
  }),

  // Payment method
  paymentMethod: types.enumeration("PaymentMethod", [
    "bank_transfer",
    "mobile_money",
    "cash",
    "card",
    "pos",
  ]),

  // Dates
  orderDate: types.string,
  estimatedDeliveryDate: types.string,
  actualDeliveryDate: types.maybeNull(types.string),

  // Progress tracking
  progress: types.optional(NigerianOrderProgressModel, () =>
    NigerianOrderProgressModel.create({
      currentStage: "received",
      status: "pending",
      percentage: 0,
      estimatedCompletion: null,
      actualCompletion: null,
      stageProgress: [],
      lastUpdated: createTimestamp(),
    }),
  ),

  // Additional details
  notes: types.maybeNull(types.string),
  internalNotes: types.maybeNull(types.string),

  // Metadata
  createdAt: types.string,
  updatedAt: types.string,
})

// Export the domain models (used by the order-mapper validation test)
export { NigerianOrderModel, NigerianOrderItemModel, NigerianOrderProgressModel }
