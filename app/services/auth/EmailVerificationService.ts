/**
 * Email Verification Service
 * Implements email verification flow from 02-email-verification-process.md
 */

import * as Crypto from "expo-crypto"
import { appwriteDatabases, appwriteAccount } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"

export interface VerificationToken {
  tokenId: string
  userId: string
  token: string
  code: string
  createdAt: string
  expiresAt: string
  usedAt?: string
  attemptCount: number
  tokenType: "registration" | "email_change" | "security"
}

export interface VerificationResult {
  success: boolean
  error?: string
  needsResend?: boolean
}

class EmailVerificationService {
  private readonly TOKEN_LENGTH = 32
  private readonly CODE_LENGTH = 6
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private readonly CODE_EXPIRY = 10 * 60 * 1000 // 10 minutes
  private readonly MAX_ATTEMPTS = 5
  private readonly RESEND_COOLDOWNS = [0, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000] // Progressive cooldowns

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    userName: string,
  ): Promise<VerificationResult> {
    try {
      // Check resend eligibility
      const resendCheck = await this.checkResendEligibility(userId)
      if (!resendCheck.allowed) {
        return {
          success: false,
          error: `Please wait ${resendCheck.waitTime} before requesting another verification email.`,
        }
      }

      // Invalidate existing tokens
      await this.invalidateExistingTokens(userId)

      // Generate new token and code
      const token = await this.generateVerificationToken()
      const code = this.generateVerificationCode()

      // Store token
      await this.storeVerificationToken({
        userId,
        token,
        code,
        tokenType: "registration",
      })

      // Send email via Appwrite
      try {
        await appwriteAccount.createVerification(
          `${process.env.EXPO_PUBLIC_APP_URL}/verify?token=${token}`,
        )
      } catch (appwriteError) {
        // Fallback to custom email service if needed
        console.error("Appwrite verification failed, using fallback:", appwriteError)
        // Implement custom email sending here
      }

      // Record send attempt
      await this.recordSendAttempt(userId)

      return { success: true }
    } catch (error) {
      console.error("Failed to send verification email:", error)
      return {
        success: false,
        error: "Failed to send verification email. Please try again.",
      }
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(userId: string, token: string): Promise<VerificationResult> {
    try {
      // Get stored token
      const storedToken = await this.getVerificationToken(userId, token)

      if (!storedToken) {
        return {
          success: false,
          error: "Invalid or expired verification link.",
        }
      }

      // Check if already used
      if (storedToken.usedAt) {
        return {
          success: false,
          error: "This verification link has already been used.",
        }
      }

      // Check expiry
      if (new Date(storedToken.expiresAt) < new Date()) {
        return {
          success: false,
          error: "This verification link has expired.",
          needsResend: true,
        }
      }

      // Mark token as used
      await this.markTokenUsed(storedToken.tokenId)

      // Update user verification status via Appwrite
      try {
        await appwriteAccount.updateVerification(userId, token)
      } catch (appwriteError) {
        console.error("Appwrite verification update failed:", appwriteError)
        // Update manually in database
        await this.updateUserVerificationStatus(userId, true)
      }

      // Clean up tokens
      await this.cleanupUserTokens(userId)

      return { success: true }
    } catch (error) {
      console.error("Email verification failed:", error)
      return {
        success: false,
        error: "Verification failed. Please try again.",
      }
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmailWithCode(userId: string, code: string): Promise<VerificationResult> {
    try {
      // Normalize code (remove spaces/hyphens)
      const normalizedCode = code.replace(/[\s-]/g, "")

      // Get active token for user
      const tokens = await this.getUserActiveTokens(userId)

      if (tokens.length === 0) {
        return {
          success: false,
          error: "No active verification code found.",
          needsResend: true,
        }
      }

      // Find matching code
      const matchingToken = tokens.find((t) => t.code === normalizedCode)

      if (!matchingToken) {
        // Increment attempt count
        await this.incrementAttemptCount(tokens[0].tokenId)

        // Check if locked out
        if (tokens[0].attemptCount >= this.MAX_ATTEMPTS - 1) {
          await this.lockVerification(userId)
          return {
            success: false,
            error: "Too many invalid attempts. Please request a new code.",
          }
        }

        return {
          success: false,
          error: `Invalid code. ${this.MAX_ATTEMPTS - tokens[0].attemptCount - 1} attempts remaining.`,
        }
      }

      // Check code expiry (shorter than token expiry)
      const codeAge = Date.now() - new Date(matchingToken.createdAt).getTime()
      if (codeAge > this.CODE_EXPIRY) {
        return {
          success: false,
          error: "This code has expired.",
          needsResend: true,
        }
      }

      // Mark as used and verify
      await this.markTokenUsed(matchingToken.tokenId)
      await this.updateUserVerificationStatus(userId, true)
      await this.cleanupUserTokens(userId)

      return { success: true }
    } catch (error) {
      console.error("Code verification failed:", error)
      return {
        success: false,
        error: "Verification failed. Please try again.",
      }
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(userId: string): Promise<VerificationResult> {
    return this.sendVerificationEmail(
      userId,
      await this.getUserEmail(userId),
      await this.getUserName(userId),
    )
  }

  // Private helper methods

  private async generateVerificationToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(this.TOKEN_LENGTH)
    return this.base64UrlEncode(randomBytes)
  }

  private generateVerificationCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    return `${code.slice(0, 3)}-${code.slice(3)}`
  }

  private async storeVerificationToken(data: {
    userId: string
    token: string
    code: string
    tokenType: "registration" | "email_change" | "security"
  }): Promise<void> {
    const tokenHash = await this.hashToken(data.token)

    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "verification_tokens",
      ID.unique(),
      {
        userId: data.userId,
        tokenHash,
        code: data.code,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY).toISOString(),
        attemptCount: 0,
        tokenType: data.tokenType,
      },
    )
  }

  private async getVerificationToken(
    userId: string,
    token: string,
  ): Promise<VerificationToken | null> {
    try {
      const tokenHash = await this.hashToken(token)

      const tokens = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "verification_tokens",
        [
          Query.equal("userId", userId),
          Query.equal("tokenHash", tokenHash),
          Query.greaterThan("expiresAt", new Date().toISOString()),
        ],
      )

      if (tokens.documents.length === 0) {
        return null
      }

      return tokens.documents[0] as unknown as VerificationToken
    } catch (error) {
      console.error("Failed to get verification token:", error)
      return null
    }
  }

  private async getUserActiveTokens(userId: string): Promise<VerificationToken[]> {
    try {
      const tokens = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "verification_tokens",
        [
          Query.equal("userId", userId),
          Query.isNull("usedAt"),
          Query.greaterThan("expiresAt", new Date().toISOString()),
        ],
      )

      return tokens.documents as unknown as VerificationToken[]
    } catch (error) {
      console.error("Failed to get active tokens:", error)
      return []
    }
  }

  private async invalidateExistingTokens(userId: string): Promise<void> {
    try {
      const tokens = await this.getUserActiveTokens(userId)

      for (const token of tokens) {
        await appwriteDatabases.updateDocument(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          "verification_tokens",
          token.tokenId,
          {
            invalidatedAt: new Date().toISOString(),
          },
        )
      }
    } catch (error) {
      console.error("Failed to invalidate tokens:", error)
    }
  }

  private async markTokenUsed(tokenId: string): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "verification_tokens",
      tokenId,
      {
        usedAt: new Date().toISOString(),
      },
    )
  }

  private async incrementAttemptCount(tokenId: string): Promise<void> {
    const token = await appwriteDatabases.getDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "verification_tokens",
      tokenId,
    )

    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "verification_tokens",
      tokenId,
      {
        attemptCount: (token.attemptCount || 0) + 1,
      },
    )
  }

  private async checkResendEligibility(
    userId: string,
  ): Promise<{ allowed: boolean; waitTime?: string }> {
    try {
      const attempts = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "verification_attempts",
        [Query.equal("userId", userId), Query.orderDesc("createdAt"), Query.limit(1)],
      )

      if (attempts.documents.length === 0) {
        return { allowed: true }
      }

      const lastAttempt = attempts.documents[0]
      const attemptCount = lastAttempt.attemptCount || 0
      const cooldownIndex = Math.min(attemptCount, this.RESEND_COOLDOWNS.length - 1)
      const cooldown = this.RESEND_COOLDOWNS[cooldownIndex]

      const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.createdAt).getTime()

      if (timeSinceLastAttempt < cooldown) {
        const waitTime = Math.ceil((cooldown - timeSinceLastAttempt) / 60000)
        return {
          allowed: false,
          waitTime: `${waitTime} minute${waitTime > 1 ? "s" : ""}`,
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error("Failed to check resend eligibility:", error)
      return { allowed: true }
    }
  }

  private async recordSendAttempt(userId: string): Promise<void> {
    try {
      const existing = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "verification_attempts",
        [Query.equal("userId", userId), Query.limit(1)],
      )

      if (existing.documents.length > 0) {
        await appwriteDatabases.updateDocument(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          "verification_attempts",
          existing.documents[0].$id,
          {
            attemptCount: (existing.documents[0].attemptCount || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
          },
        )
      } else {
        await appwriteDatabases.createDocument(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          "verification_attempts",
          ID.unique(),
          {
            userId,
            attemptCount: 1,
            createdAt: new Date().toISOString(),
            lastAttemptAt: new Date().toISOString(),
          },
        )
      }
    } catch (error) {
      console.error("Failed to record send attempt:", error)
    }
  }

  private async updateUserVerificationStatus(userId: string, verified: boolean): Promise<void> {
    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
      {
        emailVerified: verified,
        emailVerifiedAt: verified ? new Date().toISOString() : null,
        status: verified ? "active" : "pending_verification",
      },
    )
  }

  private async cleanupUserTokens(userId: string): Promise<void> {
    try {
      const tokens = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "verification_tokens",
        [Query.equal("userId", userId)],
      )

      for (const token of tokens.documents) {
        await appwriteDatabases.deleteDocument(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          "verification_tokens",
          token.$id,
        )
      }
    } catch (error) {
      console.error("Failed to cleanup tokens:", error)
    }
  }

  private async lockVerification(userId: string): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "verification_locks",
      ID.unique(),
      {
        userId,
        lockedAt: new Date().toISOString(),
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    )
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await appwriteDatabases.getDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
    )
    return user.email
  }

  private async getUserName(userId: string): Promise<string> {
    const user = await appwriteDatabases.getDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "user_profiles",
      userId,
    )
    return user.firstName || "User"
  }

  private async hashToken(token: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    return hash
  }

  private base64UrlEncode(data: Uint8Array): string {
    const binaryString = String.fromCharCode(...data)
    const base64 = btoa(binaryString)

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }
}

export default EmailVerificationService
