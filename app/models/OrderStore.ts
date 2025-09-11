import { Instance, SnapshotIn, SnapshotOut, types, flow } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { api } from "../services/api"
import { Client, Databases, Query, ID, RealtimeResponseEvent } from "appwrite"
import Config from "../config"

// Initialize Appwrite
const client = new Client()
  .setEndpoint(Config.APPWRITE_ENDPOINT)
  .setProject(Config.APPWRITE_PROJECT_ID)

const databases = new Databases(client)
const DATABASE_ID = Config.APPWRITE_DATABASE_ID

/**
 * Order Status Enum
 */
export enum OrderStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  MEASURING = "measuring",
  CUTTING = "cutting",
  SEWING = "sewing",
  FINISHING = "finishing",
  READY = "ready",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

/**
 * Order Priority Enum
 */
export enum OrderPriority {
  NORMAL = "normal",
  EXPRESS = "express",
  URGENT = "urgent",
}

/**
 * Order Type Enum
 */
export enum OrderType {
  NEW_CLOTHING = "new_clothing",
  ALTERATION = "alteration",
  REPAIR = "repair",
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = "pending",
  DEPOSIT_PAID = "deposit_paid",
  FULLY_PAID = "fully_paid",
  REFUNDED = "refunded",
}

/**
 * Order Item Model
 */
export const OrderItemModel = types
  .model("OrderItem")
  .props({
    id: types.identifier,
    orderId: types.string,
    itemType: types.enumeration([
      "suit",
      "shirt",
      "trouser",
      "dress",
      "blouse",
      "skirt",
      "traditional",
      "other",
    ]),
    quantity: types.number,
    fabricId: types.maybeNull(types.string),
    designStyle: types.maybeNull(types.string),
    itemPrice: types.number,
    totalPrice: types.number,
    specifications: types.maybeNull(types.string),
    status: types.enumeration(["pending", "in_progress", "completed"]),
    createdAt: types.Date,
  })
  .actions(withSetPropAction)
  .views((self) => ({
    get formattedPrice() {
      return `₦${self.totalPrice.toLocaleString()}`
    },
    get isCompleted() {
      return self.status === "completed"
    },
  }))

/**
 * Order Message Model
 */
export const OrderMessageModel = types
  .model("OrderMessage")
  .props({
    id: types.identifier,
    orderId: types.string,
    senderId: types.string,
    recipientId: types.string,
    messageType: types.enumeration(["text", "image", "voice_note"]),
    content: types.maybeNull(types.string),
    attachmentId: types.maybeNull(types.string),
    isRead: types.boolean,
    readAt: types.maybeNull(types.Date),
    createdAt: types.Date,
  })
  .actions(withSetPropAction)
  .actions((self) => ({
    markAsRead() {
      self.isRead = true
      self.readAt = new Date()
    },
  }))

/**
 * Main Order Model
 */
