/**
 * User API Service
 *
 * Handles all user-related API operations including profile management,
 * user search, relationships, and preferences following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IUserApiService } from "./service-types"
import { UpdateUserProfileRequest, ApiResponse, SearchParams } from "./api.types"
import { getAppwriteAdapter, AppwriteApiAdapter } from "./appwrite-api-adapter"
import { COLLECTION_IDS, BUCKET_IDS } from "../appwrite/appwrite-client"
import { Query } from "appwrite"

/**
 * UserAPI Service Implementation
 *
 * Provides comprehensive user management functionality:
 * - Profile operations (get, update, avatar upload)
 * - User search and listing
 * - User relationships (follow/unfollow tailors)
 * - Account management
 */
export class UserApiService extends BaseApiService implements IUserApiService {
  private appwriteAdapter: AppwriteApiAdapter

  constructor(api: any, authProvider?: any) {
    super(api, authProvider, "/users")
    this.appwriteAdapter = getAppwriteAdapter()
  }
  /**
   * Service health check
   */
  async ping(): Promise<ServiceResult<boolean>> {
    const result = await this.appwriteAdapter.testConnection()
    if (result.ok) {
      return { success: true, data: result.data?.success || false }
    }
    return { 
      success: false, 
      problem: { kind: result.problem || "unknown" }, 
      message: "Appwrite connection failed" 
    }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      serviceName: "user",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Get user profile information
   */
  async getProfile(userId?: string): Promise<ServiceResult<any>> {
    if (userId) {
      // Get specific user's profile from users collection
      const result = await this.appwriteAdapter.getDocument(COLLECTION_IDS.USERS, userId)
      
      if (!result.ok) {
        return {
          success: false,
          problem: { kind: result.problem || "unknown" },
          message: "Failed to get user profile",
        }
      }
      
      return { success: true, data: result.data }
    } else {
      // Get current user's profile (requires authentication)
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      const userResult = await this.appwriteAdapter.getCurrentUser()
      
      if (!userResult.ok) {
        return {
          success: false,
          problem: { kind: userResult.problem || "unauthorized" },
          message: "Failed to get current user",
        }
      }

      // Get extended profile from users collection
      const profileResult = await this.appwriteAdapter.getDocument(COLLECTION_IDS.USERS, userResult.data.$id)
      
      if (!profileResult.ok) {
        // Return basic profile from account if user document doesn't exist
        return {
          success: true,
          data: {
            id: userResult.data.$id,
            email: userResult.data.email,
            name: userResult.data.name,
            emailVerification: userResult.data.emailVerification,
            prefs: userResult.data.prefs,
          },
        }
      }
      
      return { success: true, data: profileResult.data }
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(updates: UpdateUserProfileRequest): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!updates.profile && !updates.preferences) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "At least one field must be provided for update",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const userId = userResult.data.$id

    // Update user preferences in account if provided
    if (updates.preferences) {
      const prefsResult = await this.appwriteAdapter.updateUserPrefs(updates.preferences)
      if (!prefsResult.ok) {
        console.warn("Failed to update user preferences:", prefsResult.problem)
      }
    }

    // Update profile in users collection if provided
    if (updates.profile) {
      const updateData = {
        ...updates.profile,
        updatedAt: new Date().toISOString(),
      }

      // Try to update existing document first
      const updateResult = await this.appwriteAdapter.updateDocument(
        COLLECTION_IDS.USERS,
        userId,
        updateData
      )

      if (!updateResult.ok) {
        // If update fails, try to create the document
        const createResult = await this.appwriteAdapter.createDocument(
          COLLECTION_IDS.USERS,
          {
            userId,
            email: userResult.data.email,
            role: userResult.data.prefs?.role || "client",
            ...updateData,
            createdAt: new Date().toISOString(),
          },
          userId
        )

        if (!createResult.ok) {
          return {
            success: false,
            problem: { kind: createResult.problem || "unknown" },
            message: "Failed to update user profile",
          }
        }

        return { success: true, data: createResult.data }
      }

      return { success: true, data: updateResult.data }
    }

    return { success: true, data: { updated: true } }
  }

  /**
   * Upload user avatar image
   */
  async uploadAvatar(file: File): Promise<ServiceResult<{ url: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!file) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "File is required for avatar upload",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const userId = userResult.data.$id

    // Upload file to avatars bucket
    const uploadResult = await this.appwriteAdapter.uploadFile(
      BUCKET_IDS.AVATARS,
      file,
      `avatar_${userId}`
    )

    if (!uploadResult.ok) {
      return {
        success: false,
        problem: { kind: uploadResult.problem || "unknown" },
        message: "Failed to upload avatar",
      }
    }

    // Get file URL
    const fileUrl = this.appwriteAdapter.getFileDownload(BUCKET_IDS.AVATARS, uploadResult.data.$id)

    // Update user profile with avatar URL
    const updateResult = await this.appwriteAdapter.updateDocument(
      COLLECTION_IDS.USERS,
      userId,
      {
        avatarUrl: fileUrl,
        avatarFileId: uploadResult.data.$id,
        updatedAt: new Date().toISOString(),
      }
    )

    if (!updateResult.ok) {
      console.warn("Failed to update user profile with avatar URL:", updateResult.problem)
    }

    return { success: true, data: { url: fileUrl } }
  }

