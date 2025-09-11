/**
 * Core Authentication Service
 * Implements business logic for authentication flows
 */

import { Models, ID, Query } from "appwrite"
import { appwriteClient, appwriteAccount, appwriteDatabases } from "../appwrite/appwrite-client"
import { validateEmail } from "@/utils/emailValidation"
import { validatePassword } from "@/utils/passwordValidation"
import { RateLimiter } from "@/utils/rate-limiter"
import { ErrorHandler } from "@/utils/error-handler"
import SessionManager from "./SessionManager"
import TokenService from "./TokenService"
import EmailVerificationService from "./EmailVerificationService"
import Config from "@/config"

export interface RegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  userType: "client" | "tailor"
  phone?: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  deviceFingerprint?: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: Models.User<Models.Preferences>
    session: Models.Session
    accessToken: string
    refreshToken: string
  }
  error?: string
  requiresVerification?: boolean
  requires2FA?: boolean
}

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  userType: "client" | "tailor"
  phone?: string
  emailVerified: boolean
  status: "pending_verification" | "active" | "suspended" | "pending_tailor_approval"
  createdAt: string
  lastLoginAt?: string
}

class AuthService {
  private sessionManager: SessionManager
  private tokenService: TokenService
  private emailVerificationService: EmailVerificationService

  constructor() {
    this.sessionManager = new SessionManager()
    this.tokenService = new TokenService()
    this.emailVerificationService = new EmailVerificationService()
  }

