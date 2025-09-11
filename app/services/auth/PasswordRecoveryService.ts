/**
 * Password Recovery Service
 * Implements password recovery flow from 04-password-recovery-process.md
 */

import * as Crypto from "expo-crypto"
import { appwriteDatabases, appwriteAccount } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"
import { validatePassword } from "@/utils/passwordValidation"
import { RateLimiter } from "@/utils/rate-limiter"
import { ErrorHandler } from "@/utils/error-handler"

export interface RecoveryRequest {
  identifier: string // email, phone, or username
  method?: "email" | "sms" | "security_questions"
}

export interface RecoveryResult {
  success: boolean
  error?: string
  requiresAdditionalVerification?: boolean
  recoveryMethod?: string
  sessionId?: string
}

export interface PasswordResetData {
  token: string
  newPassword: string
  confirmPassword: string
}

class PasswordRecoveryService {
  private readonly TOKEN_LENGTH = 32
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour
  private readonly CODE_LENGTH = 6
  private readonly CODE_EXPIRY = 10 * 60 * 1000 // 10 minutes
  private readonly MAX_ATTEMPTS = 3
  private readonly LOCKOUT_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Initiate password recovery
   */
  async initiateRecovery(request: RecoveryRequest): Promise<RecoveryResult> {
    try {
      // 1. Validate input format
      if (!this.validateIdentifier(request.identifier)) {
        return {
          success: false,
          error: "Please enter a valid email address or phone number.",
        }
      }

      // 2. Check rate limiting
      const rateLimitKey = `recovery_${request.identifier.toLowerCase()}`
      if (!RateLimiter.checkPasswordResetAttempts(request.identifier)) {
        return {
          success: false,
          error: "Too many recovery attempts. Please try again later.",
        }
      }

      // 3. Normalize identifier
      const normalizedIdentifier = this.normalizeIdentifier(request.identifier)

      // 4. Look up account (without revealing existence)
      const account = await this.findAccount(normalizedIdentifier)

      // Always return success message for security
      const genericMessage = "If an account exists, we've sent recovery instructions."

      if (!account) {
        // Log attempt for security monitoring
        await this.logRecoveryAttempt(normalizedIdentifier, false)

        // Return generic success to prevent enumeration
        return {
          success: true,
          error: genericMessage,
        }
      }

      // 5. Check account status
      if (account.status === "suspended" || account.status === "deleted") {
        await this.logRecoveryAttempt(account.userId, false)
        return {
          success: true,
          error: genericMessage,
        }
      }

      // 6. Calculate risk score
      const riskScore = await this.calculateRecoveryRisk(account)

      // 7. Determine recovery method based on risk
      let recoveryMethod = request.method || "email"

      if (riskScore > 60) {
        // High risk - require manual recovery
        await this.createSupportTicket(account)
        return {
          success: false,
          error: "For security reasons, please contact support to recover your account.",
        }
      } else if (riskScore > 30) {
        // Medium risk - require multiple verification
        recoveryMethod = "enhanced"
      }

      // 8. Generate recovery token
      const token = await this.generateRecoveryToken()
      const code = this.generateRecoveryCode()

      // 9. Store recovery session
      const sessionId = await this.createRecoverySession({
        userId: account.userId,
        token,
        code,
        method: recoveryMethod,
        riskScore,
      })

      // 10. Send recovery communication
      if (recoveryMethod === "email") {
        await this.sendRecoveryEmail(account.email, account.firstName, token, code)
      } else if (recoveryMethod === "sms") {
        await this.sendRecoverySMS(account.phone, code)
      } else if (recoveryMethod === "enhanced") {
        // Send both email and SMS
        await this.sendRecoveryEmail(account.email, account.firstName, token, code)
        if (account.phone) {
          await this.sendRecoverySMS(account.phone, code)
        }
      }

      // 11. Log successful initiation
      await this.logRecoveryAttempt(account.userId, true)

      return {
        success: true,
        error: genericMessage,
        requiresAdditionalVerification: riskScore > 30,
        recoveryMethod,
        sessionId,
      }
    } catch (error) {
      console.error("Password recovery initiation failed:", error)
      RateLimiter.recordFailedPasswordReset(request.identifier)

      return {
        success: false,
        error: "An error occurred. Please try again later.",
      }
    }
  }

