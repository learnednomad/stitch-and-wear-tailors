/**
 * Token Management Service
 * Implements JWT token generation and validation
 */

import * as Crypto from "expo-crypto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { appwriteDatabases } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface TokenPayload {
  userId: string
  sessionId: string
  userType: "client" | "tailor" | "admin"
  deviceFingerprint?: string
  permissions?: string[]
  riskScore?: number
  mfaVerified?: boolean
}

export interface TokenValidation {
  valid: boolean
  expired?: boolean
  payload?: TokenPayload
  sessionId?: string
  error?: string
}

class TokenService {
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly REFRESH_TOKEN_EXPIRY_REMEMBER = 30 * 24 * 60 * 60 * 1000 // 30 days
  private readonly TOKEN_GRACE_PERIOD = 30 * 1000 // 30 seconds for rotation

  /**
   * Generate a new token pair
   */
  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    try {
      // Generate access token (JWT)
      const accessToken = await this.generateAccessToken(payload)

      // Generate refresh token (opaque)
      const refreshToken = await this.generateRefreshToken(payload.sessionId)

      // Store token metadata
      await this.storeTokenMetadata({
        sessionId: payload.sessionId,
        userId: payload.userId,
        refreshTokenHash: await this.hashToken(refreshToken),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY).toISOString(),
      })