  /**
   * Register a new user
   * Implements business flow from 01-user-registration-journey.md
   */
  async register(data: RegistrationData): Promise<AuthResponse> {
    try {
      // 1. Validate input data
      const validation = this.validateRegistrationData(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      // 2. Check rate limiting
      const rateLimitKey = `register_${data.email.toLowerCase()}`
      if (!RateLimiter.checkRegistrationAttempts(data.email)) {
        return {
          success: false,
          error: "Too many registration attempts. Please try again later.",
        }
      }

      // 3. Normalize data
      const normalizedEmail = data.email.trim().toLowerCase()
      const userId = ID.unique()

      // 4. Create Appwrite account
      const user = await appwriteAccount.create(
        userId,
        normalizedEmail,
        data.password,
        `${data.firstName} ${data.lastName}`,
      )

      // 5. Create user profile in database
      const profile = await this.createUserProfile({
        userId: user.$id,
        email: normalizedEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
        phone: data.phone,
        status: "pending_verification",
      })

      // 6. Send verification email
      await this.emailVerificationService.sendVerificationEmail(
        user.$id,
        normalizedEmail,
        data.firstName,
      )

      // 7. Reset rate limiting on success
      RateLimiter.resetRegistrationAttempts(normalizedEmail)

      // 8. Don't create session yet (email not verified)
      return {
        success: true,
        requiresVerification: true,
        data: {
          user,
          session: null,
          accessToken: null,
          refreshToken: null,
        },
      }
    } catch (error: any) {
      // Record failed attempt for rate limiting
      RateLimiter.recordFailedRegistration(data.email)

      // Handle specific Appwrite errors
      if (error.code === 409) {
        // User already exists - return generic error for security
        return {
          success: false,
          error: "We couldn't create your account. Please check your information and try again.",
        }
      }

      return {
        success: false,
        error: ErrorHandler.formatErrorMessage(error),
      }
    }
  }

  /**
   * User login
   * Implements business flow from 03-user-login-journey.md
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // 1. Validate input
      const validation = this.validateLoginCredentials(credentials)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      // 2. Check rate limiting
      const normalizedEmail = credentials.email.trim().toLowerCase()
      const rateLimitResult = RateLimiter.checkLoginAttempts(normalizedEmail)

      if (!rateLimitResult.allowed) {
        const timeRemaining = RateLimiter.getBlockTimeRemaining(`login_${normalizedEmail}`)
        return {
          success: false,
          error: `Too many failed attempts. Try again in ${RateLimiter.formatTimeRemaining(timeRemaining)}.`,
        }
      }

      // 3. Attempt login with Appwrite
      const session = await appwriteAccount.createEmailPasswordSession(
        normalizedEmail,
        credentials.password,
      )

      // 4. Get user account details
      const user = await appwriteAccount.get()

      // 5. Check email verification status
      if (!user.emailVerification) {
        // Logout the session immediately
        await appwriteAccount.deleteSession(session.$id)

        return {
          success: false,
          requiresVerification: true,
          error: "Please verify your email before signing in.",
        }
      }

      // 6. Get user profile from database
      const profile = await this.getUserProfile(user.$id)

      // 7. Check account status
      if (profile.status === "suspended") {
        await appwriteAccount.deleteSession(session.$id)
        return {
          success: false,
          error: "Your account has been suspended. Please contact support.",
        }
      }

      // 8. Risk assessment for 2FA requirement
      const riskScore = await this.calculateRiskScore({
        email: normalizedEmail,
        deviceFingerprint: credentials.deviceFingerprint,
        ip: await this.getClientIP(),
      })

      // 9. Check if 2FA is required
      if (riskScore > 30 || profile.has2FA) {
        // Store temporary session for 2FA
        await this.sessionManager.createPending2FASession(user.$id, session.$id)

        return {
          success: true,
          requires2FA: true,
          data: {
            user,
            session: null, // Don't return full session yet
            accessToken: null,
            refreshToken: null,
          },
        }
      }

      // 10. Generate tokens
      const tokens = await this.tokenService.generateTokenPair({
        userId: user.$id,
        sessionId: session.$id,
        userType: profile.userType,
        deviceFingerprint: credentials.deviceFingerprint,
      })

      // 11. Create session record
      await this.sessionManager.createSession({
        sessionId: session.$id,
        userId: user.$id,
        deviceFingerprint: credentials.deviceFingerprint,
        rememberMe: credentials.rememberMe || false,
        tokens,
      })

      // 12. Update last login
      await this.updateLastLogin(user.$id)

      // 13. Reset rate limiting on success
      RateLimiter.resetLoginAttempts(normalizedEmail)

      return {
        success: true,
        data: {
          user,
          session,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      }
    } catch (error: any) {
      // Record failed attempt
      RateLimiter.recordFailedLogin(credentials.email)

      // Handle specific errors
      if (error.code === 401) {
        return {
          success: false,
          error: "Invalid email or password.",
        }
      }

      return {
        success: false,
        error: ErrorHandler.formatErrorMessage(error),
      }
    }
  }

  /**
   * Logout user
   * Implements session termination from 07-session-management-logic.md
   */
  async logout(sessionId?: string, logoutAll: boolean = false): Promise<void> {
    try {
      if (logoutAll) {
        // Logout from all devices
        await appwriteAccount.deleteSessions()
        await this.sessionManager.revokeAllUserSessions(await this.getCurrentUserId())
      } else if (sessionId) {
        // Logout specific session
        await appwriteAccount.deleteSession(sessionId)
        await this.sessionManager.revokeSession(sessionId)
      } else {
        // Logout current session
        const currentSession = await appwriteAccount.getSession("current")
        await appwriteAccount.deleteSession(currentSession.$id)
        await this.sessionManager.revokeSession(currentSession.$id)
      }
    } catch (error) {
      console.error("Logout error:", error)
      // Even if logout fails, clear local state
    }
  }

  /**
   * Refresh access token
   * Implements token rotation from 07-session-management-logic.md
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // 1. Validate refresh token
      const validation = await this.tokenService.validateRefreshToken(refreshToken)
      if (!validation.valid) {
        return {
          success: false,
          error: "Invalid refresh token",
        }
      }

      // 2. Check if token was already used (potential theft)
      if (await this.tokenService.isTokenUsed(refreshToken)) {
        // Revoke entire token family for security
        await this.sessionManager.revokeTokenFamily(validation.sessionId)

        return {
          success: false,
          error: "Session security violation detected. Please login again.",
        }
      }

      // 3. Generate new token pair
      const newTokens = await this.tokenService.rotateTokens(refreshToken)

      // 4. Update session
      await this.sessionManager.updateSessionTokens(validation.sessionId, newTokens)

      // 5. Get current user and session
      const user = await appwriteAccount.get()
      const session = await appwriteAccount.getSession(validation.sessionId)

      return {
        success: true,
        data: {
          user,
          session,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to refresh token",
      }
    }
  }

  /**
   * Verify email address
   * Implements flow from 02-email-verification-process.md
   */
  async verifyEmail(userId: string, token: string): Promise<AuthResponse> {
    try {
      // Use the email verification service
      const result = await this.emailVerificationService.verifyEmail(userId, token)

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        }
      }

      // Update user profile status
      await this.updateUserStatus(userId, "active")

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: "Email verification failed",
      }
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<AuthResponse> {
    try {
      const result = await this.emailVerificationService.resendVerification(userId)

      return {
        success: result.success,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to resend verification email",
      }
    }
  }