export const OrderModel = types
  .model("Order")
  .props({
    id: types.identifier,
    orderNumber: types.string,
    customerId: types.string,
    tailorId: types.maybeNull(types.string),
    status: types.enumeration(Object.values(OrderStatus)),
    priority: types.enumeration(Object.values(OrderPriority)),
    orderType: types.enumeration(Object.values(OrderType)),
    measurementId: types.maybeNull(types.string),
    totalAmount: types.number,
    depositAmount: types.number,
    balanceAmount: types.number,
    currency: types.enumeration(["NGN", "USD", "GBP", "EUR"]),
    estimatedDelivery: types.maybeNull(types.Date),
    actualDelivery: types.maybeNull(types.Date),
    specialInstructions: types.maybeNull(types.string),
    internalNotes: types.maybeNull(types.string),
    fabricSource: types.enumeration(["customer", "tailor", "shop"]),
    paymentStatus: types.enumeration(Object.values(PaymentStatus)),
    items: types.array(OrderItemModel),
    messages: types.array(OrderMessageModel),
    createdAt: types.Date,
    updatedAt: types.Date,
    acceptedAt: types.maybeNull(types.Date),
    completedAt: types.maybeNull(types.Date),
  })
  .actions(withSetPropAction)
  .actions((self) => ({
    updateStatus(newStatus: OrderStatus) {
      self.status = newStatus
      self.updatedAt = new Date()

      if (newStatus === OrderStatus.ACCEPTED) {
        self.acceptedAt = new Date()
      } else if (newStatus === OrderStatus.DELIVERED) {
        self.completedAt = new Date()
        self.actualDelivery = new Date()
      }
    },

    assignTailor(tailorId: string) {
      self.tailorId = tailorId
      self.updatedAt = new Date()
    },

    addItem(item: SnapshotIn<typeof OrderItemModel>) {
      self.items.push(item)
      self.recalculateTotal()
    },

    removeItem(itemId: string) {
      const index = self.items.findIndex((item) => item.id === itemId)
      if (index !== -1) {
        self.items.splice(index, 1)
        self.recalculateTotal()
      }
    },

    recalculateTotal() {
      self.totalAmount = self.items.reduce((sum, item) => sum + item.totalPrice, 0)
      self.balanceAmount = self.totalAmount - self.depositAmount
      self.updatedAt = new Date()
    },

    updatePaymentStatus(status: PaymentStatus, depositAmount?: number) {
      self.paymentStatus = status
      if (depositAmount !== undefined) {
        self.depositAmount = depositAmount
        self.balanceAmount = self.totalAmount - depositAmount
      }
      self.updatedAt = new Date()
    },

    addMessage(message: SnapshotIn<typeof OrderMessageModel>) {
      self.messages.push(message)
    },

    updateFromRealtime(data: any) {
      // Update order properties from realtime event
      Object.keys(data).forEach((key) => {
        if (key in self && key !== "id" && key !== "items" && key !== "messages") {
          ;(self as any)[key] = data[key]
        }
      })
      self.updatedAt = new Date()
    },
  }))
  .views((self) => ({
    get formattedTotal() {
      const symbol =
        self.currency === "NGN"
          ? "₦"
          : self.currency === "USD"
            ? "$"
            : self.currency === "GBP"
              ? "£"
              : "€"
      return `${symbol}${self.totalAmount.toLocaleString()}`
    },

    get formattedBalance() {
      const symbol =
        self.currency === "NGN"
          ? "₦"
          : self.currency === "USD"
            ? "$"
            : self.currency === "GBP"
              ? "£"
              : "€"
      return `${symbol}${self.balanceAmount.toLocaleString()}`
    },

    get progressPercentage() {
      const statusOrder = [
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.MEASURING,
        OrderStatus.CUTTING,
        OrderStatus.SEWING,
        OrderStatus.FINISHING,
        OrderStatus.READY,
        OrderStatus.DELIVERED,
      ]
      const currentIndex = statusOrder.indexOf(self.status)
      return currentIndex === -1 ? 0 : Math.round((currentIndex / (statusOrder.length - 1)) * 100)
    },

    get isActive() {
      return ![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED].includes(
        self.status,
      )
    },

    get isPaid() {
      return self.paymentStatus === PaymentStatus.FULLY_PAID
    },

    get requiresPayment() {
      return (
        self.paymentStatus === PaymentStatus.PENDING ||
        (self.paymentStatus === PaymentStatus.DEPOSIT_PAID && self.balanceAmount > 0)
      )
    },

    get daysUntilDelivery() {
      if (!self.estimatedDelivery) return null
      const today = new Date()
      const delivery = new Date(self.estimatedDelivery)
      const diffTime = delivery.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    },

    get unreadMessageCount() {
      return self.messages.filter((m) => !m.isRead).length
    },
  }))

/**
 * Order Store Model
 */
