/**
 * UserStore - User Profile and Preferences Management
 * Manages user profiles, preferences, settings, and client/tailor specific data
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, createCollectionModel, generateId, createTimestamp } from "../mst"
import { User, UserRole, UserAddress } from "../types"
import { validateUser, validateUserAddress } from "../schemas"

/**
 * MST model for user address
 */
const UserAddressModel = types.model("UserAddress", {
  id: types.string,
  type: types.enumeration("AddressType", ["home", "work", "billing", "shipping"]),
  street: types.string,
  city: types.string,
  state: types.string,
  zipCode: types.string,
  country: types.string,
  isDefault: types.boolean,
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * MST model for user profile with full details
 */
const UserProfileModel = types.model("UserProfile", {
  id: types.string,
  email: types.string,
  role: types.enumeration("UserRole", ["client", "tailor", "admin"]),
  status: types.enumeration("UserStatus", ["active", "inactive", "suspended"]),
  profile: types.model("ProfileDetails", {
    firstName: types.string,
    lastName: types.string,
    phone: types.maybeNull(types.string),
    avatar: types.maybeNull(types.string),
    dateOfBirth: types.maybeNull(types.string),
    gender: types.maybeNull(
      types.enumeration("Gender", ["male", "female", "other", "prefer_not_to_say"]),
    ),
    bio: types.maybeNull(types.string),
  }),
  addresses: types.array(UserAddressModel),
  preferences: types.model("UserPreferences", {
    notifications: types.model({
      email: types.boolean,
      push: types.boolean,
      sms: types.boolean,
    }),
    language: types.string,
    timezone: types.string,
    currency: types.string,
    theme: types.enumeration("Theme", ["light", "dark", "auto"]),
    measurementUnit: types.enumeration("MeasurementUnit", ["metric", "imperial"]),
  }),
  emailVerified: types.boolean,
  lastLoginAt: types.maybeNull(types.string),
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for managing multiple users (admin functionality)
 */
const UsersCollectionModel = createCollectionModel("UsersCollection", UserProfileModel)

/**
 * Main UserStore model
 */
export const UserStoreModel = types
  .model("UserStore", {
    // Current user profile (expanded from auth)
    currentUserProfile: types.maybeNull(UserProfileModel),

    // Users collection (for admin/tailor viewing clients)
    users: types.optional(UsersCollectionModel, {}),

    // Profile editing state
    isEditingProfile: types.optional(types.boolean, false),
    profileChanges: types.map(types.union(types.string, types.boolean, types.null)),

    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
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
       * Set current user profile
       */
      setCurrentUserProfile(userData: User) {
        const validatedUser = validateUser(userData)
        self.currentUserProfile = UserProfileModel.create(validatedUser)
        self.lastFetched = createTimestamp()
      },

      /**
       * Start profile editing mode
       */
      startEditingProfile() {
        if (self.currentUserProfile) {
          self.isEditingProfile = true
          self.profileChanges.clear()
        }
      },

      /**
       * Cancel profile editing
       */
      cancelEditingProfile() {
        self.isEditingProfile = false
        self.profileChanges.clear()
      },

      /**
       * Set a profile change for preview
       */
      setProfileChange(field: string, value: string | boolean | null) {
        self.profileChanges.set(field, value)
      },

      /**
       * Update profile field locally
       */
      updateProfileField(field: string, value: any) {
        if (!self.currentUserProfile) return

        const fieldPath = field.split(".")
        let target: any = self.currentUserProfile

        // Navigate to the nested field
        for (let i = 0; i < fieldPath.length - 1; i++) {
          target = target[fieldPath[i]]
          if (!target) return
        }

        // Update the final field
        const finalField = fieldPath[fieldPath.length - 1]
        target[finalField] = value
        self.currentUserProfile.updatedAt = createTimestamp()
      },

      /**
       * Add address to current user
       */
      addAddress(addressData: Omit<UserAddress, "id" | "createdAt" | "updatedAt">) {
        if (!self.currentUserProfile) return

        const validatedAddress = validateUserAddress({
          ...addressData,
          id: generateId(),
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })

        // If this is the first address or marked as default, set it as default
        if (self.currentUserProfile.addresses.length === 0 || addressData.isDefault) {
          // Unset other default addresses
          self.currentUserProfile.addresses.forEach((addr) => {
            addr.isDefault = false
          })
        }

        self.currentUserProfile.addresses.push(UserAddressModel.create(validatedAddress))
        self.currentUserProfile.updatedAt = createTimestamp()
      },

      /**
       * Update address
       */
      updateAddress(addressId: string, updates: Partial<UserAddress>) {
        if (!self.currentUserProfile) return

        const address = self.currentUserProfile.addresses.find((a) => a.id === addressId)
        if (address) {
          // If setting as default, unset others
          if (updates.isDefault === true) {
            self.currentUserProfile.addresses.forEach((addr) => {
              if (addr.id !== addressId) addr.isDefault = false
            })
          }

          Object.assign(address, updates, { updatedAt: createTimestamp() })
          self.currentUserProfile.updatedAt = createTimestamp()
        }
      },

      /**
       * Remove address
       */
      removeAddress(addressId: string) {
        if (!self.currentUserProfile) return

        const index = self.currentUserProfile.addresses.findIndex((a) => a.id === addressId)
        if (index !== -1) {
          const wasDefault = self.currentUserProfile.addresses[index].isDefault
          self.currentUserProfile.addresses.splice(index, 1)

          // If removed address was default and there are other addresses, set first as default
          if (wasDefault && self.currentUserProfile.addresses.length > 0) {
            self.currentUserProfile.addresses[0].isDefault = true
          }

          self.currentUserProfile.updatedAt = createTimestamp()
        }
      },

      /**
       * Update user preferences
       */
      updatePreferences(updates: Partial<User["preferences"]>) {
        if (!self.currentUserProfile) return

        const prefs = self.currentUserProfile.preferences

        if (updates.notifications) {
          Object.assign(prefs.notifications, updates.notifications)
        }
        if (updates.language !== undefined) prefs.language = updates.language
        if (updates.timezone !== undefined) prefs.timezone = updates.timezone
        if (updates.currency !== undefined) prefs.currency = updates.currency
        if (updates.theme !== undefined) prefs.theme = updates.theme
        if (updates.measurementUnit !== undefined) prefs.measurementUnit = updates.measurementUnit

        self.currentUserProfile.updatedAt = createTimestamp()
      },

      /**
       * Clear current user profile
       */
      clearCurrentUser() {
        self.currentUserProfile = null
        self.isEditingProfile = false
        self.profileChanges.clear()
      },
    }
  })
  .actions((self) => {
    // Async actions
    const fetchUserProfile = createAsyncAction(
      self,
      async (userId: string) => {
        const response = await fetch(`/api/users/${userId}`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user profile")
        }

        return response.json()
      },
      { errorPrefix: "Failed to load user profile" },
    )

    const updateUserProfile = createAsyncAction(
      self,
      async (userId: string, updates: Partial<User>) => {
        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error("Failed to update user profile")
        }

        return response.json()
      },
      { errorPrefix: "Failed to update profile" },
    )

    const uploadAvatar = createAsyncAction(
      self,
      async (userId: string, file: File) => {
        const formData = new FormData()
        formData.append("avatar", file)

        const response = await fetch(`/api/users/${userId}/avatar`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload avatar")
        }

        return response.json()
      },
      { errorPrefix: "Avatar upload failed" },
    )

    const fetchUsers = createAsyncAction(
      self,
      async (params: { page?: number; role?: UserRole; status?: string; search?: string } = {}) => {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.set("page", params.page.toString())
        if (params.role) queryParams.set("role", params.role)
        if (params.status) queryParams.set("status", params.status)
        if (params.search) queryParams.set("search", params.search)

        const response = await fetch(`/api/users?${queryParams}`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }

        return response.json()
      },
      { errorPrefix: "Failed to load users" },
    )

    return {
      /**
       * Load current user's full profile
       */
      loadUserProfile: flow(function* (userId: string) {
        try {
          const userData = yield fetchUserProfile(userId)
          self.setCurrentUserProfile(userData)
          return userData
        } catch (error) {
          throw error
        }
      }),

      /**
       * Save profile changes
       */
      saveProfileChanges: flow(function* () {
        if (!self.currentUserProfile || !self.isEditingProfile) return

        try {
          // Apply pending changes
          const changes: any = {}
          self.profileChanges.forEach((value, key) => {
            changes[key] = value
          })

          const updatedUser = yield updateUserProfile(self.currentUserProfile.id, changes)
          self.setCurrentUserProfile(updatedUser)
          self.cancelEditingProfile()
          return updatedUser
        } catch (error) {
          throw error
        }
      }),

      /**
       * Upload and update user avatar
       */
      updateAvatar: flow(function* (file: File) {
        if (!self.currentUserProfile) return

        try {
          const result = yield uploadAvatar(self.currentUserProfile.id, file)
          self.updateProfileField("profile.avatar", result.avatarUrl)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load users collection (admin/tailor functionality)
       */
      loadUsers: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchUsers(params)

          if (reset) {
            self.users.setItems(result.users)
          } else {
            self.users.addItems(result.users)
          }

          self.users.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Search users
       */
      searchUsers: flow(function* (query: string, filters: any = {}) {
        try {
          const result = yield fetchUsers({ ...filters, search: query, page: 1 })
          self.users.setItems(result.users)
          self.users.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),
    }
  })
  .views((self) => ({
    /**
     * Get current user's full name
     */
    get currentUserFullName() {
      if (!self.currentUserProfile) return ""
      return `${self.currentUserProfile.profile.firstName} ${self.currentUserProfile.profile.lastName}`
    },

    /**
     * Get current user's display name
     */
    get currentUserDisplayName() {
      if (!self.currentUserProfile) return ""
      return self.currentUserProfile.profile.firstName || self.currentUserProfile.email
    },

    /**
     * Get current user's default address
     */
    get defaultAddress() {
      if (!self.currentUserProfile) return null
      return (
        self.currentUserProfile.addresses.find((addr) => addr.isDefault) ||
        self.currentUserProfile.addresses[0] ||
        null
      )
    },

    /**
     * Check if current user has complete profile
     */
    get hasCompleteProfile() {
      if (!self.currentUserProfile) return false
      const profile = self.currentUserProfile.profile
      return !!(profile.firstName && profile.lastName && profile.phone)
    },

    /**
     * Get profile completion percentage
     */
    get profileCompletionPercentage() {
      if (!self.currentUserProfile) return 0

      const profile = self.currentUserProfile.profile
      const fields = [
        profile.firstName,
        profile.lastName,
        profile.phone,
        profile.avatar,
        profile.dateOfBirth,
        profile.bio,
      ]

      const completedFields = fields.filter((field) => field && field.trim().length > 0).length
      return Math.round((completedFields / fields.length) * 100)
    },

    /**
     * Check if user has pending profile changes
     */
    get hasPendingChanges() {
      return self.profileChanges.size > 0
    },

    /**
     * Get preview of profile with pending changes applied
     */
    get profilePreview() {
      if (!self.currentUserProfile) return null

      // Create a copy with pending changes applied
      const preview = { ...self.currentUserProfile }
      self.profileChanges.forEach((value, key) => {
        const fieldPath = key.split(".")
        let target: any = preview

        for (let i = 0; i < fieldPath.length - 1; i++) {
          target = target[fieldPath[i]]
        }

        const finalField = fieldPath[fieldPath.length - 1]
        target[finalField] = value
      })

      return preview
    },

    /**
     * Get users by role
     */
    getUsersByRole(role: UserRole) {
      return self.users.filter((user: any) => user.role === role)
    },

    /**
     * Get active users count
     */
    get activeUsersCount() {
      return self.users.filter((user: any) => user.status === "active").length
    },

    /**
     * Find user by ID
     */
    findUserById(userId: string) {
      return self.users.findById(userId)
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
 * Type definitions for UserStore
 */
export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshot extends SnapshotOut<typeof UserStoreModel> {}
