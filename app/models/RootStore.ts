import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { AuthStoreModel } from "./stores/AuthStore"
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
    authStore: types.optional(AuthStoreModel, {}),
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
     * Initialize stores after authentication
     */
    async initializeUserStores(userId: string) {
      // Load user profile
      try {
        await self.userStore.loadUserProfile(userId)
      } catch (error) {
        console.warn("Failed to load user profile:", error)
      }

      // Initialize fabric wishlist
      self.fabricStore.initializeWishlist(userId)
      try {
        await self.fabricStore.loadWishlist(userId)
      } catch (error) {
        console.warn("Failed to load wishlist:", error)
      }

      // Load user's orders if they exist
      if (self.authStore.hasAnyRole(["client", "tailor"])) {
        try {
          const params = self.authStore.hasRole("client")
            ? { clientId: userId }
            : { tailorId: userId }
          await self.orderStore.loadNigerianOrders(params, true)
        } catch (error) {
          console.warn("Failed to load orders:", error)
        }
      }

      // Load measurement history for clients
      if (self.authStore.hasRole("client")) {
        try {
          await self.measurementStore.loadClientHistory(userId)
        } catch (error) {
          console.warn("Failed to load measurement history:", error)
        }
      }

      // Load measurement templates for tailors
      if (self.authStore.hasRole("tailor")) {
        try {
          await self.measurementStore.loadTemplates()
        } catch (error) {
          console.warn("Failed to load measurement templates:", error)
        }
      }

      // Load upcoming appointments
      try {
        const appointmentParams = self.authStore.hasRole("client")
          ? { clientId: userId }
          : { tailorId: userId }
        await self.appointmentStore.loadUpcomingAppointments(
          appointmentParams.clientId,
          appointmentParams.tailorId,
        )
      } catch (error) {
        console.warn("Failed to load appointments:", error)
      }

      // Initialize notification preferences and load recent notifications
      self.notificationStore.initializePreferences(userId)
      try {
        await self.notificationStore.loadPreferences(userId)
        await self.notificationStore.loadNotifications({ userId, page: 1 }, true)
      } catch (error) {
        console.warn("Failed to load notifications:", error)
      }
    },

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
      if (!self.authStore.isAuthenticated) return

      const promises = []

      // Sync wishlist if exists
      if (self.fabricStore.wishlist) {
        promises.push(self.fabricStore.saveWishlist())
      }

      // Refresh auth if session is expiring soon
      if (self.authStore.isSessionExpiringSoon) {
        promises.push(self.authStore.refreshSession())
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
     * Get current user info from auth store
     */
    get currentUser() {
      return self.authStore.user
    },

    /**
     * Get full user profile from user store
     */
    get currentUserProfile() {
      return self.userStore.currentUserProfile
    },

    /**
     * Check if user is authenticated
     */
    get isAuthenticated() {
      return self.authStore.isAuthenticated
    },

    /**
     * Get user's role
     */
    get userRole() {
      return self.authStore.user?.role
    },

    /**
     * Check if user has specific role
     */
    hasRole(role: string) {
      return self.authStore.hasRole(role as any)
    },

    /**
     * Get orders relevant to current user
     */
    get userOrders() {
      if (!self.authStore.user) return []

      if (self.authStore.hasRole("client")) {
        return self.orderStore.getOrdersByUser(self.authStore.user.id)
      } else if (self.authStore.hasRole("tailor")) {
        return self.orderStore.getOrdersByTailor(self.authStore.user.id)
      }

      return self.orderStore.orders.items
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
        self.authStore.isLoading ||
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
        self.authStore.error ||
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
      self.authStore.clearError()
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
