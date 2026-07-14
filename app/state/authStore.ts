/**
 * useAuthStore — Zustand replacement for the MST AuthStore.
 *
 * Owns authentication/session/user client state. Server identity remains the
 * PocketBase SDK + keychain (`SecureStorage`): raw tokens are NOT stored in the
 * persisted Zustand blob. Only `user` + `rememberUser` are persisted (see
 * `partialize`); on app start `checkAuthStatus` re-hydrates from the PocketBase
 * auth token, which stays the source of truth.
 *
 * Preserved verbatim from the MST store:
 *  - `mapPBUser` (avatar `""` not null, strict-ISO dates via `toISO`)
 *  - the Zod `validateUser()` gate inside `setUser`
 *  - `checkAuthStatus` hydrating the user from the PocketBase adapter token
 */

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { User, UserRole } from "@/models"
import { validateUser } from "@/models"
import { storage } from "@/utils/storage"
import { SecureStorage } from "@/utils/secure-storage"
import { mmkvPersist } from "./mmkv-persist"

// Import the PocketBase auth adapter lazily to avoid import cycles.
const {
  getPocketBaseAuthAdapter,
} = require("../services/pocketbase/pocketbase-auth-adapter")

type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated" | "expired"

interface Session {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  issuedAt: string | null
}

const emptySession: Session = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  issuedAt: null,
}

const createTimestamp = () => new Date().toISOString()

/** PB timestamps ("2026-07-12 02:27:42.145Z") → strict ISO for UserSchema */
const toISO = (value: any) => {
  const date = value ? new Date(value) : new Date()
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

/**
 * Map a PocketBase user record to the AuthUser shape.
 * Must satisfy UserSchema (setUser validates): phone/avatar are ""
 * rather than null, avatar must be a URL, dates strict ISO.
 */
const mapPBUser = (user: any, overrides: Partial<Record<string, any>> = {}): User =>
  ({
    id: user.id,
    email: user.email,
    role: (user.userType === "admin"
      ? "admin"
      : user.userType === "tailor"
        ? "tailor"
        : "client") as UserRole,
    status: user.status === "suspended" ? ("suspended" as const) : ("active" as const),
    profile: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      avatar: /^https?:\/\//.test(user.avatar || "") ? user.avatar : "",
    },
    preferences: {
      notifications: { email: true, push: true, sms: false },
      language: "en",
      timezone: "Africa/Lagos",
      currency: "NGN",
    },
    emailVerified: !!user.verified,
    lastLoginAt: new Date().toISOString(),
    createdAt: toISO(user.created),
    updatedAt: toISO(user.updated),
    ...overrides,
  }) as User

export interface AuthState {
  // State
  status: AuthStatus
  user: User | null
  session: Session
  isLoading: boolean
  error: string | null
  lastActivity: string | null
  sessionTimeout: number
  rememberUser: boolean

  // Helper mutators
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setStatus: (status: AuthStatus) => void
  updateLastActivity: () => void

  // Core mutators
  setUser: (userData: User) => void
  setSession: (sessionData: { accessToken: string; refreshToken: string; expiresAt: string }) => void
  clearAuth: () => void
  setRememberUser: (remember: boolean) => void
  updateUserProfile: (updates: Partial<User["profile"]>) => void
  updateUserPreferences: (updates: Partial<User["preferences"]>) => void

  // Async actions
  signIn: (credentials: { email: string; password: string }) => Promise<{ user: User; session: any }>
  signUp: (userData: {
    email: string
    password: string
    role: UserRole
    profile: { firstName: string; lastName: string; phone?: string }
  }) => Promise<{ user: User }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<{ session: any }>
  checkAuthStatus: () => Promise<void>
  verifyEmail: (userId: string, secret: string) => Promise<any>
  sendEmailVerification: () => Promise<any>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: "idle",
      user: null,
      session: { ...emptySession },
      isLoading: false,
      error: null,
      lastActivity: null,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      rememberUser: false,

      // Helper mutators
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setStatus: (status) => set({ status }),
      updateLastActivity: () => set({ lastActivity: createTimestamp() }),

