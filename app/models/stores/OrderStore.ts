/**
 * OrderStore - Nigerian Luxury Tailor Orders Management
 * Manages order creation, status transitions, progress tracking, and Nigerian business context
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import {
  createAsyncAction,
  createCollectionModel,
  createSearchModel,
  generateId,
  createTimestamp,
} from "../mst"
import { Order, OrderStatus, OrderPriority, OrderItem } from "../types"
import { validateOrder } from "../schemas"
import { storage } from "../../utils/storage"
import { 
  NigerianGarmentType,
  NigerianCity,
  SupportedLanguage,
  OrderType,
  FabricType,
  PaymentMethod,
  OrderCreationData,
  MeasurementData,
  CustomerInfo,
  FabricSelection,
  StyleConfig,
  PricingBreakdown,
  OrderStage,
  OrderProgress as NigerianOrderProgress
} from "../../types/orders"
import { orderTranslations, nigerianBusinessConfig } from "../../i18n/nigerian-languages"

/**
 * MST model for Nigerian garment order items
 */
const NigerianOrderItemModel = types.model("NigerianOrderItem", {
  id: types.string,
  garmentType: types.enumeration("NigerianGarmentType", [
    "agbada", "kaftan", "isi_agu", "babban_riga", "ankara_dress", "senator", "traditional", "modern", "custom"
  ]),
  fabricType: types.enumeration("FabricType", [
    "aso_oke", "adire", "ankara", "lace", "cotton", "silk", "linen", "brocade", "george", "custom"
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
    "received", "measured", "cutting", "sewing", "finishing", "quality_check", "completed"
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
    "received", "measured", "cutting", "sewing", "finishing", "quality_check", "completed"
  ]),
  status: types.enumeration("OrderStatus", [
    "pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"
  ]),
  percentage: types.number,
  estimatedCompletion: types.maybeNull(types.string),
  actualCompletion: types.maybeNull(types.string),
  stageProgress: types.array(
    types.model("StageProgress", {
      stage: types.enumeration("OrderStage", [
        "received", "measured", "cutting", "sewing", "finishing", "quality_check", "completed"
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
    "agbada", "kaftan", "isi_agu", "babban_riga", "ankara_dress", "senator", "traditional", "modern", "custom"
  ]),
  city: types.enumeration("NigerianCity", ["lagos", "abuja", "kano"]),
  customerLanguage: types.enumeration("SupportedLanguage", ["en", "yo", "ha", "ig"]),

  // Order details
  items: types.array(NigerianOrderItemModel),
  status: types.enumeration("OrderStatus", [
    "pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"
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
      "aso_oke", "adire", "ankara", "lace", "cotton", "silk", "linen", "brocade", "george", "custom"
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
    "bank_transfer", "mobile_money", "cash", "card", "pos"
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

/**
 * Collection model for Nigerian orders
 */
const NigerianOrdersCollectionModel = createCollectionModel("NigerianOrdersCollection", NigerianOrderModel)

/**
 * Search model for orders
 */
const OrderSearchModel = createSearchModel()

/**
 * Main Nigerian OrderStore model
 */
export const OrderStoreModel = types
  .model("NigerianOrderStore", {
    // Orders collection
    orders: types.optional(NigerianOrdersCollectionModel, {}),

    // Current order being viewed/edited
    currentOrder: types.maybeNull(NigerianOrderModel),

    // Draft order for creation
    draftOrder: types.maybeNull(NigerianOrderModel),

    // Order creation workflow state
    orderCreationStep: types.optional(types.number, 0), // 0-5: CustomerInfo, Measurements, Fabric, Style, Pricing, Confirmation
    orderCreationData: types.maybeNull(
      types.model("OrderCreationData", {
        customerInfo: types.maybeNull(
          types.model("CustomerInfo", {
            firstName: types.string,
            lastName: types.string,
            email: types.string,
            phone: types.string,
            address: types.string,
            city: types.enumeration("NigerianCity", ["lagos", "abuja", "kano"]),
            preferredLanguage: types.enumeration("SupportedLanguage", ["en", "yo", "ha", "ig"]),
          })
        ),
        measurementId: types.maybeNull(types.string),
        fabricSelection: types.maybeNull(
          types.model("FabricSelection", {
            type: types.enumeration("FabricType", [
              "aso_oke", "adire", "ankara", "lace", "cotton", "silk", "linen", "brocade", "george", "custom"
            ]),
            color: types.string,
            quantity: types.number,
            unitPrice: types.number,
            totalPrice: types.number,
          })
        ),
        styleConfig: types.maybeNull(
          types.model("StyleConfig", {
            garmentType: types.enumeration("NigerianGarmentType", [
              "agbada", "kaftan", "isi_agu", "babban_riga", "ankara_dress", "senator", "traditional", "modern", "custom"
            ]),
            fitPreference: types.enumeration("FitPreference", ["slim", "regular", "loose"]),
            designNotes: types.maybeNull(types.string),
            culturalSpecifications: types.maybeNull(types.string),
          })
        ),
        orderType: types.enumeration("OrderType", ["custom", "alteration", "repair"]),
        priority: types.enumeration("OrderPriority", ["low", "normal", "high", "urgent"]),
      })
    ),

    // Current language for UI
    currentLanguage: types.optional(
      types.enumeration("SupportedLanguage", ["en", "yo", "ha", "ig"]),
      "en"
    ),

    // Search and filtering
    search: types.optional(OrderSearchModel, {}),

    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),

    // Nigerian business statistics
    statistics: types.model("NigerianOrderStatistics", {
      totalOrders: types.optional(types.number, 0),
      pendingOrders: types.optional(types.number, 0),
      inProgressOrders: types.optional(types.number, 0),
      completedOrders: types.optional(types.number, 0),
      revenue: types.optional(types.number, 0), // in Naira
      averageOrderValue: types.optional(types.number, 0),
      // Nigerian-specific stats
      ordersByGarmentType: types.map(types.number),
      ordersByCity: types.map(types.number),
      revenueByCity: types.map(types.number),
      popularFabrics: types.array(types.string),
      lastUpdated: types.maybeNull(types.string),
    }),
  })
  .actions((self) => {
    // Helper actions
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const setLastFetched = (timestamp: string) => {
      self.lastFetched = timestamp
    }

    return {
      setLoading,
      setError,
      clearError,
      setLastFetched,

      /**
       * Set current order
       */
      setCurrentOrder(order: any | null) {
        if (order) {
          self.currentOrder = NigerianOrderModel.create(order)
        } else {
          self.currentOrder = null
        }
      },

      /**
       * Set current language for UI
       */
      setLanguage(language: SupportedLanguage) {
        self.currentLanguage = language
      },

      /**
       * Start order creation workflow
       */
      startOrderCreation() {
        self.orderCreationStep = 0
        self.orderCreationData = {
          customerInfo: null,
          measurementId: null,
          fabricSelection: null,
          styleConfig: null,
          orderType: "custom",
          priority: "normal",
        }
      },

      /**
       * Go to next step in order creation
       */
      nextCreationStep() {
        if (self.orderCreationStep < 5) {
          self.orderCreationStep += 1
        }
      },

      /**
       * Go to previous step in order creation
       */
      previousCreationStep() {
        if (self.orderCreationStep > 0) {
          self.orderCreationStep -= 1
        }
      },

      /**
       * Set customer info in order creation
       */
      setOrderCustomerInfo(customerInfo: CustomerInfo) {
        if (!self.orderCreationData) return
        self.orderCreationData.customerInfo = customerInfo
      },

      /**
       * Set measurement ID for order
       */
      setOrderMeasurement(measurementId: string) {
        if (!self.orderCreationData) return
        self.orderCreationData.measurementId = measurementId
      },

      /**
       * Set fabric selection for order
       */
      setOrderFabricSelection(fabricSelection: FabricSelection) {
        if (!self.orderCreationData) return
        self.orderCreationData.fabricSelection = {
          type: fabricSelection.type,
          color: fabricSelection.color,
          quantity: fabricSelection.quantity,
          unitPrice: fabricSelection.unitPrice,
          totalPrice: fabricSelection.totalPrice,
        }
      },

      /**
       * Set style configuration for order
       */
      setOrderStyleConfig(styleConfig: StyleConfig) {
        if (!self.orderCreationData) return
        self.orderCreationData.styleConfig = {
          garmentType: styleConfig.garmentType,
          fitPreference: styleConfig.fitPreference,
          designNotes: styleConfig.designNotes,
          culturalSpecifications: styleConfig.culturalSpecifications,
        }
      },

      /**
       * Calculate Nigerian pricing based on city and garment type
       */
      calculateNigerianPricing(garmentType: NigerianGarmentType, city: NigerianCity, isRush: boolean = false): PricingBreakdown {
        const garmentConfig = nigerianBusinessConfig.traditionalGarments[garmentType]
        const cityConfig = nigerianBusinessConfig.cities[city]
        
        if (!garmentConfig || !cityConfig) {
          throw new Error(`Configuration not found for ${garmentType} in ${city}`)
        }

        const basePrice = garmentConfig.basePrice
        const fabricCost = self.orderCreationData?.fabricSelection?.totalPrice || 0
        const complexityMultiplier = garmentConfig.complexityLevel * 0.2 + 1
        const urgencyFee = isRush ? basePrice * (cityConfig.rushFeeMultiplier - 1) : 0
        const totalPrice = (basePrice + fabricCost) * complexityMultiplier + urgencyFee
        const depositRequired = totalPrice * 0.5 // 50% deposit
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

      /**
       * Create Nigerian draft order from creation data
       */
      createNigerianDraftOrder() {
        if (!self.orderCreationData?.customerInfo || !self.orderCreationData?.styleConfig) {
          throw new Error("Customer info and style config are required")
        }

        const orderNumber = `NGR-${Date.now().toString(36).toUpperCase()}`
        const garmentType = self.orderCreationData.styleConfig.garmentType
        const city = self.orderCreationData.customerInfo.city
        const isRush = self.orderCreationData.priority === "urgent"
        
        // Calculate pricing
        const pricing = self.calculateNigerianPricing(garmentType, city, isRush)
        
        // Calculate estimated delivery
        const garmentConfig = nigerianBusinessConfig.traditionalGarments[garmentType]
        const estimatedDays = garmentConfig?.estimatedDays || 7
        const rushMultiplier = isRush ? 0.5 : 1
        const actualDays = Math.ceil(estimatedDays * rushMultiplier)
        const estimatedDeliveryDate = new Date(Date.now() + actualDays * 24 * 60 * 60 * 1000).toISOString()

        self.draftOrder = NigerianOrderModel.create({
          id: generateId(),
          orderNumber,
          userId: generateId(), // This should come from auth
          tailorId: null,
          locationId: generateId(), // This should be the business location
          type: self.orderCreationData.orderType,
          garmentType,
          city,
          customerLanguage: self.orderCreationData.customerInfo.preferredLanguage,
          items: [],
          status: "pending",
          priority: self.orderCreationData.priority,
          customerInfo: {
            firstName: self.orderCreationData.customerInfo.firstName,
            lastName: self.orderCreationData.customerInfo.lastName,
            email: self.orderCreationData.customerInfo.email,
            phone: self.orderCreationData.customerInfo.phone,
            address: self.orderCreationData.customerInfo.address,
          },
          measurementId: self.orderCreationData.measurementId,
          fabricSelection: {
            type: self.orderCreationData.fabricSelection?.type || "cotton",
            color: self.orderCreationData.fabricSelection?.color || "white",
            pattern: null,
            quantity: self.orderCreationData.fabricSelection?.quantity || 3,
            unitPrice: self.orderCreationData.fabricSelection?.unitPrice || 1000,
            totalPrice: self.orderCreationData.fabricSelection?.totalPrice || 3000,
            supplier: null,
            inStock: true,
          },
          styleConfig: {
            designNotes: self.orderCreationData.styleConfig.designNotes,
            embellishments: [],
            fitPreference: self.orderCreationData.styleConfig.fitPreference,
            necklineStyle: null,
            sleeveStyle: null,
            hemStyle: null,
            culturalSpecifications: self.orderCreationData.styleConfig.culturalSpecifications,
          },
          pricing,
          paymentMethod: "bank_transfer", // Default payment method
          orderDate: createTimestamp(),
          estimatedDeliveryDate,
          actualDeliveryDate: null,
          notes: null,
          internalNotes: null,
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })
      },

      /**
       * Add Nigerian garment item to draft order
       */
      addNigerianItemToDraft(itemData: {
        garmentType: NigerianGarmentType
        fabricType: FabricType
        fabricColor: string
        fabricQuantity: number
        unitPrice: number
        measurements: Record<string, number>
        culturalSpecifications?: string
        notes?: string
      }) {
        if (!self.draftOrder) return

        const item = NigerianOrderItemModel.create({
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
          estimatedDays: nigerianBusinessConfig.traditionalGarments[itemData.garmentType]?.estimatedDays || 7,
          actualDays: null,
          tailorId: null,
          qualityScore: null,
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })

        self.draftOrder.items.push(item)
      },

      /**
       * Update Nigerian item in draft order
       */
      updateNigerianDraftItem(itemId: string, updates: any) {
        if (!self.draftOrder) return

        const item = self.draftOrder.items.find((i) => i.id === itemId)
        if (item) {
          Object.assign(item, updates, { updatedAt: createTimestamp() })
        }
      },

      /**
       * Remove item from draft order
       */
      removeDraftItem(itemId: string) {
        if (!self.draftOrder) return

        const index = self.draftOrder.items.findIndex((i) => i.id === itemId)
        if (index !== -1) {
          self.draftOrder.items.splice(index, 1)
          self.recalculateDraftTotals()
        }
      },

      /**
       * Recalculate draft order totals
       */
      recalculateDraftTotals() {
        if (!self.draftOrder) return

        const itemsTotal = self.draftOrder.items.reduce(
          (sum: number, item: any) => sum + item.totalPrice,
          0,
        )

        // Update pricing
        const currentPricing = self.draftOrder.pricing
        self.draftOrder.pricing = {
          ...currentPricing,
          totalPrice: currentPricing.basePrice + itemsTotal + currentPricing.urgencyFee,
          balanceAmount:
            currentPricing.basePrice + itemsTotal + currentPricing.urgencyFee - currentPricing.depositRequired,
        }
      },

      /**
       * Validate order creation data
       */
      validateOrderCreationData(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []
        
        if (!self.orderCreationData) {
          errors.push("Order creation data is missing")
          return { isValid: false, errors }
        }

        // Validate customer info
        if (!self.orderCreationData.customerInfo) {
          errors.push("Customer information is required")
        } else {
          const customer = self.orderCreationData.customerInfo
          if (!customer.firstName?.trim()) errors.push("First name is required")
          if (!customer.lastName?.trim()) errors.push("Last name is required")
          if (!customer.email?.trim()) errors.push("Email is required")
          if (customer.email && !/\S+@\S+\.\S+/.test(customer.email)) errors.push("Valid email is required")
          if (!customer.phone?.trim()) errors.push("Phone number is required")
          if (!customer.address?.trim()) errors.push("Address is required")
        }

        // Validate style config
        if (!self.orderCreationData.styleConfig) {
          errors.push("Style configuration is required")
        } else if (!self.orderCreationData.styleConfig.garmentType) {
          errors.push("Garment type selection is required")
        }

        // Validate fabric selection
        if (!self.orderCreationData.fabricSelection) {
          errors.push("Fabric selection is required")
        } else {
          const fabric = self.orderCreationData.fabricSelection
          if (!fabric.type) errors.push("Fabric type is required")
          if (!fabric.color?.trim()) errors.push("Fabric color is required")
          if (fabric.quantity <= 0) errors.push("Fabric quantity must be greater than 0")
          if (fabric.unitPrice <= 0) errors.push("Fabric unit price must be greater than 0")
        }

        return { isValid: errors.length === 0, errors }
      },

      /**
       * Validate measurements for specific garment type
       */
      validateMeasurementsForGarment(garmentType: NigerianGarmentType, measurements: Record<string, number>): { isValid: boolean; errors: string[] } {
        const errors: string[] = []
        const garmentConfig = nigerianBusinessConfig.traditionalGarments[garmentType]
        
        if (!garmentConfig) {
          errors.push(`Configuration not found for garment type: ${garmentType}`)
          return { isValid: false, errors }
        }

        // Check required measurements
        const requiredMeasurements = garmentConfig.requiredMeasurements || ['chest', 'waist', 'length']
        
        for (const measurement of requiredMeasurements) {
          if (!measurements[measurement] || measurements[measurement] <= 0) {
            errors.push(`${measurement} measurement is required and must be greater than 0`)
          }
        }

        // Validate measurement ranges (basic sanity checks)
        if (measurements.chest && (measurements.chest < 30 || measurements.chest > 200)) {
          errors.push("Chest measurement should be between 30-200 cm")
        }
        if (measurements.waist && (measurements.waist < 25 || measurements.waist > 180)) {
          errors.push("Waist measurement should be between 25-180 cm")
        }
        if (measurements.length && (measurements.length < 50 || measurements.length > 300)) {
          errors.push("Length measurement should be between 50-300 cm")
        }

        return { isValid: errors.length === 0, errors }
      },

      /**
       * Calculate order complexity score
       */
      calculateOrderComplexity(garmentType: NigerianGarmentType, embellishments: string[] = [], culturalSpecs?: string): number {
        const garmentConfig = nigerianBusinessConfig.traditionalGarments[garmentType]
        if (!garmentConfig) return 1

        let complexity = garmentConfig.complexityLevel || 1
        
        // Add complexity for embellishments
        complexity += embellishments.length * 0.5
        
        // Add complexity for cultural specifications
        if (culturalSpecs && culturalSpecs.trim().length > 0) {
          complexity += 1
        }

        // Cap at 5
        return Math.min(complexity, 5)
      },

      /**
       * Validate draft order before submission
       */
      validateDraftOrder(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []
        
        if (!self.draftOrder) {
          errors.push("No draft order to validate")
          return { isValid: false, errors }
        }

        const order = self.draftOrder

        // Validate basic order info
        if (!order.customerInfo.firstName?.trim()) errors.push("Customer first name is required")
        if (!order.customerInfo.email?.trim()) errors.push("Customer email is required")
        if (!order.garmentType) errors.push("Garment type is required")
        if (order.pricing.totalPrice <= 0) errors.push("Order total price must be greater than 0")

        // Validate fabric selection
        if (!order.fabricSelection.type) errors.push("Fabric type is required")
        if (order.fabricSelection.quantity <= 0) errors.push("Fabric quantity must be greater than 0")

        // Validate style configuration
        if (!order.styleConfig.fitPreference) errors.push("Fit preference is required")

        return { isValid: errors.length === 0, errors }
      },

      /**
       * Update Nigerian order stage progress
       */
      updateNigerianOrderStage(orderId: string, stage: OrderStage, tailorId?: string, notes?: string, qualityScore?: number) {
        const order = self.orders.findById(orderId)
        if (!order) return

        order.progress.currentStage = stage
        order.progress.lastUpdated = createTimestamp()
        order.updatedAt = createTimestamp()

        // Update stage progress
        const existingStage = order.progress.stageProgress.find((s: any) => s.stage === stage)
        if (existingStage) {
          existingStage.status = "completed"
          existingStage.completedAt = createTimestamp()
          if (tailorId) existingStage.tailorId = tailorId
          if (notes) existingStage.notes = notes
          if (qualityScore) existingStage.qualityScore = qualityScore
        } else {
          order.progress.stageProgress.push({
            stage,
            status: "completed",
            startedAt: createTimestamp(),
            completedAt: createTimestamp(),
            tailorId: tailorId || null,
            qualityScore: qualityScore || null,
            notes: notes || null,
          })
        }

        // Update overall progress percentage
        const stagePercentages: Record<OrderStage, number> = {
          received: 10,
          measured: 20,
          cutting: 40,
          sewing: 60,
          finishing: 80,
          quality_check: 90,
          completed: 100,
        }
        order.progress.percentage = stagePercentages[stage] || 0

        // Update status based on stage
        if (stage === "completed") {
          order.status = "ready"
        } else if (["cutting", "sewing", "finishing"].includes(stage)) {
          order.status = "in_progress"
        }
      },

      /**
       * Clear draft order and creation data
       */
      clearDraftOrder() {
        self.draftOrder = null
        self.orderCreationData = null
        self.orderCreationStep = 0
      },

      /**
       * Get translated text for current language
       */
      getTranslation(key: string, subKey: string): string {
        const translations = (orderTranslations as any)[key]
        if (!translations) return subKey
        
        const translation = translations[subKey]
        if (!translation) return subKey
        
        return translation[self.currentLanguage] || translation.en || subKey
      },

      /**
       * Update Nigerian order status
       */
      updateNigerianOrderStatus(orderId: string, status: OrderStatus, notes?: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.status = status
          order.progress.status = status
          order.progress.lastUpdated = createTimestamp()
          order.updatedAt = createTimestamp()

          // Update progress percentage based on status
          const statusPercentages: Record<OrderStatus, number> = {
            pending: 10,
            confirmed: 20,
            in_progress: 50,
            ready: 90,
            delivered: 100,
            cancelled: 0,
          }

          order.progress.percentage = statusPercentages[status] || 0

          // Set delivery date if delivered
          if (status === "delivered" && !order.actualDeliveryDate) {
            order.actualDeliveryDate = createTimestamp()
          }
        }
      },


      /**
       * Assign tailor to Nigerian order
       */
      assignNigerianTailor(orderId: string, tailorId: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.tailorId = tailorId
          order.updatedAt = createTimestamp()
          self.updateNigerianOrderStatus(orderId, "confirmed", `Tailor assigned: ${tailorId}`)
        }
      },

      /**
       * Update order notes
       */
      updateOrderNotes(orderId: string, notes: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.notes = notes
          order.updatedAt = createTimestamp()
        }
      },

      /**
       * Update statistics
       */
      updateStatistics(stats: Partial<typeof self.statistics>) {
        Object.assign(self.statistics, stats, { lastUpdated: createTimestamp() })
      },
    }
  })
  .actions((self) => {
    // Async actions
    const fetchOrders = createAsyncAction(
      self,
      async (
        params: {
          page?: number
          status?: OrderStatus
          clientId?: string
          tailorId?: string
          priority?: OrderPriority
          search?: string
          dateFrom?: string
          dateTo?: string
        } = {},
      ) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.set(key, value.toString())
        })

        // TODO: Replace with actual API call when backend is ready
        // For now, return mock data for development
        try {
          const response = await fetch(`/api/orders?${queryParams}`, {
            headers: { "Content-Type": "application/json" },
          })

          if (!response.ok) {
            throw new Error("API not available")
          }

          return response.json()
        } catch (error) {
          // Return mock data for development when API is not available
          console.log("API not available, returning mock data for development")
          return {
            orders: [], // Empty orders array for now
            hasMore: false,
            total: 0,
            page: 1,
          }
        }
      },
      { errorPrefix: "Failed to load orders" },
    )

    const createNigerianOrder = createAsyncAction(
      self,
      async (orderData: any) => {
        // TODO: Replace with Appwrite API call when backend is ready
        try {
          const response = await fetch("/api/nigerian-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          })

          if (!response.ok) {
            throw new Error("API not available")
          }

          return response.json()
        } catch (error) {
          // Return mock success response for development when API is not available
          console.log("API not available, returning mock success for development")
          return {
            success: true,
            order: {
              id: `mock-order-${Date.now()}`,
              ...orderData,
              status: "pending",
              createdAt: new Date().toISOString(),
            },
          }
        }
      },
      { errorPrefix: "Failed to create Nigerian order" },
    )

    const updateNigerianOrder = createAsyncAction(
      self,
      async (orderId: string, updates: any) => {
        // TODO: Replace with Appwrite API call
        const response = await fetch(`/api/nigerian-orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error("Failed to update Nigerian order")
        }

        return response.json()
      },
      { errorPrefix: "Failed to update Nigerian order" },
    )

    const fetchOrderStatistics = createAsyncAction(
      self,
      async (params: { period?: string; clientId?: string; tailorId?: string } = {}) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.set(key, value)
        })

        const response = await fetch(`/api/orders/statistics?${queryParams}`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch statistics")
        }

        return response.json()
      },
      { errorPrefix: "Failed to load statistics" },
    )

    return {
      /**
       * Load Nigerian orders with filtering
       */
      loadNigerianOrders: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          self.setLoading(true)
          self.clearError()

          // Add Nigerian-specific parameters
          const nigerianParams = {
            ...params,
            city: params.city || undefined,
            garmentType: params.garmentType || undefined,
            language: self.currentLanguage,
          }
          
          const result = yield fetchOrders(nigerianParams)

          if (!result || !Array.isArray(result.orders)) {
            throw new Error("Invalid orders data received")
          }

          // Validate each order before adding to store
          const validOrders = result.orders.filter((order: any) => {
            try {
              NigerianOrderModel.create(order)
              return true
            } catch (error) {
              console.warn("Invalid order data skipped:", error.message, order)
              return false
            }
          })

          if (reset) {
            self.orders.setItems(validOrders.map((order: any) => NigerianOrderModel.create(order)))
          } else {
            self.orders.addItems(validOrders.map((order: any) => NigerianOrderModel.create(order)))
          }

          self.orders.setHasMore(result.hasMore || false)
          self.setLastFetched(createTimestamp())
          
          return {
            ...result,
            orders: validOrders,
            skipped: result.orders.length - validOrders.length,
          }
        } catch (error) {
          const errorMessage = error.message || "Failed to load orders"
          self.setError(errorMessage)
          console.error("Failed to load Nigerian orders:", error)
          throw new Error(errorMessage)
        } finally {
          self.setLoading(false)
        }
      }),

      /**
       * Load single Nigerian order
       */
      loadNigerianOrder: flow(function* (orderId: string) {
        if (!orderId?.trim()) {
          throw new Error("Order ID is required")
        }

        try {
          self.setLoading(true)
          self.clearError()

          // TODO: Replace with Appwrite API call
          const response = yield fetch(`/api/nigerian-orders/${orderId}`)
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("Order not found")
            }
            throw new Error(`Failed to fetch order: ${response.statusText}`)
          }

          const order = yield response.json()
          
          if (!order || !order.id) {
            throw new Error("Invalid order data received")
          }

          self.setCurrentOrder(order)
          self.setLastFetched(createTimestamp())
          return order
        } catch (error) {
          const errorMessage = error.message || "Failed to load order"
          self.setError(errorMessage)
          console.error("Failed to load Nigerian order:", error)
          throw new Error(errorMessage)
        } finally {
          self.setLoading(false)
        }
      }),

      /**
       * Submit Nigerian draft order
       */
      submitNigerianDraftOrder: flow(function* () {
        if (!self.draftOrder) {
          throw new Error("No draft order to submit")
        }

        try {
          // Validate draft order before submission
          const validation = self.validateDraftOrder()
          if (!validation.isValid) {
            throw new Error(`Order validation failed: ${validation.errors.join(', ')}`)
          }

          self.setLoading(true)
          self.clearError()

          const orderData = {
            ...self.draftOrder,
            status: "pending" as OrderStatus,
          }

          const createdOrder = yield createNigerianOrder(orderData)
          
          if (createdOrder.success === false) {
            throw new Error(createdOrder.message || "Failed to create order")
          }

          const orderToAdd = createdOrder.order || createdOrder
          self.orders.addItem(NigerianOrderModel.create(orderToAdd))
          self.clearDraftOrder()
          self.setLastFetched(createTimestamp())
          
          return orderToAdd
        } catch (error) {
          self.setError(error.message || "Failed to submit order")
          throw error
        } finally {
          self.setLoading(false)
        }
      }),

      /**
       * Save Nigerian order
       */
      saveNigerianOrder: flow(function* (orderId: string, updates: any) {
        try {
          const updatedOrder = yield updateNigerianOrder(orderId, updates)
          self.orders.updateItem(orderId, updatedOrder)

          if (self.currentOrder?.id === orderId) {
            self.setCurrentOrder(updatedOrder)
          }

          return updatedOrder
        } catch (error) {
          throw error
        }
      }),

      /**
       * Cancel Nigerian order
       */
      cancelNigerianOrder: flow(function* (orderId: string, reason: string) {
        try {
          const updates = {
            status: "cancelled" as OrderStatus,
            notes: reason,
            internalNotes: `Cancelled: ${reason}`,
          }

          yield self.saveNigerianOrder(orderId, updates)
          self.updateNigerianOrderStatus(orderId, "cancelled", reason)
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load order statistics
       */
      loadStatistics: flow(function* (params: any = {}) {
        try {
          const stats = yield fetchOrderStatistics(params)
          self.updateStatistics(stats)
          return stats
        } catch (error) {
          throw error
        }
      }),

      /**
       * Search Nigerian orders
       */
      searchNigerianOrders: flow(function* (query: string, filters: any = {}) {
        self.search.setQuery(query)
        Object.entries(filters).forEach(([key, value]) => {
          self.search.setFilter(key, value)
        })

        try {
          const params = {
            ...filters,
            search: query,
            page: 1,
            language: self.currentLanguage,
          }
          const result = yield fetchOrders(params)
          self.orders.setItems(result.orders.map((order: any) => NigerianOrderModel.create(order)))
          self.orders.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load Nigerian measurements for user
       */
      loadUserMeasurements: flow(function* (userId: string) {
        try {
          // TODO: Replace with Appwrite API call
          const response = yield fetch(`/api/measurements?userId=${userId}`)
          if (!response.ok) throw new Error("Failed to fetch measurements")

          const measurements = yield response.json()
          return measurements
        } catch (error) {
          self.setError(error.message)
          throw error
        }
      }),
    }
  })
  .views((self) => ({
    /**
     * Get Nigerian orders by status
     */
    getNigerianOrdersByStatus(status: OrderStatus) {
      return self.orders.items.filter((order: any) => order.status === status)
    },

    /**
     * Get Nigerian orders by garment type
     */
    getNigerianOrdersByGarmentType(garmentType: NigerianGarmentType) {
      return self.orders.items.filter((order: any) => order.garmentType === garmentType)
    },

    /**
     * Get Nigerian orders by city
     */
    getNigerianOrdersByCity(city: NigerianCity) {
      return self.orders.items.filter((order: any) => order.city === city)
    },

    /**
     * Get orders by user
     */
    getOrdersByUser(userId: string) {
      return self.orders.items.filter((order: any) => order.userId === userId)
    },

    /**
     * Get orders by tailor
     */
    getOrdersByTailor(tailorId: string) {
      return self.orders.items.filter((order: any) => order.tailorId === tailorId)
    },

    /**
     * Get urgent Nigerian orders
     */
    get urgentNigerianOrders() {
      return self.orders.items.filter((order: any) => order.priority === "urgent")
    },

    /**
     * Get orders by fabric type
     */
    getOrdersByFabricType(fabricType: FabricType) {
      return self.orders.items.filter((order: any) => order.fabricSelection.type === fabricType)
    },

    /**
     * Get overdue Nigerian orders
     */
    get overdueNigerianOrders() {
      const now = new Date()
      return self.orders.items.filter((order: any) => {
        const dueDate = new Date(order.estimatedDeliveryDate)
        return dueDate < now && !["ready", "delivered", "cancelled"].includes(order.status)
      })
    },

    /**
     * Get orders ready for delivery
     */
    get ordersReadyForDelivery() {
      return self.orders.items.filter((order: any) => order.status === "ready")
    },

    /**
     * Get revenue from delivered Nigerian orders (in Naira)
     */
    get deliveredOrdersRevenue() {
      return self.orders.items
        .filter((order: any) => ["delivered"].includes(order.status))
        .reduce((sum: number, order: any) => sum + order.pricing.totalPrice, 0)
    },

    /**
     * Get average Nigerian order value (in Naira)
     */
    get averageNigerianOrderValue() {
      if (self.orders.items.length === 0) return 0
      const totalRevenue = self.orders.items.reduce(
        (sum: number, order: any) => sum + order.pricing.totalPrice,
        0,
      )
      return totalRevenue / self.orders.items.length
    },

    /**
     * Check if Nigerian draft order is valid for submission
     */
    get isNigerianDraftOrderValid() {
      if (!self.draftOrder) return false
      return (
        self.draftOrder.customerInfo.firstName.length > 0 &&
        self.draftOrder.customerInfo.email.length > 0 &&
        self.draftOrder.garmentType.length > 0 &&
        self.draftOrder.pricing.totalPrice > 0
      )
    },

    /**
     * Check if order creation data is complete
     */
    get isOrderCreationComplete() {
      if (!self.orderCreationData) return false
      return (
        self.orderCreationData.customerInfo !== null &&
        self.orderCreationData.fabricSelection !== null &&
        self.orderCreationData.styleConfig !== null
      )
    },

    /**
     * Get Nigerian orders requiring attention
     */
    get nigerianOrdersRequiringAttention() {
      return [...self.urgentNigerianOrders, ...self.overdueNigerianOrders, ...self.ordersReadyForDelivery].filter(
        (order, index, arr) => arr.findIndex((o) => o.id === order.id) === index,
      )
    },

    /**
     * Get order creation step name in current language
     */
    get currentCreationStepName() {
      const steps = [
        self.getTranslation("customerInfo", "en"),
        self.getTranslation("measurements", "en"),
        self.getTranslation("fabricSelection", "en"),
        self.getTranslation("styleSelection", "en"),
        self.getTranslation("pricing", "en"),
        self.getTranslation("confirmation", "en"),
      ]
      return steps[self.orderCreationStep] || "Unknown Step"
    },

    /**
     * Check if data is stale
     */
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },

    /**
     * Get Nigerian business config for current city
     */
    getCityConfig(city: NigerianCity) {
      return nigerianBusinessConfig.cities[city] || nigerianBusinessConfig.cities.lagos
    },

    /**
     * Get garment configuration
     */
    getGarmentConfig(garmentType: NigerianGarmentType) {
      return nigerianBusinessConfig.traditionalGarments[garmentType]
    },
  }))

/**
 * Type definitions for Nigerian OrderStore
 */
export interface NigerianOrderStore extends Instance<typeof OrderStoreModel> {}
export interface NigerianOrderStoreSnapshot extends SnapshotOut<typeof OrderStoreModel> {}

// Export individual models for external use
export { NigerianOrderModel, NigerianOrderItemModel, NigerianOrderProgressModel }

// Legacy compatibility
export interface OrderStore extends NigerianOrderStore {}
export interface OrderStoreSnapshot extends NigerianOrderStoreSnapshot {}
