/**
 * Authentication API Service
 *
 * Handles all authentication-related API operations including login, registration,
 * token management, and session handling following Infinite Red patterns.
 * Supports both traditional API and Appwrite backend integration.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IAuthApiService } from "./service-types"
import { LoginRequest, LoginResponse, RegisterRequest } from "./api.types"
import { getAppwriteAdapter, AppwriteApiAdapter } from "./appwrite-api-adapter"

/**
 * AuthAPI Service Implementation
 *
 * Provides comprehensive authentication functionality:
 * - User login and registration
 * - Token management and refresh
 * - Password reset and change
 * - Email verification
 * - Session management
 */
export class AuthApiService extends BaseApiService implements IAuthApiService {
  private appwriteAdapter: AppwriteApiAdapter

  constructor(api: any, authProvider?: any) {
    super(api, authProvider, "/auth")
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
      serviceName: "auth",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Email and password are required",
      }
    }

    // Use Appwrite authentication
    const sessionResult = await this.appwriteAdapter.createSession(credentials.email, credentials.password)
    
    if (!sessionResult.ok) {
      return {
        success: false,
        problem: { kind: sessionResult.problem || "unknown" },
        message: "Authentication failed",
      }
    }

    // Get user profile after successful login
    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unknown" },
        message: "Failed to get user profile",
      }
    }

    // Store session and return user data
    if (sessionResult.data && this.authProvider) {
      this.authProvider.setTokens?.(sessionResult.data.$id, sessionResult.data.$id)
    }

    const loginResponse: LoginResponse = {
      user: {
        id: userResult.data.$id,
        email: userResult.data.email,
        role: userResult.data.prefs?.role || "client",
        profile: userResult.data.prefs?.profile || {},
      },
      accessToken: sessionResult.data.$id,
      refreshToken: sessionResult.data.$id,
    }

    return { success: true, data: loginResponse }
  }

  /**
   * Register new user account
   */
  async register(userData: RegisterRequest): Promise<ServiceResult<LoginResponse>> {
    if (!userData.email || !userData.password || !userData.role || !userData.profile) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "All required fields must be provided",
      }
    }

    // Create account with Appwrite
    const accountResult = await this.appwriteAdapter.createAccount(
      userData.email,
      userData.password,
      userData.profile.name
    )

    if (!accountResult.ok) {
      return {
        success: false,
        problem: { kind: accountResult.problem || "unknown" },
        message: "Account creation failed",
      }
    }

    // Set user preferences (role and profile)
    const prefsResult = await this.appwriteAdapter.updateUserPrefs({
      role: userData.role,
      profile: userData.profile,
    })

    if (!prefsResult.ok) {
      console.warn("Failed to set user preferences:", prefsResult.problem)
    }

    // Create session after registration
    const sessionResult = await this.appwriteAdapter.createSession(userData.email, userData.password)

    if (!sessionResult.ok) {
      return {
        success: false,
        problem: { kind: sessionResult.problem || "unknown" },
        message: "Failed to create session after registration",
      }
    }

    // Store session and return user data
    if (sessionResult.data && this.authProvider) {
      this.authProvider.setTokens?.(sessionResult.data.$id, sessionResult.data.$id)
    }

    const loginResponse: LoginResponse = {
      user: {
        id: accountResult.data.$id,
        email: userData.email,
        role: userData.role,
        profile: userData.profile,
      },
      accessToken: sessionResult.data.$id,
      refreshToken: sessionResult.data.$id,
    }

    return { success: true, data: loginResponse }
  }

  /**
   * Logout current user session
   */
  async logout(): Promise<ServiceResult<void>> {
    const result = await this.appwriteAdapter.deleteSession()
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Logout failed",
      }
    }

    // Clear local auth tokens
    if (this.authProvider) {
      this.authProvider.clearTokens?.()
    }

    return { success: true, data: undefined }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    // Get current session from Appwrite
    const sessionResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!sessionResult.ok) {
      return {
        success: false,
        problem: { kind: sessionResult.problem || "unauthorized" },
        message: "Session expired or invalid",
      }
    }

    // For Appwrite, we don't need to manually refresh tokens
    // Session tokens are handled automatically by the SDK
    // Return current session info as token data
    return {
      success: true,
      data: {
        accessToken: sessionResult.data.$id,
        refreshToken: sessionResult.data.$id,
      },
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken(token: string): Promise<ServiceResult<boolean>> {
    if (!token) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Token is required",
      }
    }

    // For Appwrite, verify by checking current session
    const sessionResult = await this.appwriteAdapter.getCurrentUser()
    
    return {
      success: true,
      data: sessionResult.ok,
    }
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(email: string): Promise<ServiceResult<void>> {
    if (!email) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Email address is required",
      }
    }

    const result = await this.appwriteAdapter.createPasswordRecovery(email)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to send password reset email",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Reset password with reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<ServiceResult<void>> {
    if (!token || !newPassword) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Reset token and new password are required",
      }
    }

    // For Appwrite, we need userId and secret from the recovery URL
    // This is typically parsed from the reset link parameters
    const result = await this.appwriteAdapter.updatePasswordRecovery(token, newPassword)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to reset password",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!currentPassword || !newPassword) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Current password and new password are required",
      }
    }

    const result = await this.appwriteAdapter.updatePassword(newPassword, currentPassword)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to change password",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Get current user session information
   */
  async getCurrentSession(): Promise<ServiceResult<LoginResponse>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    const userResult = await this.appwriteAdapter.getCurrentUser()
    
    if (!userResult.ok) {
      return {
        success: false,
        problem: { kind: userResult.problem || "unauthorized" },
        message: "No active session found",
      }
    }

    const loginResponse: LoginResponse = {
      user: {
        id: userResult.data.$id,
        email: userResult.data.email,
        role: userResult.data.prefs?.role || "client",
        profile: userResult.data.prefs?.profile || {},
      },
      accessToken: userResult.data.$id,
      refreshToken: userResult.data.$id,
    }

    return { success: true, data: loginResponse }
  }

  /**
   * Revoke all user sessions (logout from all devices)
   */
  async revokeAllSessions(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    const result = await this.appwriteAdapter.deleteAllSessions()
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to revoke all sessions",
      }
    }

    // Clear local auth tokens
    if (this.authProvider) {
      this.authProvider.clearTokens?.()
    }

    return { success: true, data: undefined }
  }

  /**
   * Send email verification to current user
   */
  async sendVerificationEmail(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    const result = await this.appwriteAdapter.createEmailVerification()
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to send verification email",
      }
    }

    return { success: true, data: undefined }
  }

  /**
   * Verify email address with verification token
   */
  async verifyEmail(token: string): Promise<ServiceResult<void>> {
    if (!token) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Verification token is required",
      }
    }

    // For Appwrite, we need userId and secret from the verification URL
    // This is typically parsed from the verification link parameters
    const result = await this.appwriteAdapter.updateEmailVerification(token)
    
    if (!result.ok) {
      return {
        success: false,
        problem: { kind: result.problem || "unknown" },
        message: "Failed to verify email address",
      }
    }

    return { success: true, data: undefined }
  }
}