      /**
       * Set user data after successful authentication.
       * Validates with Zod before storing (parity with the MST store).
       */
      setUser: (userData) => {
        const validatedUser = validateUser(userData) as User
        set({ user: validatedUser, status: "authenticated", lastActivity: createTimestamp() })

        // Store user data securely using keychain
        if (get().rememberUser) {
          SecureStorage.setUserProfile(validatedUser).catch((error) => {
            console.warn("Failed to store user data securely:", error)
            // Fallback to regular storage
            storage.set("auth.user", validatedUser)
          })
        }
      },

      /**
       * Set session data. Tokens live in the keychain, never the persisted blob.
       */
      setSession: (sessionData) => {
        set({
          session: {
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            expiresAt: sessionData.expiresAt,
            issuedAt: createTimestamp(),
          },
        })

        if (get().rememberUser) {
          SecureStorage.setAuthTokens({
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            expiresAt: sessionData.expiresAt,
          }).catch((error) => {
            console.warn("Failed to store session data securely:", error)
            storage.set("auth.session", { ...sessionData, issuedAt: createTimestamp() })
          })
        }
      },

      /**
       * Clear all authentication data.
       */
      clearAuth: () => {
        set({
          user: null,
          session: { ...emptySession },
          status: "unauthenticated",
          error: null,
          lastActivity: null,
        })

        SecureStorage.clearAll().catch((error) => {
          console.warn("Failed to clear secure storage:", error)
        })
        storage.remove("auth.user")
        storage.remove("auth.session")
        storage.remove("auth.rememberUser")
      },

      /**
       * Update user profile data.
       */
      updateUserProfile: (updates) => {
        const user = get().user
        if (!user) return
        set({
          user: {
            ...user,
            profile: { ...user.profile, ...updates },
            updatedAt: createTimestamp(),
          },
        })
      },

      /**
       * Update user preferences.
       */
      updateUserPreferences: (updates) => {
        const user = get().user
        if (!user) return
        set({
          user: {
            ...user,
            preferences: {
              ...user.preferences,
              ...updates,
              notifications: {
                ...user.preferences.notifications,
                ...(updates.notifications ?? {}),
              },
            },
            updatedAt: createTimestamp(),
          },
        })
      },

      /**
       * Set remember user preference.
       */
      setRememberUser: (remember) => {
        set({ rememberUser: remember })

        storage.set("auth.rememberUser", remember)

        const email = get().user?.email
        if (email) {
          SecureStorage.setUserCredentials(email, remember).catch((error) => {
            console.warn("Failed to store user credentials securely:", error)
          })
        }

        if (!remember) {
          SecureStorage.clearAll().catch((error) => {
            console.warn("Failed to clear secure storage:", error)
          })
          storage.remove("auth.user")
          storage.remove("auth.session")
        }
      },

