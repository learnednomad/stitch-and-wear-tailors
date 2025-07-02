/**
 * AuthStore - Authentication and User Session Management
 * Manages user authentication state, roles, permissions, and session data
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, generateId, createTimestamp } from "../mst"
import { User, UserRole } from "../types"
import { validateUser } from "../schemas"

/**
 * Authentication status enum
 */
const AuthStatus = types.enumeration("AuthStatus", [
  "idle", // Initial state
  "checking", // Checking existing session
  "authenticated", // User is logged in
  "unauthenticated", // User is not logged in
  "expired", // Session expired
])

/**
 * MST model for user data in auth context
 */
const AuthUserModel = types.model("AuthUser", {
  id: types.string,
  email: types.string,
  role: types.enumeration("UserRole", ["client", "tailor", "admin"]),
  status: types.enumeration("UserStatus", ["active", "inactive", "suspended"]),
  profile: types.model("UserProfile", {
    firstName: types.string,
    lastName: types.string,
    phone: types.maybeNull(types.string),
    avatar: types.maybeNull(types.string),
  }),
  preferences: types.model("UserPreferences", {
    notifications: types.model({
      email: types.boolean,
      push: types.boolean,
      sms: types.boolean,
    }),
    language: types.string,
    timezone: types.string,
    currency: types.string,
  }),
  emailVerified: types.boolean,
  lastLoginAt: types.maybeNull(types.string),
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Session model for managing authentication tokens and session data
 */
const SessionModel = types.model("Session", {
  accessToken: types.maybeNull(types.string),
  refreshToken: types.maybeNull(types.string),
  expiresAt: types.maybeNull(types.string),
  issuedAt: types.maybeNull(types.string),
})

/**
 * Main AuthStore model
 */
export const AuthStoreModel = types
  .model("AuthStore", {
    // Authentication state
    status: types.optional(AuthStatus, "idle"),
    user: types.maybeNull(AuthUserModel),
    session: types.optional(SessionModel, {}),

    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),

    // Session management
    lastActivity: types.maybeNull(types.string),
    sessionTimeout: types.optional(types.number, 30 * 60 * 1000), // 30 minutes

    // Remember me functionality
    rememberUser: types.optional(types.boolean, false),
  })
  .actions((self) => {
    // Helper actions for state management
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const updateLastActivity = () => {
      self.lastActivity = createTimestamp()
    }

    return {
      setLoading,
      setError,
      clearError,
      updateLastActivity,

      /**
       * Set authentication status
       */
      setStatus(status: "idle" | "checking" | "authenticated" | "unauthenticated" | "expired") {
        self.status = status
      },

      /**
       * Set user data after successful authentication
       */
      setUser(userData: User) {
        // Validate user data before setting
        const validatedUser = validateUser(userData)
        self.user = AuthUserModel.create(validatedUser)
        self.status = "authenticated"
        updateLastActivity()
      },

      /**
       * Set session data
       */
      setSession(sessionData: { accessToken: string; refreshToken: string; expiresAt: string }) {
        self.session = SessionModel.create({
          ...sessionData,
          issuedAt: createTimestamp(),
        })
      },

      /**
       * Clear all authentication data
       */
      clearAuth() {
        self.user = null
        self.session = SessionModel.create({})
        self.status = "unauthenticated"
        self.error = null
        self.lastActivity = null
      },

      /**
       * Update user profile data
       */
      updateUserProfile(updates: Partial<User["profile"]>) {
        if (self.user) {
          Object.assign(self.user.profile, updates)
          self.user.updatedAt = createTimestamp()
        }
      },

      /**
       * Update user preferences
       */
      updateUserPreferences(updates: Partial<User["preferences"]>) {
        if (self.user) {
          if (updates.notifications) {
            Object.assign(self.user.preferences.notifications, updates.notifications)
          }
          if (updates.language) self.user.preferences.language = updates.language
          if (updates.timezone) self.user.preferences.timezone = updates.timezone
          if (updates.currency) self.user.preferences.currency = updates.currency
          self.user.updatedAt = createTimestamp()
        }
      },

      /**
       * Set remember user preference
       */
      setRememberUser(remember: boolean) {
        self.rememberUser = remember
      },
    }
  })
  .actions((self) => {
    // Import Appwrite auth adapter
    const { getAppwriteAuthAdapter } = require("../../services/appwrite/appwrite-auth-adapter")

    // Async actions using our utility
    const signIn = createAsyncAction(
      self,
      async (credentials: { email: string; password: string }) => {
        const authAdapter = getAppwriteAuthAdapter()
        const result = await authAdapter.login(credentials.email, credentials.password)

        if (!result.success) {
          throw new Error(result.message || "Invalid credentials")
        }

        return {
          user: {
            id: result.data.user.$id,
            email: result.data.user.email,
            role: "client" as const, // Default role, will be enhanced with profile lookup
            status: "active" as const,
            profile: {
              firstName: result.data.user.name.split(" ")[0] || "",
              lastName: result.data.user.name.split(" ").slice(1).join(" ") || "",
              phone: result.data.user.phone || null,
              avatar: null,
            },
            preferences: {
              notifications: { email: true, push: true, sms: false },
              language: "en",
              timezone: "UTC",
              currency: "USD",
            },
            emailVerified: result.data.user.emailVerification,
            lastLoginAt: new Date().toISOString(),
            createdAt: result.data.user.registration,
            updatedAt: result.data.user.accessedAt,
          },
          session: {
            accessToken: result.data.session.$id,
            refreshToken: result.data.session.$id,
            expiresAt: result.data.session.expire,
          },
        }
      },
      { errorPrefix: "Sign in failed" },
    )

    const signUp = createAsyncAction(
      self,
      async (userData: {
        email: string
        password: string
        role: UserRole
        profile: { firstName: string; lastName: string }
      }) => {
        const authAdapter = getAppwriteAuthAdapter()
        const fullName = `${userData.profile.firstName} ${userData.profile.lastName}`

        const result = await authAdapter.register(userData.email, userData.password, fullName)

        if (!result.success) {
          throw new Error(result.message || "Registration failed")
        }

        return {
          user: {
            id: result.data.$id,
            email: result.data.email,
            role: userData.role,
            status: "active" as const,
            profile: userData.profile,
            preferences: {
              notifications: { email: true, push: true, sms: false },
              language: "en",
              timezone: "UTC",
              currency: "USD",
            },
            emailVerified: result.data.emailVerification,
            lastLoginAt: null,
            createdAt: result.data.registration,
            updatedAt: result.data.registration,
          },
        }
      },
      { errorPrefix: "Sign up failed" },
    )

    const refreshSession = createAsyncAction(
      self,
      async () => {
        if (!self.session.refreshToken) {
          throw new Error("No refresh token available")
        }

        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: self.session.refreshToken }),
        })

        if (!response.ok) {
          throw new Error("Token refresh failed")
        }

        return response.json()
      },
      { errorPrefix: "Session refresh failed", showLoading: false },
    )

    const signOut = createAsyncAction(
      self,
      async () => {
        const authAdapter = getAppwriteAuthAdapter()
        const result = await authAdapter.logout()

        if (!result.success) {
          throw new Error(result.message || "Sign out failed")
        }
      },
      { errorPrefix: "Sign out failed", handleErrors: false },
    )

    return {
      signIn: flow(function* (credentials: { email: string; password: string }) {
        try {
          const result = yield signIn(credentials)
          self.setUser(result.user)
          self.setSession(result.session)
          return result
        } catch (error) {
          throw error
        }
      }),

      signUp: flow(function* (userData: any) {
        try {
          const result = yield signUp(userData)
          self.setUser(result.user)
          self.setSession(result.session)
          return result
        } catch (error) {
          throw error
        }
      }),

      signOut: flow(function* () {
        try {
          yield signOut()
        } finally {
          self.clearAuth()
        }
      }),

      refreshSession: flow(function* () {
        try {
          const result = yield refreshSession()
          self.setSession(result.session)
          return result
        } catch (error) {
          // On refresh failure, clear auth
          self.clearAuth()
          throw error
        }
      }),

      /**
       * Check if user is still authenticated on app start
       */
      checkAuthStatus: flow(function* () {
        self.setStatus("checking")
        try {
          if (!self.session.accessToken) {
            self.setStatus("unauthenticated")
            return
          }

          // Check if token is expired
          if (self.session.expiresAt && new Date(self.session.expiresAt) <= new Date()) {
            yield self.refreshSession()
          }

          self.setStatus("authenticated")
          self.updateLastActivity()
        } catch (error) {
          self.setStatus("unauthenticated")
          self.clearAuth()
        }
      }),
    }
  })
  .views((self) => ({
    /**
     * Check if user is authenticated
     */
    get isAuthenticated() {
      return self.status === "authenticated" && !!self.user
    },

    /**
     * Check if user has a specific role
     */
    hasRole(role: UserRole) {
      return self.user?.role === role
    },

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(roles: UserRole[]) {
      return self.user ? roles.includes(self.user.role) : false
    },

    /**
     * Get user's full name
     */
    get userFullName() {
      if (!self.user) return ""
      return `${self.user.profile.firstName} ${self.user.profile.lastName}`
    },

    /**
     * Check if session is close to expiring
     */
    get isSessionExpiringSoon() {
      if (!self.session.expiresAt) return false
      const expiresAt = new Date(self.session.expiresAt)
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
      return expiresAt <= fiveMinutesFromNow
    },

    /**
     * Check if user has been inactive for too long
     */
    get isInactive() {
      if (!self.lastActivity) return false
      const lastActivityTime = new Date(self.lastActivity)
      const timeoutThreshold = new Date(Date.now() - self.sessionTimeout)
      return lastActivityTime <= timeoutThreshold
    },

    /**
     * Get user permissions based on role
     */
    get permissions() {
      if (!self.user) return []

      const basePermissions = ["profile:read", "profile:update"]

      switch (self.user.role) {
        case "admin":
          return [...basePermissions, "admin:*"]
        case "tailor":
          return [
            ...basePermissions,
            "orders:read",
            "orders:update",
            "orders:create",
            "measurements:read",
            "measurements:create",
            "measurements:update",
            "appointments:read",
            "appointments:create",
            "appointments:update",
            "invoices:read",
            "invoices:create",
            "invoices:update",
            "fabrics:read",
            "styles:read",
            "notifications:read",
            "feedback:read",
            "feedback:respond",
          ]
        case "client":
          return [
            ...basePermissions,
            "orders:read",
            "orders:create",
            "measurements:read",
            "appointments:read",
            "appointments:create",
            "invoices:read",
            "fabrics:read",
            "styles:read",
            "notifications:read",
            "feedback:create",
          ]
        default:
          return basePermissions
      }
    },

    /**
     * Check if user has a specific permission
     */
    hasPermission(permission: string) {
      return this.permissions.includes(permission) || this.permissions.includes("admin:*")
    },
  }))

/**
 * Type definitions for AuthStore
 */
export interface AuthStore extends Instance<typeof AuthStoreModel> {}
export interface AuthStoreSnapshot extends SnapshotOut<typeof AuthStoreModel> {}