  /**
   * Delete user account (requires authentication)
   */
  async deleteAccount(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const userId = userResult.data.$id

    // Delete user document from users collection
    const deleteUserResult = await this.appwriteAdapter.deleteDocument(COLLECTION_IDS.USERS, userId)
    
    if (!deleteUserResult.ok) {
      console.warn("Failed to delete user document:", deleteUserResult.problem)
    }

    // Delete all user sessions (logout from all devices)
    const deleteSessionsResult = await this.appwriteAdapter.deleteAllSessions()
    
    if (!deleteSessionsResult.ok) {
      return {
        success: false,
        problem: { kind: deleteSessionsResult.problem || "unknown" },
        message: "Failed to delete user sessions",
      }
    }

    // Note: Appwrite doesn't provide account deletion via client SDK
    // This would typically require a server function to permanently delete the account
    
    return { success: true, data: undefined }
  }

  /**
   * Search users with filters and pagination
   */
  async searchUsers(params: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const queryOptions = {
      queries: [],
      limit: params.limit || 50,
      offset: params.offset || 0,
    }

    // Add search queries based on params
    if (params.search) {
      queryOptions.queries.push(Query.search("name", params.search))
    }

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryOptions.queries.push(Query.equal(key, value))
        }
      })
    }

    // Add pagination
    if (queryOptions.limit) {
      queryOptions.queries.push(Query.limit(queryOptions.limit))
    }
    if (queryOptions.offset) {
      queryOptions.queries.push(Query.offset(queryOptions.offset))
    }

    const result = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.USERS, queryOptions)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to search users",
      }
    }

    const response: ApiResponse<any[]> = {
      data: result.data.documents,
      total: result.data.total,
      page: Math.floor((params.offset || 0) / (params.limit || 50)) + 1,
      limit: params.limit || 50,
      hasMore: (result.data.total || 0) > ((params.offset || 0) + (params.limit || 50)),
    }

    return { success: true, data: response }
  }

  /**
   * Get list of tailors with optional filters
   */
  async getTailors(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const searchParams = {
      ...params,
      filters: {
        ...params?.filters,
        role: "tailor",
      },
    }
    return this.searchUsers(searchParams)
  }

  /**
   * Get list of clients with optional filters
   */
  async getClients(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    const searchParams = {
      ...params,
      filters: {
        ...params?.filters,
        role: "client",
      },
    }
    return this.searchUsers(searchParams)
  }

  /**
   * Follow a tailor (for clients)
   */
  async followTailor(tailorId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    // Create follow relationship (you may want to create a separate follows collection)
    const followData = {
      followerId: userResult.data.$id,
      followingId: tailorId,
      createdAt: new Date().toISOString(),
    }

    const result = await this.appwriteAdapter.createDocument("follows", followData)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to follow tailor",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Unfollow a tailor (for clients)
   */
  async unfollowTailor(tailorId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    // Find and delete follow relationship
    const queryOptions = {
      queries: [
        Query.equal("followerId", userResult.data.$id),
        Query.equal("followingId", tailorId),
      ],
    }

    const followsResult = await this.appwriteAdapter.listDocuments("follows", queryOptions)
    
    if (!followsResult.ok || !followsResult.data.documents.length) {
      return {
        success: false,
        problem: { kind: "not_found" },
        message: "Follow relationship not found",
      }
    }

    const followId = followsResult.data.documents[0].$id
    const deleteResult = await this.appwriteAdapter.deleteDocument("follows", followId)
    
    if (!deleteResult.ok) {
      return {
        success: false,
        problem: { kind: deleteResult.problem || "unknown" },
        message: "Failed to unfollow tailor",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Get list of users being followed
   */
  async getFollowing(userId?: string): Promise<ServiceResult<any[]>> {
    let targetUserId = userId
    
    if (!targetUserId) {
      // Get current user's following list (requires authentication)
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      const userResult = await this.appwriteAdapter.getCurrentUser()
      
      if (!userResult.ok) {
        return {
          success: false,
          problem: { kind: userResult.problem || "unauthorized" },
          message: "Failed to get current user",
        }
      }
      
      targetUserId = userResult.data.$id
    }

    // Get follow relationships where user is the follower
    const queryOptions = {
      queries: [Query.equal("followerId", targetUserId)],
    }

    const followsResult = await this.appwriteAdapter.listDocuments("follows", queryOptions)
    
    if (!followsResult.ok) {
      return {
        success: false,
        problem: { kind: followsResult.problem || "unknown" },
        message: "Failed to get following list",
      }
    }

    // Extract the following user IDs and get their profiles
    const followingIds = followsResult.data.documents.map((follow: any) => follow.followingId)
    
    if (followingIds.length === 0) {
      return { success: true, data: [] }
    }

    // Get user profiles for all following users
    const usersQueryOptions = {
      queries: [Query.equal("$id", followingIds)],
    }

    const usersResult = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.USERS, usersQueryOptions)
    
    if (!usersResult.ok) {
      return {
        success: false,
        problem: { kind: usersResult.problem || "unknown" },
        message: "Failed to get user profiles",
      }
    }

    return { success: true, data: usersResult.data.documents }
  }

  /**
   * Get list of followers
   */
  async getFollowers(userId?: string): Promise<ServiceResult<any[]>> {
    let targetUserId = userId
    
    if (!targetUserId) {
      // Get current user's followers list (requires authentication)
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      const userResult = await this.appwriteAdapter.getCurrentUser()
      
      if (!userResult.ok) {
        return {
          success: false,
          problem: { kind: userResult.problem || "unauthorized" },
          message: "Failed to get current user",
        }
      }
      
      targetUserId = userResult.data.$id
    }

    // Get follow relationships where user is being followed
    const queryOptions = {
      queries: [Query.equal("followingId", targetUserId)],
    }

    const followsResult = await this.appwriteAdapter.listDocuments("follows", queryOptions)
    
    if (!followsResult.ok) {
      return {
        success: false,
        problem: { kind: followsResult.problem || "unknown" },
        message: "Failed to get followers list",
      }
    }

    // Extract the follower user IDs and get their profiles
    const followerIds = followsResult.data.documents.map((follow: any) => follow.followerId)
    
    if (followerIds.length === 0) {
      return { success: true, data: [] }
    }

    // Get user profiles for all followers
    const usersQueryOptions = {
      queries: [Query.equal("$id", followerIds)],
    }

    const usersResult = await this.appwriteAdapter.listDocuments(COLLECTION_IDS.USERS, usersQueryOptions)
    
    if (!usersResult.ok) {
      return {
        success: false,
        problem: { kind: usersResult.problem || "unknown" },
        message: "Failed to get user profiles",
      }
    }

    return { success: true, data: usersResult.data.documents }
  }

  /**
   * Get user statistics and metrics
   */
  async getUserStats(userId?: string): Promise<
    ServiceResult<{
      totalOrders: number
      completedOrders: number
      averageRating: number
      joinDate: string
      lastActive: string
    }>
  > {
    if (userId) {
      return this.get<any>(`/${userId}/stats`)
    } else {
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      return this.get<any>("/stats")
    }
  }

  /**
   * Get user reviews and ratings
   */
  async getUserReviews(
    userId?: string,
    params?: SearchParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (userId) {
      return this.getList<any>(`/${userId}/reviews`, params)
    } else {
      const authCheck = this.requireAuthentication()
      if (authCheck) return authCheck

      return this.getList<any>("/reviews", params)
    }
  }

  /**
   * Submit a review for a user (tailor or client)
   */
  async submitReview(
    userId: string,
    review: {
      rating: number
      comment: string
      orderId?: string
    },
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId || !review.rating || review.rating < 1 || review.rating > 5) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Valid user ID and rating (1-5) are required",
      }
    }

    // Get current user
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const reviewData = {
      reviewerId: userResult.data.$id,
      revieweeId: userId,
      rating: review.rating,
      comment: review.comment,
      orderId: review.orderId,
      createdAt: new Date().toISOString(),
    }

    const result = await this.appwriteAdapter.createDocument(COLLECTION_IDS.REVIEWS, reviewData)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to submit review",
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(preferences: {
    email?: boolean
    push?: boolean
    sms?: boolean
    orderUpdates?: boolean
    appointmentReminders?: boolean
    promotionalOffers?: boolean
  }): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Update user preferences in Appwrite account
    const currentPrefs = await this.appwriteAdapter.getCurrentUser()
    
    if (!currentPrefs.ok) {
      return {
        success: false,
        problem: { kind: currentPrefs.problem || "unauthorized" },
        message: "Failed to get current user",
      }
    }

    const updatedPrefs = {
      ...currentPrefs.data.prefs,
      notificationPreferences: {
        ...currentPrefs.data.prefs?.notificationPreferences,
        ...preferences,
      },
    }

    const result = await this.appwriteAdapter.updateUserPrefs(updatedPrefs)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to update notification preferences",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(): Promise<
    ServiceResult<{
      email: boolean
      push: boolean
      sms: boolean
      orderUpdates: boolean
      appointmentReminders: boolean
      promotionalOffers: boolean
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/preferences/notifications")
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(settings: {
    profileVisibility?: "public" | "private" | "followers_only"
    showEmail?: boolean
    showPhone?: boolean
    allowMessages?: boolean
    allowReviews?: boolean
  }): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.patch<void>("/preferences/privacy", settings)
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(): Promise<
    ServiceResult<{
      profileVisibility: "public" | "private" | "followers_only"
      showEmail: boolean
      showPhone: boolean
      allowMessages: boolean
      allowReviews: boolean
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/preferences/privacy")
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.post<void>(`/block/${userId}`)
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.delete<void>(`/block/${userId}`)
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<ServiceResult<any[]>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any[]>("/blocked")
  }
}