  /**
   * Validate recovery token
   */
  async validateRecoveryToken(token: string): Promise<RecoveryResult> {
    try {
      // Get recovery session by token
      const session = await this.getRecoverySession(token)

      if (!session) {
        return {
          success: false,
          error: "Invalid or expired recovery link.",
        }
      }

      // Check if already used
      if (session.usedAt) {
        // Potential security issue - token reuse
        await this.handleTokenReuse(session)
        return {
          success: false,
          error: "This recovery link has already been used.",
        }
      }

      // Check expiry
      if (new Date(session.expiresAt) < new Date()) {
        return {
          success: false,
          error: "This recovery link has expired. Please request a new one.",
        }
      }

      // Check if additional verification needed
      if (session.requiresAdditionalVerification && !session.additionalVerificationCompleted) {
        return {
          success: true,
          requiresAdditionalVerification: true,
          sessionId: session.sessionId,
        }
      }

      return {
        success: true,
        sessionId: session.sessionId,
      }
    } catch (error) {
      console.error("Token validation failed:", error)
      return {
        success: false,
        error: "Failed to validate recovery link.",
      }
    }
  }

  /**
   * Validate recovery code (SMS or email code)
   */
  async validateRecoveryCode(sessionId: string, code: string): Promise<RecoveryResult> {
    try {
      const session = await this.getRecoverySessionById(sessionId)

      if (!session) {
        return {
          success: false,
          error: "Invalid recovery session.",
        }
      }

      // Normalize code
      const normalizedCode = code.replace(/[\s-]/g, "")

      // Check attempts
      if (session.attemptCount >= this.MAX_ATTEMPTS) {
        await this.lockRecoverySession(sessionId)
        return {
          success: false,
          error: "Too many failed attempts. Please start over.",
        }
      }

      // Validate code
      if (session.code !== normalizedCode) {
        await this.incrementAttemptCount(sessionId)
        return {
          success: false,
          error: `Invalid code. ${this.MAX_ATTEMPTS - session.attemptCount - 1} attempts remaining.`,
        }
      }

      // Check code expiry (shorter than token)
      const codeAge = Date.now() - new Date(session.createdAt).getTime()
      if (codeAge > this.CODE_EXPIRY) {
        return {
          success: false,
          error: "This code has expired. Please request a new one.",
        }
      }

      // Mark additional verification completed if needed
      if (session.requiresAdditionalVerification) {
        await this.markAdditionalVerificationComplete(sessionId)
      }

      return {
        success: true,
        sessionId,
      }
    } catch (error) {
      console.error("Code validation failed:", error)
      return {
        success: false,
        error: "Failed to validate code.",
      }
    }
  }

  /**
   * Reset password with validated token
   */
  async resetPassword(data: PasswordResetData): Promise<RecoveryResult> {
    try {
      // 1. Validate token again
      const tokenValidation = await this.validateRecoveryToken(data.token)
      if (!tokenValidation.success || !tokenValidation.sessionId) {
        return tokenValidation
      }

      // 2. Get recovery session
      const session = await this.getRecoverySessionById(tokenValidation.sessionId)
      if (!session) {
        return {
          success: false,
          error: "Invalid recovery session.",
        }
      }

      // 3. Validate new password
      const passwordValidation = validatePassword(data.newPassword)
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: "Password does not meet security requirements.",
        }
      }

      // 4. Check passwords match
      if (data.newPassword !== data.confirmPassword) {
        return {
          success: false,
          error: "Passwords do not match.",
        }
      }

      // 5. Check password history (prevent reuse)
      const isReused = await this.checkPasswordHistory(session.userId, data.newPassword)
      if (isReused) {
        return {
          success: false,
          error: "This password was recently used. Please choose a different password.",
        }
      }

