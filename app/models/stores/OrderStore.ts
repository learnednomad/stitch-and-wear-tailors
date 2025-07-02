/**
 * OrderStore - Order Lifecycle and Progress Management
 * Manages order creation, status transitions, progress tracking, and order history
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

/**
 * MST model for order items
 */
const OrderItemModel = types.model("OrderItem", {
  id: types.string,
  fabricId: types.string,
  styleId: types.string,
  quantity: types.number,
  unitPrice: types.number,
  totalPrice: types.number,
  measurements: types.map(types.number),
  customizations: types.map(types.string),
  notes: types.maybeNull(types.string),
  status: types.enumeration("OrderItemStatus", [
    "pending",
    "measuring",
    "cutting",
    "sewing",
    "finishing",
    "quality_check",
    "completed",
  ]),
  estimatedDays: types.number,
  actualDays: types.maybeNull(types.number),
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * MST model for order progress tracking
 */
const OrderProgressModel = types.model("OrderProgress", {
  status: types.enumeration("OrderStatus", [
    "draft",
    "pending",
    "confirmed",
    "in_progress",
    "ready_for_fitting",
    "fitting_scheduled",
    "alterations_needed",
    "completed",
    "delivered",
    "cancelled",
  ]),
  percentage: types.number,
  currentStep: types.string,
  estimatedCompletion: types.maybeNull(types.string),
  actualCompletion: types.maybeNull(types.string),
  milestones: types.array(
    types.model("Milestone", {
      name: types.string,
      status: types.enumeration("MilestoneStatus", [
        "pending",
        "in_progress",
        "completed",
        "skipped",
      ]),
      startedAt: types.maybeNull(types.string),
      completedAt: types.maybeNull(types.string),
      notes: types.maybeNull(types.string),
    }),
  ),
  lastUpdated: types.string,
})

/**
 * Main Order model
 */
const OrderModel = types.model("Order", {
  id: types.string,
  orderNumber: types.string,
  clientId: types.string,
  tailorId: types.maybeNull(types.string),

  // Order details
  items: types.array(OrderItemModel),
  status: types.enumeration("OrderStatus", [
    "draft",
    "pending",
    "confirmed",
    "in_progress",
    "ready_for_fitting",
    "fitting_scheduled",
    "alterations_needed",
    "completed",
    "delivered",
    "cancelled",
  ]),
  priority: types.enumeration("OrderPriority", ["low", "medium", "high", "urgent"]),

  // Pricing
  subtotal: types.number,
  tax: types.number,
  discount: types.number,
  total: types.number,

  // Dates
  orderDate: types.string,
  dueDate: types.string,
  deliveryDate: types.maybeNull(types.string),

  // Progress tracking
  progress: types.optional(OrderProgressModel, () =>
    OrderProgressModel.create({
      status: "draft",
      percentage: 0,
      currentStep: "Order Placed",
      estimatedCompletion: null,
      actualCompletion: null,
      milestones: [],
      lastUpdated: createTimestamp(),
    }),
  ),

  // Additional details
  notes: types.maybeNull(types.string),
  specialInstructions: types.maybeNull(types.string),
  fittingScheduled: types.maybeNull(types.string),

  // Metadata
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for orders
 */
const OrdersCollectionModel = createCollectionModel("OrdersCollection", OrderModel)

/**
 * Search model for orders
 */
const OrderSearchModel = createSearchModel()

/**
 * Main OrderStore model
 */
export const OrderStoreModel = types
  .model("OrderStore", {
    // Orders collection
    orders: types.optional(OrdersCollectionModel, {}),

    // Current order being viewed/edited
    currentOrder: types.maybeNull(OrderModel),

    // Draft order for creation
    draftOrder: types.maybeNull(OrderModel),

    // Search and filtering
    search: types.optional(OrderSearchModel, {}),

    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),

    // Statistics
    statistics: types.model("OrderStatistics", {
      totalOrders: types.optional(types.number, 0),
      pendingOrders: types.optional(types.number, 0),
      inProgressOrders: types.optional(types.number, 0),
      completedOrders: types.optional(types.number, 0),
      revenue: types.optional(types.number, 0),
      averageOrderValue: types.optional(types.number, 0),
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
      setCurrentOrder(order: Order | null) {
        if (order) {
          const validatedOrder = validateOrder(order)
          self.currentOrder = OrderModel.create(validatedOrder)
        } else {
          self.currentOrder = null
        }
      },

      /**
       * Create new draft order
       */
      createDraftOrder(clientId: string) {
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`

        self.draftOrder = OrderModel.create({
          id: generateId(),
          orderNumber,
          clientId,
          tailorId: null,
          items: [],
          status: "draft",
          priority: "medium",
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          orderDate: createTimestamp(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks default
          deliveryDate: null,
          notes: null,
          specialInstructions: null,
          fittingScheduled: null,
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })
      },

      /**
       * Add item to draft order
       */
      addItemToDraft(itemData: Omit<OrderItem, "id" | "createdAt" | "updatedAt">) {
        if (!self.draftOrder) return

        const item = OrderItemModel.create({
          ...itemData,
          id: generateId(),
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })

        self.draftOrder.items.push(item)
        self.recalculateDraftTotals()
      },

      /**
       * Update item in draft order
       */
      updateDraftItem(itemId: string, updates: Partial<OrderItem>) {
        if (!self.draftOrder) return

        const item = self.draftOrder.items.find((i) => i.id === itemId)
        if (item) {
          Object.assign(item, updates, { updatedAt: createTimestamp() })
          self.recalculateDraftTotals()
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

        const subtotal = self.draftOrder.items.reduce((sum, item) => sum + item.totalPrice, 0)
        const tax = subtotal * 0.1 // 10% tax rate
        const total = subtotal + tax - self.draftOrder.discount

        self.draftOrder.subtotal = subtotal
        self.draftOrder.tax = tax
        self.draftOrder.total = total
        self.draftOrder.updatedAt = createTimestamp()
      },

      /**
       * Clear draft order
       */
      clearDraftOrder() {
        self.draftOrder = null
      },

      /**
       * Update order status
       */
      updateOrderStatus(orderId: string, status: OrderStatus, notes?: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.status = status
          order.progress.status = status
          order.progress.lastUpdated = createTimestamp()
          order.updatedAt = createTimestamp()

          // Update progress percentage based on status
          const statusPercentages: Record<OrderStatus, number> = {
            draft: 0,
            pending: 10,
            confirmed: 20,
            in_progress: 40,
            ready_for_fitting: 70,
            fitting_scheduled: 75,
            alterations_needed: 60,
            completed: 95,
            delivered: 100,
            cancelled: 0,
          }

          order.progress.percentage = statusPercentages[status] || 0

          // Add milestone if it doesn't exist
          const existingMilestone = order.progress.milestones.find((m) => m.name === status)
          if (!existingMilestone) {
            order.progress.milestones.push({
              name: status,
              status: "completed",
              startedAt: createTimestamp(),
              completedAt: createTimestamp(),
              notes: notes || null,
            })
          }
        }
      },

      /**
       * Assign tailor to order
       */
      assignTailor(orderId: string, tailorId: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.tailorId = tailorId
          order.updatedAt = createTimestamp()
        }
      },

      /**
       * Schedule fitting
       */
      scheduleFitting(orderId: string, fittingDate: string) {
        const order = self.orders.findById(orderId)
        if (order) {
          order.fittingScheduled = fittingDate
          order.status = "fitting_scheduled"
          order.updatedAt = createTimestamp()
          self.updateOrderStatus(
            orderId,
            "fitting_scheduled",
            `Fitting scheduled for ${fittingDate}`,
          )
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

        const response = await fetch(`/api/orders?${queryParams}`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch orders")
        }

        return response.json()
      },
      { errorPrefix: "Failed to load orders" },
    )

    const createOrder = createAsyncAction(
      self,
      async (orderData: Partial<Order>) => {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        })

        if (!response.ok) {
          throw new Error("Failed to create order")
        }

        return response.json()
      },
      { errorPrefix: "Failed to create order" },
    )

    const updateOrder = createAsyncAction(
      self,
      async (orderId: string, updates: Partial<Order>) => {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error("Failed to update order")
        }

        return response.json()
      },
      { errorPrefix: "Failed to update order" },
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
       * Load orders with filtering
       */
      loadOrders: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchOrders(params)

          if (reset) {
            self.orders.setItems(result.orders)
          } else {
            self.orders.addItems(result.orders)
          }

          self.orders.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load single order
       */
      loadOrder: flow(function* (orderId: string) {
        try {
          const response = yield fetch(`/api/orders/${orderId}`)
          if (!response.ok) throw new Error("Failed to fetch order")

          const order = yield response.json()
          self.setCurrentOrder(order)
          return order
        } catch (error) {
          self.setError(error.message)
          throw error
        }
      }),

      /**
       * Create order from draft
       */
      submitDraftOrder: flow(function* () {
        if (!self.draftOrder) return

        try {
          const orderData = {
            ...self.draftOrder,
            status: "pending" as OrderStatus,
          }

          const createdOrder = yield createOrder(orderData)
          self.orders.addItem(OrderModel.create(createdOrder))
          self.clearDraftOrder()
          return createdOrder
        } catch (error) {
          throw error
        }
      }),

      /**
       * Update existing order
       */
      saveOrder: flow(function* (orderId: string, updates: Partial<Order>) {
        try {
          const updatedOrder = yield updateOrder(orderId, updates)
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
       * Cancel order
       */
      cancelOrder: flow(function* (orderId: string, reason: string) {
        try {
          const updates = {
            status: "cancelled" as OrderStatus,
            notes: reason,
          }

          yield self.saveOrder(orderId, updates)
          self.updateOrderStatus(orderId, "cancelled", reason)
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
       * Search orders
       */
      searchOrders: flow(function* (query: string, filters: any = {}) {
        self.search.setQuery(query)
        Object.entries(filters).forEach(([key, value]) => {
          self.search.setFilter(key, value)
        })

        try {
          const params = { ...filters, search: query, page: 1 }
          const result = yield fetchOrders(params)
          self.orders.setItems(result.orders)
          self.orders.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),
    }
  })
  .views((self) => ({
    /**
     * Get orders by status
     */
    getOrdersByStatus(status: OrderStatus) {
      return self.orders.filter((order: any) => order.status === status)
    },

    /**
     * Get orders by client
     */
    getOrdersByClient(clientId: string) {
      return self.orders.filter((order: any) => order.clientId === clientId)
    },

    /**
     * Get orders by tailor
     */
    getOrdersByTailor(tailorId: string) {
      return self.orders.filter((order: any) => order.tailorId === tailorId)
    },

    /**
     * Get urgent orders
     */
    get urgentOrders() {
      return self.orders.filter((order: any) => order.priority === "urgent")
    },

    /**
     * Get overdue orders
     */
    get overdueOrders() {
      const now = new Date()
      return self.orders.filter((order: any) => {
        const dueDate = new Date(order.dueDate)
        return dueDate < now && !["completed", "delivered", "cancelled"].includes(order.status)
      })
    },

    /**
     * Get orders ready for fitting
     */
    get ordersReadyForFitting() {
      return self.orders.filter((order: any) => order.status === "ready_for_fitting")
    },

    /**
     * Get revenue from completed orders
     */
    get completedOrdersRevenue() {
      return self.orders.items
        .filter((order: any) => ["completed", "delivered"].includes(order.status))
        .reduce((sum: number, order: any) => sum + order.total, 0)
    },

    /**
     * Get average order value
     */
    get averageOrderValue() {
      if (self.orders.count === 0) return 0
      const totalRevenue = self.orders.items.reduce(
        (sum: number, order: any) => sum + order.total,
        0,
      )
      return totalRevenue / self.orders.count
    },

    /**
     * Check if draft order is valid for submission
     */
    get isDraftOrderValid() {
      if (!self.draftOrder) return false
      return (
        self.draftOrder.items.length > 0 &&
        self.draftOrder.clientId.length > 0 &&
        self.draftOrder.total > 0
      )
    },

    /**
     * Get orders requiring attention
     */
    get ordersRequiringAttention() {
      return [...self.urgentOrders, ...self.overdueOrders, ...self.ordersReadyForFitting].filter(
        (order, index, arr) => arr.findIndex((o) => o.id === order.id) === index,
      )
    },

    /**
     * Check if data is stale
     */
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },
  }))

/**
 * Type definitions for OrderStore
 */
export interface OrderStore extends Instance<typeof OrderStoreModel> {}
export interface OrderStoreSnapshot extends SnapshotOut<typeof OrderStoreModel> {}
