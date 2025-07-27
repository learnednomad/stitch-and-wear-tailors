/**
 * AuthStore - Authentication and User Session Management
 * Manages user authentication state, roles, permissions, and session data
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, generateId, createTimestamp } from "../mst"
import { User, UserRole } from "../types"
import { validateUser } from "../schemas"
import { storage } from "../../utils/storage"
import { SecureStorage } from "../../utils/secure-storage"

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
  .postProcessSnapshot((snapshot) => {
    // Initialize rememberUser from storage on creation
    try {
      const storedRemember = storage.getBoolean("auth.rememberUser")
      if (storedRemember !== undefined) {
        snapshot.rememberUser = storedRemember
      }
    } catch (error) {
      console.warn("Failed to load rememberUser from storage:", error)
    }
    return snapshot
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
        
        // Store user data securely using keychain
        if (self.rememberUser) {
          SecureStorage.setUserProfile(validatedUser).catch(error => {
            console.warn("Failed to store user data securely:", error)
            // Fallback to regular storage
            storage.set("auth.user", validatedUser)
          })
        }
      },

      /**
       * Set session data
       */
      setSession(sessionData: { accessToken: string; refreshToken: string; expiresAt: string }) {
        self.session = SessionModel.create({
          ...sessionData,
          issuedAt: createTimestamp(),
        })
        
        // Store session data securely using keychain
        if (self.rememberUser) {
          SecureStorage.setAuthTokens({
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            expiresAt: sessionData.expiresAt,
          }).catch(error => {
            console.warn("Failed to store session data securely:", error)
            // Fallback to regular storage
            storage.set("auth.session", {
              ...sessionData,
              issuedAt: createTimestamp(),
            })
          })
        }
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
        
        // Clear persisted data from both secure and regular storage
        SecureStorage.clearAll().catch(error => {
          console.warn("Failed to clear secure storage:", error)
        })
        storage.remove("auth.user")
        storage.remove("auth.session")
        storage.remove("auth.rememberUser")
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
        
        // Persist remember preference
        storage.set("auth.rememberUser", remember)
        
        // Store user credentials securely for auto-fill
        if (self.user?.email) {
          SecureStorage.setUserCredentials(self.user.email, remember).catch(error => {
            console.warn("Failed to store user credentials securely:", error)
          })
        }
        
        // If remember is disabled, clear persisted data
        if (!remember) {
          SecureStorage.clearAll().catch(error => {
            console.warn("Failed to clear secure storage:", error)
          })
          storage.remove("auth.user")
          storage.remove("auth.session")
        }
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
        console.log("🔄 AuthStore.refreshSession: Starting session refresh...")
        const authAdapter = getAppwriteAuthAdapter()
        
        // For Appwrite, we need to get the current session to refresh it
        const result = await authAdapter.getCurrentUser()
        
        if (!result.success) {
          console.error("🔄 AuthStore.refreshSession: Failed to get current user:", result.message)
          throw new Error(result.message || "Session refresh failed")
        }

        console.log("🔄 AuthStore.refreshSession: Session refresh successful")
        return {
          session: {
            accessToken: "current", // Appwrite uses "current" for active session
            refreshToken: "current",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          }
        }
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
        console.log("🔍 AuthStore.checkAuthStatus: Starting...")
        self.setStatus("checking")
        self.setLoading(true)
        
        try {
          console.log("🔍 AuthStore.checkAuthStatus: Restoring from storage...")
          // First, try to restore from persistent storage
          yield self.restoreFromStorage()
          
          if (!self.session.accessToken) {
            console.log("🔍 AuthStore.checkAuthStatus: No access token found")
            self.setStatus("unauthenticated")
            return
          }

          console.log("🔍 AuthStore.checkAuthStatus: Access token found, checking expiration...")
          // Check if token is expired
          if (self.session.expiresAt && new Date(self.session.expiresAt) <= new Date()) {
            console.log("🔍 AuthStore.checkAuthStatus: Token expired, attempting refresh...")
            try {
              yield self.refreshSession()
              console.log("🔍 AuthStore.checkAuthStatus: Token refresh successful")
            } catch (refreshError) {
              console.error("🔍 AuthStore.checkAuthStatus: Token refresh failed:", refreshError)
              // If refresh fails, clear auth and show as unauthenticated
              self.clearAuth()
              self.setStatus("unauthenticated")
              return
            }
          }

          console.log("🔍 AuthStore.checkAuthStatus: Authentication successful")
          self.setStatus("authenticated")
          self.updateLastActivity()
        } catch (error) {
          console.error("🔍 AuthStore.checkAuthStatus: Error occurred:", error)
          self.setStatus("unauthenticated")
          self.clearAuth()
        } finally {
          console.log("🔍 AuthStore.checkAuthStatus: Completed, setting loading to false")
          self.setLoading(false)
        }
      }),

      /**
       * Restore authentication state from persistent storage
       */
      restoreFromStorage: flow(function* () {
        try {
          console.log("🔄 AuthStore.restoreFromStorage: Starting...")
          
          // Check if user enabled remember me
          const rememberUser = storage.getBoolean("auth.rememberUser")
          if (!rememberUser) {
            console.log("🔄 AuthStore.restoreFromStorage: Remember me disabled")
            return
          }
          
          self.setRememberUser(true)
          
          // Try to restore from secure storage first
          const [secureTokens, secureProfile, secureCredentials] = yield Promise.all([
            SecureStorage.getAuthTokens(),
            SecureStorage.getUserProfile(),
            SecureStorage.getUserCredentials()
          ])
          
          console.log("🔄 AuthStore.restoreFromStorage: Secure storage results:", {
            hasTokens: !!secureTokens,
            hasProfile: !!secureProfile,
            hasCredentials: !!secureCredentials
          })
          
          // Restore user data (try secure storage first, fallback to regular storage)
          let userData = secureProfile
          if (!userData) {
            const storedUser = storage.getObject("auth.user")
            if (storedUser) {
              userData = storedUser
              console.log("🔄 AuthStore.restoreFromStorage: Using fallback user data from regular storage")
            }
          }
          
          if (userData) {
            self.setUser(userData as User)
            console.log("🔄 AuthStore.restoreFromStorage: User data restored")
          }
          
          // Restore session data (try secure storage first, fallback to regular storage)
          let sessionData = secureTokens
          if (!sessionData) {
            const storedSession = storage.getObject("auth.session")
            if (storedSession) {
              sessionData = storedSession
              console.log("🔄 AuthStore.restoreFromStorage: Using fallback session data from regular storage")
            }
          }
          
          if (sessionData) {
            self.setSession(sessionData as { accessToken: string; refreshToken: string; expiresAt: string })
            console.log("🔄 AuthStore.restoreFromStorage: Session data restored")
          }
          
          console.log("🔄 AuthStore.restoreFromStorage: Completed successfully")
        } catch (error) {
          console.warn("🔄 AuthStore.restoreFromStorage: Failed to restore auth from storage:", error)
          // Clear corrupted data
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