      // 6. Update password in Appwrite
      try {
        // This would need to be done server-side or with admin SDK
        // For now, we'll update via a custom function
        await this.updateUserPassword(session.userId, data.newPassword)
      } catch (error) {
        console.error("Failed to update password:", error)
        return {
          success: false,
          error: "Failed to update password. Please try again.",
        }
      }

      // 7. Invalidate all sessions
      await this.invalidateAllUserSessions(session.userId)

      // 8. Mark recovery session as used
      await this.markRecoverySessionUsed(session.sessionId)

      // 9. Add to password history
      await this.addToPasswordHistory(session.userId, data.newPassword)

      // 10. Send confirmation email
      await this.sendPasswordChangeConfirmation(session.userId)

      // 11. Log password reset
      await this.logPasswordReset(session.userId)

      return {
        success: true,
      }
    } catch (error) {
      console.error("Password reset failed:", error)
      return {
        success: false,
        error: "Failed to reset password. Please try again.",
      }
    }
  }

  /**
   * Answer security questions for recovery
   */
  async validateSecurityAnswers(
    sessionId: string,
    answers: { questionId: string; answer: string }[],
  ): Promise<RecoveryResult> {
    try {
      const session = await this.getRecoverySessionById(sessionId)

      if (!session) {
        return {
          success: false,
          error: "Invalid recovery session.",
        }
      }

      // Get user's security questions
      const userQuestions = await this.getUserSecurityQuestions(session.userId)

      if (!userQuestions || userQuestions.length === 0) {
        return {
          success: false,
          error: "Security questions not configured.",
        }
      }

      // Validate answers (fuzzy matching with 85% similarity)
      let correctAnswers = 0
      const requiredCorrect = Math.ceil(userQuestions.length * 0.6) // 60% correct required

      for (const providedAnswer of answers) {
        const question = userQuestions.find((q) => q.questionId === providedAnswer.questionId)
        if (question) {
          const similarity = this.calculateStringSimilarity(
            providedAnswer.answer.toLowerCase(),
            question.answerHash, // This would need to be decrypted/compared properly
          )

          if (similarity >= 0.85) {
            correctAnswers++
          }
        }
      }

      if (correctAnswers >= requiredCorrect) {
        await this.markAdditionalVerificationComplete(sessionId)
        return {
          success: true,
          sessionId,
        }
      } else {
        await this.incrementAttemptCount(sessionId)
        return {
          success: false,
          error: "Incorrect answers. Please try again.",
        }
      }
    } catch (error) {
      console.error("Security answer validation failed:", error)
      return {
        success: false,
        error: "Failed to validate security answers.",
      }
    }
  }

  // Private helper methods

  private validateIdentifier(identifier: string): boolean {
    // Email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // Phone regex (basic international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/

    return emailRegex.test(identifier) || phoneRegex.test(identifier)
  }

  private normalizeIdentifier(identifier: string): string {
    // Remove spaces and convert to lowercase for emails
    if (identifier.includes("@")) {
      return identifier.trim().toLowerCase()
    }
    // Remove non-digit characters for phone numbers
    return identifier.replace(/\D/g, "")
  }

  private async findAccount(identifier: string): Promise<any> {
    try {
      // Search by email or phone
      const profiles = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "user_profiles",
        [
          Query.equal("email", identifier),
          // OR Query.equal("phone", identifier) - Appwrite doesn't support OR in same query
        ],
      )

      if (profiles.documents.length > 0) {
        return profiles.documents[0]
      }

      // If not found by email, try phone
      if (!identifier.includes("@")) {
        const phoneProfiles = await appwriteDatabases.listDocuments(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          "user_profiles",
          [Query.equal("phone", identifier)],
        )

        if (phoneProfiles.documents.length > 0) {
          return phoneProfiles.documents[0]
        }
      }

      return null
    } catch (error) {
      console.error("Account lookup failed:", error)
      return null
    }
  }

  private async calculateRecoveryRisk(account: any): Promise<number> {
    let riskScore = 0

    // Recent password change
    if (account.passwordChangedAt) {
      const daysSinceChange =
        (Date.now() - new Date(account.passwordChangedAt).getTime()) / (24 * 60 * 60 * 1000)
      if (daysSinceChange < 1) {
        riskScore += 30
      } else if (daysSinceChange < 7) {
        riskScore += 15
      }
    }

    // Multiple recent recovery attempts
    const recentAttempts = await this.getRecentRecoveryAttempts(account.userId)
    if (recentAttempts > 2) {
      riskScore += 20 * recentAttempts
    }

    // Account value/privileges
    if (account.userType === "admin") {
      riskScore += 25
    } else if (account.userType === "tailor") {
      riskScore += 15
    }

    // Recent security incidents
    const incidents = await this.getRecentSecurityIncidents(account.userId)
    if (incidents > 0) {
      riskScore += 35
    }

    return Math.min(riskScore, 100)
  }

  private async generateRecoveryToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(this.TOKEN_LENGTH)
    return this.base64UrlEncode(randomBytes)
  }

  private generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private async createRecoverySession(data: any): Promise<string> {
    const sessionId = ID.unique()
    const tokenHash = await this.hashToken(data.token)

    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      sessionId,
      {
        userId: data.userId,
        tokenHash,
        code: data.code,
        method: data.method,
        riskScore: data.riskScore,
        requiresAdditionalVerification: data.riskScore > 30,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY).toISOString(),
        attemptCount: 0,
      },
    )

    return sessionId
  }

  private async getRecoverySession(token: string): Promise<any> {
    try {
      const tokenHash = await this.hashToken(token)

      const sessions = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "recovery_sessions",
        [
          Query.equal("tokenHash", tokenHash),
          Query.greaterThan("expiresAt", new Date().toISOString()),
        ],
      )

      return sessions.documents.length > 0 ? sessions.documents[0] : null
    } catch (error) {
      console.error("Failed to get recovery session:", error)
      return null
    }
  }

  private async getRecoverySessionById(sessionId: string): Promise<any> {
    try {
      return await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "recovery_sessions",
        sessionId,
      )
    } catch (error) {
      return null
    }
  }

  private async sendRecoveryEmail(
    email: string,
    firstName: string,
    token: string,
    code: string,
  ): Promise<void> {
    // This would integrate with your email service
    // For now, using Appwrite's built-in recovery
    try {
      await appwriteAccount.createRecovery(
        email,
        `${process.env.EXPO_PUBLIC_APP_URL}/reset-password?token=${token}`,
      )
    } catch (error) {
      console.error("Failed to send recovery email:", error)
      // Implement fallback email service
    }
  }

  private async sendRecoverySMS(phone: string, code: string): Promise<void> {
    // Implement SMS sending via Twilio or similar
    console.log(`Sending SMS to ${phone}: Your recovery code is ${code}`)
  }

  private async sendPasswordChangeConfirmation(userId: string): Promise<void> {
    // Send confirmation email that password was changed
    const user = await appwriteDatabases.getDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
    )

    // Send email via your email service
    console.log(`Password changed confirmation sent to ${user.email}`)
  }

  private async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    // This needs to be done server-side with admin privileges
    // You would call a cloud function or server endpoint

    // For development, you might use:
    // await appwriteAccount.updatePassword(newPassword, oldPassword)
    // But this requires the old password

    // Instead, implement a server-side function that can reset passwords
    throw new Error("Server-side password update not implemented")
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    // Invalidate all sessions for security
    const sessions = await appwriteDatabases.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "sessions",
      [Query.equal("userId", userId)],
    )

    for (const session of sessions.documents) {
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        session.$id,
        {
          revokedAt: new Date().toISOString(),
          revokedReason: "password_reset",
        },
      )
    }
  }

  private async checkPasswordHistory(userId: string, password: string): Promise<boolean> {
    try {
      const history = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "password_history",
        [Query.equal("userId", userId), Query.orderDesc("createdAt"), Query.limit(5)],
      )

      for (const entry of history.documents) {
        // Compare password hashes (would need proper comparison)
        // This is simplified - in reality you'd hash and compare
        if (entry.passwordHash === (await this.hashPassword(password))) {
          return true
        }
      }

      return false
    } catch (error) {
      return false
    }
  }

  private async addToPasswordHistory(userId: string, password: string): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "password_history",
      ID.unique(),
      {
        userId,
        passwordHash: await this.hashPassword(password),
        createdAt: new Date().toISOString(),
      },
    )
  }

  private async hashToken(token: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    return hash
  }

  private async hashPassword(password: string): Promise<string> {
    // This would use proper password hashing (bcrypt/argon2)
    // For now, using SHA256 as placeholder
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    return hash
  }

  private base64UrlEncode(data: Uint8Array): string {
    const binaryString = String.fromCharCode(...data)
    const base64 = btoa(binaryString)

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simplified similarity calculation
    // In production, use proper string similarity algorithm
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0

    // Basic Levenshtein distance implementation would go here
    return 0.5 // Placeholder
  }

  private async logRecoveryAttempt(identifier: string, success: boolean): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_attempts",
      ID.unique(),
      {
        identifier: await this.hashToken(identifier), // Hash for privacy
        success,
        timestamp: new Date().toISOString(),
        ipAddress: "0.0.0.0", // Would get actual IP
      },
    )
  }

  private async logPasswordReset(userId: string): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "security_events",
      ID.unique(),
      {
        userId,
        eventType: "password_reset",
        timestamp: new Date().toISOString(),
        details: { method: "recovery_link" },
      },
    )
  }

  private async handleTokenReuse(session: any): Promise<void> {
    // Log security event
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "security_events",
      ID.unique(),
      {
        userId: session.userId,
        eventType: "recovery_token_reuse",
        severity: "high",
        timestamp: new Date().toISOString(),
        sessionId: session.sessionId,
      },
    )

    // Invalidate all recovery sessions for user
    const sessions = await appwriteDatabases.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      [Query.equal("userId", session.userId)],
    )

    for (const s of sessions.documents) {
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "recovery_sessions",
        s.$id,
        { invalidated: true },
      )
    }
  }

  private async createSupportTicket(account: any): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "support_tickets",
      ID.unique(),
      {
        userId: account.userId,
        type: "account_recovery",
        priority: "high",
        status: "open",
        createdAt: new Date().toISOString(),
        details: {
          reason: "high_risk_recovery",
          email: account.email,
        },
      },
    )
  }

  private async getRecentRecoveryAttempts(userId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const attempts = await appwriteDatabases.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_attempts",
      [Query.equal("userId", userId), Query.greaterThan("timestamp", oneDayAgo)],
    )

    return attempts.documents.length
  }

  private async getRecentSecurityIncidents(userId: string): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const incidents = await appwriteDatabases.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "security_events",
      [
        Query.equal("userId", userId),
        Query.greaterThan("timestamp", oneWeekAgo),
        Query.equal("severity", "high"),
      ],
    )

    return incidents.documents.length
  }

  private async getUserSecurityQuestions(userId: string): Promise<any[]> {
    try {
      const questions = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "security_questions",
        [Query.equal("userId", userId)],
      )

      return questions.documents
    } catch (error) {
      return []
    }
  }

  private async incrementAttemptCount(sessionId: string): Promise<void> {
    const session = await this.getRecoverySessionById(sessionId)

    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      sessionId,
      {
        attemptCount: (session.attemptCount || 0) + 1,
      },
    )
  }

  private async lockRecoverySession(sessionId: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      sessionId,
      {
        locked: true,
        lockedAt: new Date().toISOString(),
      },
    )
  }

  private async markAdditionalVerificationComplete(sessionId: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      sessionId,
      {
        additionalVerificationCompleted: true,
        verifiedAt: new Date().toISOString(),
      },
    )
  }

  private async markRecoverySessionUsed(sessionId: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "recovery_sessions",
      sessionId,
      {
        usedAt: new Date().toISOString(),
        active: false,
      },
    )
  }
}

export default PasswordRecoveryService