export const OrderStoreModel = types
  .model("OrderStore")
  .props({
    orders: types.array(OrderModel),
    currentOrder: types.maybeNull(types.reference(OrderModel)),
    isLoading: false,
    error: types.maybeNull(types.string),
    filter: types.optional(types.enumeration(["all", "active", "completed", "cancelled"]), "all"),
    sortBy: types.optional(types.enumeration(["date", "status", "amount"]), "date"),
    isRealtimeConnected: false,
  })
  .actions(withSetPropAction)
  .actions((self) => {
    let realtimeUnsubscribe: (() => void) | null = null

    return {
      // Fetch orders from Appwrite
      fetchOrders: flow(function* (userId: string, userType: "customer" | "tailor") {
        self.isLoading = true
        self.error = null

        try {
          const queries =
            userType === "customer"
              ? [Query.equal("customerId", userId)]
              : [Query.equal("tailorId", userId)]

          queries.push(Query.orderDesc("createdAt"))
          queries.push(Query.limit(100))

          const response = yield databases.listDocuments(DATABASE_ID, "orders", queries)

          // Transform and set orders
          self.orders.clear()
          response.documents.forEach((doc: any) => {
            self.orders.push({
              ...doc,
              id: doc.$id,
              createdAt: new Date(doc.createdAt),
              updatedAt: new Date(doc.updatedAt),
              estimatedDelivery: doc.estimatedDelivery ? new Date(doc.estimatedDelivery) : null,
              actualDelivery: doc.actualDelivery ? new Date(doc.actualDelivery) : null,
              acceptedAt: doc.acceptedAt ? new Date(doc.acceptedAt) : null,
              completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
              items: doc.items || [],
              messages: doc.messages || [],
            })
          })

          self.isLoading = false
        } catch (error) {
          console.error("Failed to fetch orders:", error)
          self.error = error.message
          self.isLoading = false
        }
      }),

      // Create a new order
      createOrder: flow(function* (orderData: any) {
        self.isLoading = true
        self.error = null

        try {
          // Generate order number
          const orderNumber = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

          const newOrder = {
            ...orderData,
            orderNumber,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            balanceAmount: orderData.totalAmount - (orderData.depositAmount || 0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          const response = yield databases.createDocument(
            DATABASE_ID,
            "orders",
            ID.unique(),
            newOrder,
          )

          const order = {
            ...response,
            id: response.$id,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
            estimatedDelivery: response.estimatedDelivery
              ? new Date(response.estimatedDelivery)
              : null,
            items: [],
            messages: [],
          }

          self.orders.unshift(order)
          self.currentOrder = order.id
          self.isLoading = false

          return order
        } catch (error) {
          console.error("Failed to create order:", error)
          self.error = error.message
          self.isLoading = false
          throw error
        }
      }),

      // Update order status
      updateOrderStatus: flow(function* (orderId: string, newStatus: OrderStatus) {
        const order = self.orders.find((o) => o.id === orderId)
        if (!order) return

        try {
          const updateData: any = {
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }

          if (newStatus === OrderStatus.ACCEPTED) {
            updateData.acceptedAt = new Date().toISOString()
          } else if (newStatus === OrderStatus.DELIVERED) {
            updateData.completedAt = new Date().toISOString()
            updateData.actualDelivery = new Date().toISOString()
          }

          yield databases.updateDocument(DATABASE_ID, "orders", orderId, updateData)

          order.updateStatus(newStatus)
        } catch (error) {
          console.error("Failed to update order status:", error)
          self.error = error.message
          throw error
        }
      }),

      // Cancel order
      cancelOrder: flow(function* (orderId: string, reason?: string) {
        const order = self.orders.find((o) => o.id === orderId)
        if (!order) return

        // Check if order can be cancelled
        if (
          [
            OrderStatus.CUTTING,
            OrderStatus.SEWING,
            OrderStatus.FINISHING,
            OrderStatus.READY,
            OrderStatus.DELIVERED,
          ].includes(order.status)
        ) {
          throw new Error("Order cannot be cancelled at this stage")
        }

        try {
          yield databases.updateDocument(DATABASE_ID, "orders", orderId, {
            status: OrderStatus.CANCELLED,
            internalNotes: reason || "Cancelled by customer",
            updatedAt: new Date().toISOString(),
          })

          order.updateStatus(OrderStatus.CANCELLED)
        } catch (error) {
          console.error("Failed to cancel order:", error)
          self.error = error.message
          throw error
        }
      }),

      // Initialize realtime subscriptions
      initRealtime(userId: string) {
        // Subscribe to order updates
        const channel = `databases.${DATABASE_ID}.collections.orders.documents`

        realtimeUnsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<any>) => {
          if (response.payload.customerId === userId || response.payload.tailorId === userId) {
            const existingOrder = self.orders.find((o) => o.id === response.payload.$id)

            if (existingOrder) {
              // Update existing order
              existingOrder.updateFromRealtime(response.payload)
            } else if (response.events.includes("databases.*.collections.*.documents.*.create")) {
              // Add new order
              self.orders.unshift({
                ...response.payload,
                id: response.payload.$id,
                createdAt: new Date(response.payload.createdAt),
                updatedAt: new Date(response.payload.updatedAt),
                estimatedDelivery: response.payload.estimatedDelivery
                  ? new Date(response.payload.estimatedDelivery)
                  : null,
                actualDelivery: response.payload.actualDelivery
                  ? new Date(response.payload.actualDelivery)
                  : null,
                acceptedAt: response.payload.acceptedAt
                  ? new Date(response.payload.acceptedAt)
                  : null,
                completedAt: response.payload.completedAt
                  ? new Date(response.payload.completedAt)
                  : null,
                items: response.payload.items || [],
                messages: response.payload.messages || [],
              })
            }
          }
        })

        self.isRealtimeConnected = true
      },

      // Cleanup realtime subscriptions
      cleanupRealtime() {
        if (realtimeUnsubscribe) {
          realtimeUnsubscribe()
          realtimeUnsubscribe = null
        }
        self.isRealtimeConnected = false
      },

      // Set current order
      setCurrentOrder(orderId: string | null) {
        self.currentOrder = orderId
      },

      // Set filter
      setFilter(filter: "all" | "active" | "completed" | "cancelled") {
        self.filter = filter
      },

      // Set sort
      setSortBy(sortBy: "date" | "status" | "amount") {
        self.sortBy = sortBy
      },

      // Clear error
      clearError() {
        self.error = null
      },
    }
  })
  .views((self) => ({
    // Get order by ID
    getOrderById(id: string) {
      return self.orders.find((o) => o.id === id)
    },

    // Get filtered orders
    get filteredOrders() {
      let filtered = [...self.orders]

      // Apply filter
      switch (self.filter) {
        case "active":
          filtered = filtered.filter((o) => o.isActive)
          break
        case "completed":
          filtered = filtered.filter((o) => o.status === OrderStatus.DELIVERED)
          break
        case "cancelled":
          filtered = filtered.filter(
            (o) => o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED,
          )
          break
      }

      // Apply sort
      switch (self.sortBy) {
        case "status":
          filtered.sort((a, b) => a.status.localeCompare(b.status))
          break
        case "amount":
          filtered.sort((a, b) => b.totalAmount - a.totalAmount)
          break
        default: // date
          filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }

      return filtered
    },

    // Get active orders
    get activeOrders() {
      return self.orders.filter((o) => o.isActive)
    },

    // Get completed orders
    get completedOrders() {
      return self.orders.filter((o) => o.status === OrderStatus.DELIVERED)
    },

    // Get pending orders (for tailors)
    get pendingOrders() {
      return self.orders.filter((o) => o.status === OrderStatus.PENDING)
    },

    // Get total revenue (for tailors)
    get totalRevenue() {
      return self.completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    },

    // Get order statistics
    get statistics() {
      return {
        total: self.orders.length,
        active: self.activeOrders.length,
        completed: self.completedOrders.length,
        pending: self.pendingOrders.length,
        totalRevenue: self.totalRevenue,
      }
    },
  }))

// Instance types
export interface OrderStore extends Instance<typeof OrderStoreModel> {}
export interface OrderStoreSnapshot extends SnapshotOut<typeof OrderStoreModel> {}
export interface Order extends Instance<typeof OrderModel> {}
export interface OrderSnapshot extends SnapshotOut<typeof OrderModel> {}