      return {
        accessToken,
        refreshToken,
      }
    } catch (error) {
      console.error("Failed to generate token pair:", error)
      throw error
    }
  }

  /**
   * Generate access token (JWT)
   */
  private async generateAccessToken(payload: TokenPayload): Promise<string> {
    const header = {
      alg: "HS256",
      typ: "JWT",
    }

    const jwtPayload = {
      sub: payload.userId,
      sid: payload.sessionId,
      role: payload.userType,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.ACCESS_TOKEN_EXPIRY) / 1000),
      jti: ID.unique(),
      device: payload.deviceFingerprint,
      permissions: payload.permissions || [],
      risk: payload.riskScore || 0,
      mfa: payload.mfaVerified || false,
    }

    // Create JWT
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload))
    const signature = await this.signToken(`${encodedHeader}.${encodedPayload}`)

    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  /**
   * Generate refresh token (opaque)
   */
  private async generateRefreshToken(sessionId: string): Promise<string> {
    // Generate cryptographically secure random token
    const randomBytes = await Crypto.getRandomBytesAsync(32)
    const token = this.base64UrlEncode(randomBytes)

    // Add session identifier for tracking
    return `${sessionId}.${token}`
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenValidation> {
    try {
      // Parse JWT
      const parts = token.split(".")
      if (parts.length !== 3) {
        return { valid: false, error: "Invalid token format" }
      }

      const [header, payload, signature] = parts

      // Verify signature
      const expectedSignature = await this.signToken(`${header}.${payload}`)
      if (signature !== expectedSignature) {
        return { valid: false, error: "Invalid signature" }
      }

      // Parse payload
      const decodedPayload = JSON.parse(this.base64UrlDecode(payload))

      // Check expiration
      if (decodedPayload.exp * 1000 < Date.now()) {
        return { valid: false, expired: true, error: "Token expired" }
      }

      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(decodedPayload.jti)) {
        return { valid: false, error: "Token revoked" }
      }

      // Check session is still active
      if (!(await this.isSessionActive(decodedPayload.sid))) {
        return { valid: false, error: "Session inactive" }
      }

      return {
        valid: true,
        payload: {
          userId: decodedPayload.sub,
          sessionId: decodedPayload.sid,
          userType: decodedPayload.role,
          deviceFingerprint: decodedPayload.device,
          permissions: decodedPayload.permissions,
          riskScore: decodedPayload.risk,
          mfaVerified: decodedPayload.mfa,
        },
      }
    } catch (error) {
      console.error("Token validation failed:", error)
      return { valid: false, error: "Validation failed" }
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<TokenValidation> {
    try {
      // Extract session ID from token
      const parts = token.split(".")
      if (parts.length !== 2) {
        return { valid: false, error: "Invalid token format" }
      }

      const [sessionId, tokenValue] = parts

      // Get token metadata from database
      const tokenData = await this.getTokenMetadata(sessionId)
      if (!tokenData) {
        return { valid: false, error: "Token not found" }
      }

      // Verify token hash
      const tokenHash = await this.hashToken(token)
      if (tokenHash !== tokenData.refreshTokenHash) {
        return { valid: false, error: "Invalid token" }
      }

      // Check expiration
      if (new Date(tokenData.expiresAt) < new Date()) {
        return { valid: false, expired: true, error: "Token expired" }
      }

      // Check if already used (but allow within grace period)
      if (tokenData.usedAt) {
        const usedTime = new Date(tokenData.usedAt).getTime()
        if (Date.now() - usedTime > this.TOKEN_GRACE_PERIOD) {
          // Token reuse detected - potential theft
          return { valid: false, error: "Token already used" }
        }
      }

      return {
        valid: true,
        sessionId,
      }
    } catch (error) {
      console.error("Refresh token validation failed:", error)
      return { valid: false, error: "Validation failed" }
    }
  }

  /**
   * Rotate tokens (generate new pair and invalidate old)
   */
  async rotateTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Validate current refresh token
      const validation = await this.validateRefreshToken(refreshToken)
      if (!validation.valid || !validation.sessionId) {
        throw new Error("Invalid refresh token")
      }

      // Get session data
      const session = await this.getSessionData(validation.sessionId)
      if (!session) {
        throw new Error("Session not found")
      }

      // Mark old token as used
      await this.markTokenUsed(refreshToken)

      // Generate new token pair
      const newTokens = await this.generateTokenPair({
        userId: session.userId,
        sessionId: session.sessionId,
        userType: session.userType,
        deviceFingerprint: session.deviceFingerprint,
        permissions: session.permissions,
        riskScore: session.riskScore,
        mfaVerified: session.mfaVerified,
      })

      // Blacklist old access token (optional, depends on implementation)
      // await this.blacklistToken(oldAccessToken)

      return newTokens
    } catch (error) {
      console.error("Token rotation failed:", error)
      throw error
    }
  }

  /**
   * Check if token was already used
   */
  async isTokenUsed(refreshToken: string): Promise<boolean> {
    try {
      const parts = refreshToken.split(".")
      if (parts.length !== 2) return true

      const [sessionId] = parts
      const tokenData = await this.getTokenMetadata(sessionId)

      if (!tokenData) return true

      // Check if used and outside grace period
      if (tokenData.usedAt) {
        const usedTime = new Date(tokenData.usedAt).getTime()
        return Date.now() - usedTime > this.TOKEN_GRACE_PERIOD
      }

      return false
    } catch (error) {
      console.error("Failed to check token usage:", error)
      return true
    }
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(tokenId: string): Promise<void> {
    try {
      await appwriteDatabases.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "token_blacklist",
        ID.unique(),
        {
          tokenId,
          blacklistedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY).toISOString(),
        },
      )
    } catch (error) {
      console.error("Failed to blacklist token:", error)
    }
  }

  // Private helper methods

  private base64UrlEncode(data: string | Uint8Array): string {
    let base64: string

    if (typeof data === "string") {
      base64 = btoa(data)
    } else {
      // Convert Uint8Array to string then to base64
      const binaryString = String.fromCharCode(...data)
      base64 = btoa(binaryString)
    }

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  private base64UrlDecode(data: string): string {
    const base64 = data
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(data.length + ((4 - (data.length % 4)) % 4), "=")

    return atob(base64)
  }

  private async signToken(data: string): Promise<string> {
    // In production, use a proper signing key stored securely
    const secret = process.env.EXPO_PUBLIC_JWT_SECRET || "development-secret"

    // Use expo-crypto for HMAC
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${data}.${secret}`,
      { encoding: Crypto.CryptoEncoding.BASE64URL },
    )

    return signature
  }

  private async hashToken(token: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    return hash
  }

  private async storeTokenMetadata(data: any): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "token_metadata",
      data.sessionId,
      data,
    )
  }

  private async getTokenMetadata(sessionId: string): Promise<any> {
    try {
      const document = await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "token_metadata",
        sessionId,
      )
      return document
    } catch (error) {
      return null
    }
  }

  private async markTokenUsed(refreshToken: string): Promise<void> {
    const parts = refreshToken.split(".")
    if (parts.length !== 2) return

    const [sessionId] = parts

    await appwriteDatabases.updateDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "token_metadata",
      sessionId,
      {
        usedAt: new Date().toISOString(),
      },
    )
  }

  private async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const blacklist = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "token_blacklist",
        [Query.equal("tokenId", tokenId), Query.greaterThan("expiresAt", new Date().toISOString())],
      )

      return blacklist.documents.length > 0
    } catch (error) {
      return false
    }
  }

  private async isSessionActive(sessionId: string): Promise<boolean> {
    try {
      const session = await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
      )

      return session.active === true && !session.revokedAt
    } catch (error) {
      return false
    }
  }

  private async getSessionData(sessionId: string): Promise<any> {
    try {
      const session = await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
      )
      return session
    } catch (error) {
      return null
    }
  }
}

export default TokenService