      /**
       * Sign in with email/password via the PocketBase adapter.
       */
      signIn: async (credentials) => {
        const authAdapter = getPocketBaseAuthAdapter()
        set({ isLoading: true, error: null })
        try {
          const result = await authAdapter.login(credentials.email, credentials.password)
          if (!result.success) {
            throw new Error(result.message || "Invalid credentials")
          }

          const payload = {
            user: mapPBUser(result.data.user),
            session: {
              accessToken: result.data.token,
              refreshToken: result.data.token,
              // PocketBase auth tokens default to ~14 days; refreshed on app start
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }

          // Sessions persist by default (rememberUser only governs credential
          // autofill semantics) — set it before setUser so the profile persists.
          get().setRememberUser(true)
          get().setUser(payload.user)
          get().setSession(payload.session)
          return payload
        } catch (error: any) {
          set({ error: error?.message ? `Sign in failed: ${error.message}` : "Sign in failed" })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      /**
       * Register a new account. Does NOT auto-authenticate (verification flow).
       */
      signUp: async (userData) => {
        const authAdapter = getPocketBaseAuthAdapter()
        set({ isLoading: true, error: null })
        try {
          const result = await authAdapter.register({
            email: userData.email,
            password: userData.password,
            firstName: userData.profile.firstName,
            lastName: userData.profile.lastName,
            role: userData.role === "tailor" ? "tailor" : "client",
            phone: userData.profile.phone,
          })

          if (!result.success) {
            throw new Error(result.message || "Registration failed")
          }

          return { user: mapPBUser(result.data, { lastLoginAt: null }) }
        } catch (error: any) {
          set({ error: error?.message ? `Sign up failed: ${error.message}` : "Sign up failed" })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      /**
       * Sign out. Always clears local auth even if the remote call fails.
       */
      signOut: async () => {
        const authAdapter = getPocketBaseAuthAdapter()
        try {
          await authAdapter.logout()
        } finally {
          get().clearAuth()
        }
      },

      /**
       * Revalidate the stored PocketBase token and refresh the session window.
       */
      refreshSession: async () => {
        const authAdapter = getPocketBaseAuthAdapter()
        try {
          const result = await authAdapter.getCurrentUser()
          if (!result.success) {
            throw new Error(result.message || "Session refresh failed")
          }
          const session = {
            accessToken: "current",
            refreshToken: "current",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
          get().setSession(session)
          return { session }
        } catch (error) {
          // On refresh failure, clear auth
          get().clearAuth()
          throw error
        }
      },

      /**
       * Check if the user is still authenticated on app start. Sessions persist
       * by default: PocketBase keeps its auth token in MMKV, so if that token is
       * still valid we hydrate the user from it regardless of the rememberUser
       * flag (which only governs credential autofill semantics).
       */
      checkAuthStatus: async () => {
        console.log("🔍 AuthStore.checkAuthStatus: Starting...")
        set({ status: "checking", isLoading: true })

        try {
          const authAdapter = getPocketBaseAuthAdapter()
          const userResult = await authAdapter.getCurrentUser()

          if (userResult.success && userResult.data) {
            console.log("🔍 AuthStore.checkAuthStatus: Valid PocketBase session found")
            get().setUser(mapPBUser(userResult.data))
            get().setSession({
              accessToken: "current",
              refreshToken: "current",
              // PocketBase auth tokens default to ~14 days; refreshed on app start
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            })
            set({ status: "authenticated" })
            get().updateLastActivity()
            return
          }

          console.log("🔍 AuthStore.checkAuthStatus: No valid session, showing login")
          get().clearAuth()
          set({ status: "unauthenticated" })
        } catch (error) {
          console.error("🔍 AuthStore.checkAuthStatus: Error occurred:", error)
          get().clearAuth()
          set({ status: "unauthenticated" })
        } finally {
          console.log("🔍 AuthStore.checkAuthStatus: Completed, setting loading to false")
          set({ isLoading: false })
        }
      },

      /**
       * Send email verification.
       */
      sendEmailVerification: async () => {
        const authAdapter = getPocketBaseAuthAdapter()
        const result = await authAdapter.sendEmailVerification()
        if (!result.success) {
          throw new Error(result.message || "Failed to send verification email")
        }
        return result
      },

      /**
       * Verify email with token.
       */
      verifyEmail: async (userId, secret) => {
        const authAdapter = getPocketBaseAuthAdapter()
        const result = await authAdapter.verifyEmail(userId, secret)
        if (!result.success) {
          throw new Error(result.message || "Email verification failed")
        }

        const user = get().user
        if (user) {
          set({ user: { ...user, emailVerified: true, updatedAt: createTimestamp() } })
        }
        return result
      },
    }),
    {
      name: "auth-v2",
      storage: createJSONStorage(() => mmkvPersist),
      partialize: (state) => ({ user: state.user, rememberUser: state.rememberUser }),
    },
  ),
)

/* ------------------------------------------------------------------ *
 * Selector helpers — replace the MST derived views. Use as
 *   useAuthStore(selectIsAuthenticated)
 * or, off-hook, useAuthStore.getState() with the pure helpers.
 * ------------------------------------------------------------------ */

export const selectIsAuthenticated = (s: AuthState) =>
  s.status === "authenticated" && !!s.user

export const selectUserFullName = (s: AuthState) =>
  s.user ? `${s.user.profile.firstName} ${s.user.profile.lastName}` : ""

export const selectIsSessionExpiringSoon = (s: AuthState) => {
  if (!s.session.expiresAt) return false
  const expiresAt = new Date(s.session.expiresAt)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  return expiresAt <= fiveMinutesFromNow
}

export const hasRole = (user: User | null, role: UserRole) => user?.role === role

export const hasAnyRole = (user: User | null, roles: UserRole[]) =>
  user ? roles.includes(user.role) : false

export const getPermissions = (user: User | null): string[] => {
  if (!user) return []

  const basePermissions = ["profile:read", "profile:update"]

  switch (user.role) {
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
}
