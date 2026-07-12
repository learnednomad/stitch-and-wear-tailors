/**
 * User API Service
 *
 * IUserApiService implementation over PocketBase. Users live in the `users`
 * auth collection (fields: firstName, lastName, phone, userType, status,
 * businessName, location, bio, avatar).
 */

import { ServiceResult } from "./base-api-service"
import { IUserApiService } from "./service-types"
import { ApiResponse, SearchParams, UpdateUserProfileRequest } from "./api.types"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"
import { pb } from "../pocketbase/pocketbase-client"

export class UserApiService implements IUserApiService {
  private get adapter() {
    return getPocketBaseAdapter()
  }

  async ping(): Promise<ServiceResult<boolean>> {
    return this.adapter.testConnection()
  }

  getStatus() {
    return {
      serviceName: "user",
      baseEndpoint: "/users",
      isAuthenticated: !!this.adapter.currentUserId,
      isConfigured: true,
    }
  }

  /**
   * Profile for the given user (defaults to the current user).
   */
  async getProfile(userId?: string): Promise<ServiceResult<any>> {
    const id = userId || this.adapter.currentUserId
    if (!id) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    return this.adapter.getOne(COLLECTIONS.USERS, id)
  }

  /**
   * Update the current user's profile fields.
   */
  async updateProfile(updates: UpdateUserProfileRequest): Promise<ServiceResult<any>> {
    const id = this.adapter.currentUserId
    if (!id) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }

    const data: Record<string, any> = {}
    if (updates.profile?.firstName !== undefined) data.firstName = updates.profile.firstName
    if (updates.profile?.lastName !== undefined) data.lastName = updates.profile.lastName
    if (updates.profile?.phone !== undefined) data.phone = updates.profile.phone
    if (updates.profile?.bio !== undefined) data.bio = updates.profile.bio

    return this.adapter.update(COLLECTIONS.USERS, id, data)
  }

  /**
   * Upload an avatar image (multipart via the users file field).
   */
  async uploadAvatar(file: FormData): Promise<ServiceResult<{ url: string }>> {
    const id = this.adapter.currentUserId
    if (!id) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }

    const result = await this.adapter.update<any>(COLLECTIONS.USERS, id, file)
    if (!result.success) return result

    const url = result.data.avatar
      ? pb.files.getURL(result.data, result.data.avatar)
      : ""
    return { success: true, data: { url } }
  }

  /**
   * Delete the current user's account.
   */
  async deleteAccount(): Promise<ServiceResult<void>> {
    const id = this.adapter.currentUserId
    if (!id) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    const result = await this.adapter.remove(COLLECTIONS.USERS, id)
    if (result.success) pb.authStore.clear()
    return result
  }

  /**
   * Search users by name.
   */
  async searchUsers(params: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.listUsers(undefined, params)
  }

  /**
   * List tailors.
   */
  async getTailors(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.listUsers("tailor", params)
  }

  /**
   * List clients.
   */
  async getClients(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.listUsers("client", params)
  }

  private async listUsers(
    userType?: string,
    params?: SearchParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    const filter = filters.and(
      userType ? filters.eq("userType", userType) : "",
      params?.search
        ? filters.or(
            filters.like("firstName", params.search),
            filters.like("lastName", params.search),
            filters.like("businessName", params.search),
          )
        : "",
    )

    const result = await this.adapter.list(COLLECTIONS.USERS, {
      filter: filter || undefined,
      sort: "-created",
      page: params?.page ?? 1,
      perPage: params?.limit ?? 50,
    })
    if (!result.success) return result

    return {
      success: true,
      data: {
        success: true,
        data: result.data.items,
        meta: {
          page: result.data.page,
          totalPages: result.data.totalPages,
          totalItems: result.data.totalItems,
          hasMore: result.data.page < result.data.totalPages,
        },
      },
    }
  }

  // Follows are not modelled in the PocketBase schema yet — surface a clear
  // rejection instead of writing to a nonexistent collection.

  async followTailor(_tailorId: string): Promise<ServiceResult<void>> {
    return {
      success: false,
      problem: { kind: "rejected" },
      message: "Following tailors is not supported yet",
    }
  }

  async unfollowTailor(_tailorId: string): Promise<ServiceResult<void>> {
    return {
      success: false,
      problem: { kind: "rejected" },
      message: "Following tailors is not supported yet",
    }
  }

  async getFollowing(_userId?: string): Promise<ServiceResult<any[]>> {
    return { success: true, data: [] }
  }

  async getFollowers(_userId?: string): Promise<ServiceResult<any[]>> {
    return { success: true, data: [] }
  }
}
