/**
 * TokenService Test Suite
 * Tests for JWT token management
 */

import TokenService from "../TokenService"
import * as Crypto from "expo-crypto"
import { appwriteDatabases } from "../../appwrite/appwrite-client"
import { ID } from "appwrite"

// Mock dependencies
jest.mock("expo-crypto")
jest.mock("../../appwrite/appwrite-client")
jest.mock("appwrite")

describe("TokenService", () => {
  let tokenService: TokenService

  beforeEach(() => {
    jest.clearAllMocks()
    tokenService = new TokenService()

    // Mock ID.unique()
    ;(ID.unique as jest.Mock) = jest.fn().mockReturnValue("jti-unique-123")

    // Mock Crypto functions
    ;(Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    )
    ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("hashed-value")
  })

  describe("generateTokenPair", () => {
    const tokenPayload = {
      userId: "user123",
      sessionId: "session123",
      userType: "client" as const,
      deviceFingerprint: "fingerprint123",
      permissions: ["read", "write"],
      riskScore: 10,
      mfaVerified: true,
    }

    it("should generate a valid token pair", async () => {
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      const result = await tokenService.generateTokenPair(tokenPayload)

      expect(result).toHaveProperty("accessToken")
      expect(result).toHaveProperty("refreshToken")
      expect(result.accessToken).toContain(".")
      expect(result.refreshToken).toContain("session123")

      // Verify token metadata was stored
      expect(appwriteDatabases.createDocument).toHaveBeenCalledWith(
        expect.any(String),
        "token_metadata",
        "session123",
        expect.objectContaining({
          sessionId: "session123",
          userId: "user123",
          refreshTokenHash: "hashed-value",
        }),
      )
    })

    it("should generate different tokens for different sessions", async () => {
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      const result1 = await tokenService.generateTokenPair({
        ...tokenPayload,
        sessionId: "session1",
      })

      const result2 = await tokenService.generateTokenPair({
        ...tokenPayload,
        sessionId: "session2",
      })

      expect(result1.accessToken).not.toBe(result2.accessToken)
      expect(result1.refreshToken).not.toBe(result2.refreshToken)
    })

    it("should include all payload fields in JWT", async () => {
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      const result = await tokenService.generateTokenPair(tokenPayload)

      // Parse the JWT payload
      const [, payload] = result.accessToken.split(".")
      const decodedPayload = JSON.parse(
        Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
      )

      expect(decodedPayload.sub).toBe(tokenPayload.userId)
      expect(decodedPayload.sid).toBe(tokenPayload.sessionId)
      expect(decodedPayload.role).toBe(tokenPayload.userType)
      expect(decodedPayload.device).toBe(tokenPayload.deviceFingerprint)
      expect(decodedPayload.permissions).toEqual(tokenPayload.permissions)
      expect(decodedPayload.risk).toBe(tokenPayload.riskScore)
      expect(decodedPayload.mfa).toBe(tokenPayload.mfaVerified)
      expect(decodedPayload.jti).toBe("jti-unique-123")
    })
  })

  describe("validateAccessToken", () => {
    let validToken: string

    beforeEach(async () => {
      // Generate a valid token for testing
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})
      const tokenPair = await tokenService.generateTokenPair({
        userId: "user123",
        sessionId: "session123",
        userType: "client",
      })
      validToken = tokenPair.accessToken
    })

    it("should validate a valid token", async () => {
      // Mock token not blacklisted
      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: [],
      })

      // Mock session is active
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        active: true,
        revokedAt: null,
      })

      const result = await tokenService.validateAccessToken(validToken)

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.payload?.userId).toBe("user123")
      expect(result.payload?.sessionId).toBe("session123")
    })

    it("should reject token with invalid format", async () => {
      const result = await tokenService.validateAccessToken("invalid-token")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid token format")
    })

    it("should reject token with invalid signature", async () => {
      // Tamper with the signature
      const tamperedToken = validToken.slice(0, -5) + "xxxxx"

      const result = await tokenService.validateAccessToken(tamperedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid signature")
    })

    it("should reject expired token", async () => {
      // Create an expired token
      const header = { alg: "HS256", typ: "JWT" }
      const payload = {
        sub: "user123",
        sid: "session123",
        role: "client",
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
        jti: "jti-123",
      }

      const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url")
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")

      ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("signature")

      const expiredToken = `${encodedHeader}.${encodedPayload}.signature`

      const result = await tokenService.validateAccessToken(expiredToken)

      expect(result.valid).toBe(false)
      expect(result.expired).toBe(true)
      expect(result.error).toBe("Token expired")
    })

    it("should reject blacklisted token", async () => {
      // Mock token is blacklisted
      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: [{ tokenId: "jti-unique-123" }],
      })

      const result = await tokenService.validateAccessToken(validToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Token revoked")
    })

    it("should reject token with inactive session", async () => {
      // Mock token not blacklisted
      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: [],
      })

      // Mock session is inactive
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        active: false,
        revokedAt: new Date().toISOString(),
      })

      const result = await tokenService.validateAccessToken(validToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Session inactive")
    })
  })

  describe("validateRefreshToken", () => {
    const validRefreshToken = "session123.AQIDBAUGBwg="

    beforeEach(() => {
      // Mock token metadata
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        refreshTokenHash: "hashed-value",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        usedAt: null,
      })
      ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("hashed-value")
    })

    it("should validate a valid refresh token", async () => {
      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(true)
      expect(result.sessionId).toBe("session123")
    })

    it("should reject token with invalid format", async () => {
      const result = await tokenService.validateRefreshToken("invalid-format")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid token format")
    })

    it("should reject non-existent token", async () => {
      ;(appwriteDatabases.getDocument as jest.Mock).mockRejectedValue(
        new Error("Document not found"),
      )

      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Token not found")
    })

    it("should reject token with mismatched hash", async () => {
      ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("different-hash")

      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid token")
    })

    it("should reject expired refresh token", async () => {
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        refreshTokenHash: "hashed-value",
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
        usedAt: null,
      })

      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(false)
      expect(result.expired).toBe(true)
      expect(result.error).toBe("Token expired")
    })

    it("should reject already used token outside grace period", async () => {
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        refreshTokenHash: "hashed-value",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        usedAt: new Date(Date.now() - 60000).toISOString(), // Used 1 minute ago
      })

      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("Token already used")
    })

    it("should allow token within grace period", async () => {
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        refreshTokenHash: "hashed-value",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        usedAt: new Date(Date.now() - 10000).toISOString(), // Used 10 seconds ago
      })

      const result = await tokenService.validateRefreshToken(validRefreshToken)

      expect(result.valid).toBe(true)
      expect(result.sessionId).toBe("session123")
    })
  })

  describe("rotateTokens", () => {
    const oldRefreshToken = "session123.AQIDBAUGBwg="

    beforeEach(() => {
      // Mock valid refresh token
      ;(appwriteDatabases.getDocument as jest.Mock).mockResolvedValue({
        refreshTokenHash: "hashed-value",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        usedAt: null,
        userId: "user123",
        sessionId: "session123",
        userType: "client",
      })
      ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("hashed-value")
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})
    })

    it("should successfully rotate tokens", async () => {
      const result = await tokenService.rotateTokens(oldRefreshToken)

      expect(result).toHaveProperty("accessToken")
      expect(result).toHaveProperty("refreshToken")
      expect(result.refreshToken).not.toBe(oldRefreshToken)

      // Verify old token was marked as used
      expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        "token_metadata",
        "session123",
        expect.objectContaining({
          usedAt: expect.any(String),
        }),
      )
    })

    it("should fail rotation with invalid token", async () => {
      ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValue("different-hash")

      await expect(tokenService.rotateTokens(oldRefreshToken)).rejects.toThrow(
        "Invalid refresh token",
      )
    })

    it("should fail rotation when session not found", async () => {
      ;(appwriteDatabases.getDocument as jest.Mock)
        .mockResolvedValueOnce({
          refreshTokenHash: "hashed-value",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          usedAt: null,
        })
        .mockRejectedValueOnce(new Error("Session not found"))

      await expect(tokenService.rotateTokens(oldRefreshToken)).rejects.toThrow("Session not found")
    })
  })

  describe("blacklistToken", () => {
    it("should blacklist a token", async () => {
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      await tokenService.blacklistToken("jti-123")

      expect(appwriteDatabases.createDocument).toHaveBeenCalledWith(
        expect.any(String),
        "token_blacklist",
        expect.any(String),
        expect.objectContaining({
          tokenId: "jti-123",
          blacklistedAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
      )
    })

    it("should handle blacklist errors gracefully", async () => {
      ;(appwriteDatabases.createDocument as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      )

      // Should not throw
      await expect(tokenService.blacklistToken("jti-123")).resolves.not.toThrow()
    })
  })
})
