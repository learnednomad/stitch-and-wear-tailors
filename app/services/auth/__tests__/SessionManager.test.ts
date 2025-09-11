/**
 * SessionManager Test Suite
 * Tests for session lifecycle management
 */

import SessionManager from "../SessionManager"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { appwriteDatabases } from "../../appwrite/appwrite-client"
import { ID } from "appwrite"

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage")
jest.mock("../../appwrite/appwrite-client")
jest.mock("appwrite")

describe("SessionManager", () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    jest.clearAllMocks()
    sessionManager = new SessionManager()

    // Mock ID.unique()
    ;(ID.unique as jest.Mock) = jest.fn().mockReturnValue("unique-id-123")
  })

  describe("createSession", () => {
    const sessionData = {
      sessionId: "session123",
      userId: "user123",
      deviceFingerprint: "fingerprint123",
      rememberMe: true,
      tokens: {
        accessToken: "access123",
        refreshToken: "refresh123",
      },
    }

    it("should create a new session successfully", async () => {
      // Mock AsyncStorage
      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue("device123")
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

      // Mock database operations
      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: [], // No existing sessions
      })
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      const result = await sessionManager.createSession(sessionData)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(sessionData.sessionId)
      expect(result.userId).toBe(sessionData.userId)
      expect(result.active).toBe(true)
      expect(result.rememberMe).toBe(true)

      // Verify session was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("active_session", expect.any(String))
      expect(appwriteDatabases.createDocument).toHaveBeenCalled()
    })

    it("should enforce concurrent session limit", async () => {
      // Mock existing sessions at limit
      const existingSessions = Array(5)
        .fill(null)
        .map((_, i) => ({
          sessionId: `session${i}`,
          userId: "user123",
          active: true,
          lastActivity: new Date(Date.now() - i * 1000).toISOString(),
        }))

      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: existingSessions,
      })
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})
      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue("device123")
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

      await sessionManager.createSession(sessionData)

      // Should revoke oldest session
      expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        "sessions",
        "session4",
        expect.objectContaining({
          revokedAt: expect.any(String),
          active: false,
        }),
      )
    })

    it("should create device ID if not exists", async () => {
      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: [],
      })
      ;(appwriteDatabases.createDocument as jest.Mock).mockResolvedValue({})

      const result = await sessionManager.createSession(sessionData)

      expect(AsyncStorage.setItem).toHaveBeenCalledWith("device_id", "unique-id-123")
      expect(result.deviceId).toBe("unique-id-123")
    })
  })

  describe("getActiveSession", () => {
    it("should return active session", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        idleSince: null,
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))

      const result = await sessionManager.getActiveSession()

      expect(result).toEqual(activeSession)
    })

    it("should return null for expired session", async () => {
      const expiredSession = {
        sessionId: "session123",
        userId: "user123",
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredSession))
      ;(AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined)

      const result = await sessionManager.getActiveSession()

      expect(result).toBeNull()
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("active_session")
    })

    it("should return null for idle session", async () => {
      const idleSession = {
        sessionId: "session123",
        userId: "user123",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        idleSince: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours idle
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(idleSession))
      ;(AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined)

      const result = await sessionManager.getActiveSession()

      expect(result).toBeNull()
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("active_session")
    })

    it("should return null when no session exists", async () => {
      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)

      const result = await sessionManager.getActiveSession()

      expect(result).toBeNull()
    })
  })

  describe("updateActivity", () => {
    it("should update session activity", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        idleSince: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})

      await sessionManager.updateActivity("session123")

      expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        "sessions",
        "session123",
        expect.objectContaining({
          lastActivity: expect.any(String),
          idleSince: null,
        }),
      )
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "active_session",
        expect.stringContaining('"idleSince":undefined'),
      )
    })

    it("should not update if session ID does not match", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))

      await sessionManager.updateActivity("different-session")

      expect(appwriteDatabases.updateDocument).not.toHaveBeenCalled()
      expect(AsyncStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe("revokeSession", () => {
    it("should revoke session successfully", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))
      ;(AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined)
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})

      await sessionManager.revokeSession("session123")

      expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        "sessions",
        "session123",
        expect.objectContaining({
          revokedAt: expect.any(String),
          active: false,
        }),
      )
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("active_session")
    })

    it("should not clear local session if different session", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})

      await sessionManager.revokeSession("different-session")

      expect(appwriteDatabases.updateDocument).toHaveBeenCalled()
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe("revokeAllUserSessions", () => {
    it("should revoke all user sessions", async () => {
      const userSessions = [
        { $id: "session1", userId: "user123", active: true },
        { $id: "session2", userId: "user123", active: true },
        { $id: "session3", userId: "user123", active: true },
      ]

      ;(appwriteDatabases.listDocuments as jest.Mock).mockResolvedValue({
        documents: userSessions,
      })
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})
      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
      ;(AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined)

      await sessionManager.revokeAllUserSessions("user123")

      expect(appwriteDatabases.updateDocument).toHaveBeenCalledTimes(3)
      userSessions.forEach((session) => {
        expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
          expect.any(String),
          "sessions",
          session.$id,
          expect.objectContaining({
            revokedAt: expect.any(String),
            active: false,
          }),
        )
      })
    })
  })

  describe("trustDevice", () => {
    it("should trust device for session", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
        deviceId: "device123",
        trustLevel: "none",
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})

      await sessionManager.trustDevice("session123", "session")

      expect(appwriteDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        "sessions",
        "session123",
        { trustLevel: "session" },
      )
    })

    it("should store persistent trust token", async () => {
      const activeSession = {
        sessionId: "session123",
        userId: "user123",
        deviceId: "device123",
        trustLevel: "none",
      }

      ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(activeSession))
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
      ;(appwriteDatabases.updateDocument as jest.Mock).mockResolvedValue({})

      await sessionManager.trustDevice("session123", "persistent")

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "device_trust_token",
        expect.stringContaining("device123"),
      )
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "device_trust_token",
        expect.stringContaining("user123"),
      )
    })
  })

  describe("createPending2FASession", () => {
    it("should create pending 2FA session", async () => {
      ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

      await sessionManager.createPending2FASession("user123", "session123")

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "pending_2fa_session",
        expect.stringContaining("user123"),
      )
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "pending_2fa_session",
        expect.stringContaining("session123"),
      )
    })
  })
})