  /**
   * Get user profile (public method)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profile = await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "user_profiles",
        userId,
      )

      return profile as unknown as UserProfile
    } catch (error) {
      console.error("Failed to get user profile:", error)
      return null
    }
  }

  // Private helper methods

  private validateRegistrationData(data: RegistrationData): { isValid: boolean; error?: string } {
    // Email validation
    const emailValidation = validateEmail(data.email)
    if (!emailValidation.isValid) {
      return { isValid: false, error: emailValidation.errors[0] }
    }

    // Password validation
    const passwordValidation = validatePassword(data.password)
    if (!passwordValidation.isValid) {
      return { isValid: false, error: "Password does not meet security requirements" }
    }

    // Name validation
    if (data.firstName.length < 2 || data.lastName.length < 2) {
      return { isValid: false, error: "Names must be at least 2 characters long" }
    }

    // User type validation
    if (!["client", "tailor"].includes(data.userType)) {
      return { isValid: false, error: "Invalid user type selected" }
    }

    return { isValid: true }
  }

  private validateLoginCredentials(credentials: LoginCredentials): {
    isValid: boolean
    error?: string
  } {
    if (!credentials.email || !credentials.password) {
      return { isValid: false, error: "Email and password are required" }
    }

    const emailValidation = validateEmail(credentials.email)
    if (!emailValidation.isValid) {
      return { isValid: false, error: "Invalid email format" }
    }

    return { isValid: true }
  }

  private async createUserProfile(data: any): Promise<UserProfile> {
    const profile = await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      data.userId,
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
        phone: data.phone,
        status: data.status,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
    )

    return profile as unknown as UserProfile
  }

  private async updateUserStatus(userId: string, status: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
      { status, emailVerified: status === "active" },
    )
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
      { lastLoginAt: new Date().toISOString() },
    )
  }

  private async calculateRiskScore(data: any): Promise<number> {
    // Simplified risk calculation
    // In production, this would involve more sophisticated analysis
    let score = 0

    // New device
    if (!data.deviceFingerprint) {
      score += 20
    }

    // Check for suspicious patterns
    // Add more risk factors as needed

    return score
  }

  private async getCurrentUserId(): Promise<string> {
    const user = await appwriteAccount.get()
    return user.$id
  }

  private async getClientIP(): Promise<string> {
    // In React Native, this would need to be obtained differently
    // For now, return a placeholder
    return "0.0.0.0"
  }

  /**
   * Create password recovery
   * Uses Appwrite's built-in password recovery flow
   */
  async createPasswordRecovery(email: string): Promise<AuthResponse> {
    try {
      // Validate email
      const emailValidation = validateEmail(email)
      if (!emailValidation.isValid) {
        return {
          success: false,
          error: emailValidation.errors[0],
        }
      }

      // Use a web URL that will redirect to your app
      const recoveryUrl = Config.PASSWORD_RECOVERY_URL || "https://stitchandwear.com/reset-password"

      await appwriteAccount.createRecovery(email.trim().toLowerCase(), recoveryUrl)

      return {
        success: true,
        data: {
          message: "Password reset instructions sent to your email",
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: ErrorHandler.formatErrorMessage(error),
      }
    }
  }

  /**
   * Update password using recovery token
   * Completes the password reset flow
   */
  async updatePassword(userId: string, secret: string, password: string): Promise<AuthResponse> {
    try {
      // Validate password
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors[0],
        }
      }

      await appwriteAccount.updateRecovery(userId, secret, password)

      return {
        success: true,
        data: {
          message: "Password updated successfully",
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: ErrorHandler.formatErrorMessage(error),
      }
    }
  }
}

export default new AuthService()
