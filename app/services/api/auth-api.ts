/**
 * Authentication API Service
 *
 * Thin IAuthApiService implementation over the PocketBase auth adapter.
 * The app's primary auth flow lives in app/services/auth/AuthService.ts —
 * this service exists for the legacy service-registry surface and the
 * auth-token-provider, and simply delegates to PocketBase.
 */

import { ServiceResult } from "./base-api-service"
import { IAuthApiService } from "./service-types"
import { LoginRequest, LoginResponse, RegisterRequest } from "./api.types"
import {
  getPocketBaseAuthAdapter,
  PBUser,
} from "../pocketbase/pocketbase-auth-adapter"
import { pb } from "../pocketbase/pocketbase-client"

/**
 * Map a PocketBase user (+ current token) to the legacy LoginResponse shape.
 */
function toLoginResponse(user: PBUser): LoginResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.userType === "admin" ? "admin" : user.userType,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar || undefined,
      },
      emailVerified: user.verified,
    },
    session: {
      accessToken: pb.authStore.token,
      // PocketBase uses a single stateless token — no refresh token
      refreshToken: "",
      expiresAt: "",
    },
  }
}

export class AuthApiService implements IAuthApiService {
  private adapter = getPocketBaseAuthAdapter()

  async ping(): Promise<ServiceResult<boolean>> {
    return this.adapter.testConnection()
  }

  getStatus() {
    return {
      serviceName: "auth",
      baseEndpoint: "/auth",
      isAuthenticated: pb.authStore.isValid,
      isConfigured: true,
    }
  }

  async login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    const result = await this.adapter.login(credentials.email, credentials.password)
    if (!result.success) return result
    return { success: true, data: toLoginResponse(result.data.user) }
  }

  async register(userData: RegisterRequest): Promise<ServiceResult<LoginResponse>> {
    const result = await this.adapter.register({
      email: userData.email,
      password: userData.password,
      firstName: userData.profile.firstName,
      lastName: userData.profile.lastName,
      role: userData.role,
      phone: userData.profile.phone,
    })
    if (!result.success) return result
    return { success: true, data: toLoginResponse(result.data) }
  }

  async logout(): Promise<ServiceResult<void>> {
    return this.adapter.logout()
  }

  async refreshToken(): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    try {
      await pb.collection("users").authRefresh()
      return { success: true, data: { accessToken: pb.authStore.token, refreshToken: "" } }
    } catch {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "Session refresh failed",
      }
    }
  }

  async verifyToken(_token: string): Promise<ServiceResult<boolean>> {
    return { success: true, data: pb.authStore.isValid }
  }

  async forgotPassword(email: string): Promise<ServiceResult<void>> {
    return this.adapter.sendPasswordRecovery(email)
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResult<void>> {
    return this.adapter.completePasswordRecovery(token, newPassword)
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ServiceResult<void>> {
    const result = await this.adapter.updatePassword(newPassword, currentPassword)
    if (!result.success) return result
    return { success: true, data: undefined }
  }

  async getCurrentSession(): Promise<ServiceResult<LoginResponse>> {
    const result = await this.adapter.getCurrentUser()
    if (!result.success) return result
    return { success: true, data: toLoginResponse(result.data) }
  }

  async revokeAllSessions(): Promise<ServiceResult<void>> {
    // PocketBase tokens are stateless; the closest equivalent is logout
    return this.adapter.logout()
  }

  async sendVerificationEmail(): Promise<ServiceResult<void>> {
    return this.adapter.sendEmailVerification()
  }

  async verifyEmail(token: string): Promise<ServiceResult<void>> {
    return this.adapter.verifyEmail(token)
  }
}
