import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { UserStoreModel } from "./stores/UserStore"
import { OrderStoreModel } from "./stores/OrderStore"
import { FabricStoreModel } from "./stores/FabricStore"
import { MeasurementStoreModel } from "./stores/MeasurementStore"
import { AppointmentStoreModel } from "./stores/AppointmentStore"
import { NotificationStoreModel } from "./stores/NotificationStore"

/**
 * A RootStore model integrating all domain stores
 */
export const RootStoreModel = types
  .model("RootStore")
  .props({
    userStore: types.optional(UserStoreModel, {}),
    orderStore: types.optional(OrderStoreModel, {
      statistics: {
        totalOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        revenue: 0,
        averageOrderValue: 0,
        lastUpdated: null,
      },
    }),
    fabricStore: types.optional(FabricStoreModel, {
      priceRange: {
        min: 0,
        max: 1000,
      },
    }),
    measurementStore: types.optional(MeasurementStoreModel, {
      validationSettings: {
        enableAutoValidation: true,
        significantChangeThreshold: 2,
        confidenceRequirement: "medium",
        requireVerification: false,
      },
    }),
    appointmentStore: types.optional(AppointmentStoreModel, {
      calendarView: {
        currentDate: new Date().toISOString().split("T")[0],
        viewMode: "week",
        selectedTailorId: null,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      bookingForm: {
        clientId: null,
        tailorId: null,
        type: null,
        duration: 60,
        title: null,
        description: null,
        requirements: {
          measurements: false,
          fabricSamples: false,
          garmentBringing: false,
        },
      },
      statistics: {
        totalAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        noShowRate: 0,
        averageRating: 0,
        lastUpdated: null,
      },
    }),
    notificationStore: types.optional(NotificationStoreModel, {
      permissions: {
        push: "default",
        email: true,
        sms: false,
      },
      statistics: {
        totalSent: 0,
        totalRead: 0,
        totalClicked: 0,
        readRate: 0,
        clickRate: 0,
        lastUpdated: null,
      },
    }),
  })
  .actions((self) => ({
    /**
     * Clear all user data on logout
     */
    clearUserData() {
      self.userStore.clearCurrentUser()
      self.orderStore.orders.setItems([])
      self.fabricStore.wishlist = null
      self.measurementStore.measurements.setItems([])
      self.measurementStore.currentMeasurement = null
      self.appointmentStore.appointments.setItems([])
      self.appointmentStore.currentAppointment = null
      self.notificationStore.notifications.setItems([])
      self.notificationStore.preferences = null
      self.notificationStore.unreadCount = 0
    },

    /**
     * Sync critical data periodically
     */
    async syncData() {
      const promises = []

      // Sync wishlist if exists
      if (self.fabricStore.wishlist) {
        promises.push(self.fabricStore.saveWishlist())
      }

      // Save current measurement if in session
      if (self.measurementStore.isInSession && self.measurementStore.currentMeasurement) {
        promises.push(self.measurementStore.saveMeasurement())
      }

      // Save notification preferences if changed
      if (self.notificationStore.preferences) {
        promises.push(self.notificationStore.savePreferences())
      }

      await Promise.allSettled(promises)
    },
  }))
  .views((self) => ({
    /**
     * Get full user profile from user store
     */
    get currentUserProfile() {
      return self.userStore.currentUserProfile
    },

    /**
     * Get user's wishlist count
     */
    get wishlistCount() {
      return self.fabricStore.wishlist?.count || 0
    },

    /**
     * Get pending orders count for dashboard
     */
    get pendingOrdersCount() {
      return self.orderStore.getNigerianOrdersByStatus("pending").length
    },

    /**
     * Get urgent orders count
     */
    get urgentOrdersCount() {
      return self.orderStore.urgentNigerianOrders.length
    },

    /**
     * Get unread notifications count
     */
    get unreadNotificationsCount() {
      return self.notificationStore.unreadCount
    },

    /**
     * Get today's appointments count
     */
    get todaysAppointmentsCount() {
      return self.appointmentStore.todaysAppointments.length
    },

    /**
     * Get current measurement session status
     */
    get isInMeasurementSession() {
      return self.measurementStore.isInSession
    },

    /**
     * Get incomplete measurements count
     */
    get incompleteMeasurementsCount() {
      return self.measurementStore.measurements.items.filter(
        (m: any) => !m.isComplete || !m.isValidated,
      ).length
    },

    /**
     * Check if any store is loading
     */
    get isLoading() {
      return (
        self.userStore.isLoading ||
        self.orderStore.isLoading ||
        self.fabricStore.isLoading ||
        self.measurementStore.isLoading ||
        self.appointmentStore.isLoading ||
        self.notificationStore.isLoading
      )
    },

    /**
     * Get any error from stores
     */
    get error() {
      return (
        self.userStore.error ||
        self.orderStore.error ||
        self.fabricStore.error ||
        self.measurementStore.error ||
        self.appointmentStore.error ||
        self.notificationStore.error
      )
    },

    /**
     * Clear all errors
     */
    clearErrors() {
      self.userStore.clearError()
      self.orderStore.clearError()
      self.fabricStore.clearError()
      self.measurementStore.clearError()
      self.appointmentStore.clearError()
      self.notificationStore.clearError()
    },
  }))

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
