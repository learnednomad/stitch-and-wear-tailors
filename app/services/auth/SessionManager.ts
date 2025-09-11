/**
 * Session Management Service
 * Implements session lifecycle from 07-session-management-logic.md
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import { appwriteDatabases } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"

export interface SessionData {
  sessionId: string
  userId: string
  deviceFingerprint?: string
  deviceId?: string
  deviceName?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  idleSince?: string
  riskScore: number
  mfaCompleted: boolean
  trustLevel: "none" | "session" | "persistent"
  rememberMe: boolean
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceType: "browser" | "mobile" | "tablet" | "desktop"
  fingerprint: {
    userAgent: string
    screenResolution?: string
    timezone?: string
    language?: string
    platform?: string
  }
  trusted: boolean
  lastSeen: string
}

class SessionManager {
  private readonly MAX_CONCURRENT_SESSIONS = 5
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  private readonly ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours
  private readonly IDLE_WARNING_TIME = 13 * 60 * 1000 // 13 minutes
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes

  private idleTimer: NodeJS.Timeout | null = null
  private refreshTimer: NodeJS.Timeout | null = null

  /**
   * Create a new session
   */
  async createSession(data: {
    sessionId: string
    userId: string
    deviceFingerprint?: string
    rememberMe: boolean
    tokens: { accessToken: string; refreshToken: string }
  }): Promise<SessionData> {
    try {
      // Check concurrent session limit
      await this.enforceSessionLimit(data.userId)

      // Generate device ID if not exists
      const deviceId = await this.getOrCreateDeviceId()

      // Create session record
      const sessionData: SessionData = {
        sessionId: data.sessionId,
        userId: data.userId,
        deviceFingerprint: data.deviceFingerprint,
        deviceId,
        deviceName: await this.getDeviceName(),
        ipAddress: await this.getIPAddress(),
        userAgent: await this.getUserAgent(),
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: this.calculateExpiry(data.rememberMe),
        riskScore: 0,
        mfaCompleted: false,
        trustLevel: "none",
        rememberMe: data.rememberMe,
        tokens: data.tokens,
      }

      // Store in database
      await this.storeSession(sessionData)

      // Store locally
      await this.storeLocalSession(sessionData)

      // Start monitoring
      this.startSessionMonitoring(sessionData)

      return sessionData
    } catch (error) {
      console.error("Failed to create session:", error)
      throw error
    }
  }

  /**
   * Get active session
   */
  async getActiveSession(): Promise<SessionData | null> {
    try {
      const localSession = await AsyncStorage.getItem("active_session")
      if (!localSession) return null

      const session: SessionData = JSON.parse(localSession)

      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.clearLocalSession()
        return null
      }

      // Check if idle too long
      if (session.idleSince) {
        const idleTime = Date.now() - new Date(session.idleSince).getTime()
        if (idleTime > 60 * 60 * 1000) {
          // 1 hour
          await this.clearLocalSession()
          return null
        }
      }

      return session
    } catch (error) {
      console.error("Failed to get active session:", error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getActiveSession()
      if (!session || session.sessionId !== sessionId) return

      // Update last activity
      session.lastActivity = new Date().toISOString()
      session.idleSince = undefined

      // Update in database
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
        {
          lastActivity: session.lastActivity,
          idleSince: null,
        },
      )

      // Update locally
      await this.storeLocalSession(session)

      // Reset idle timer
      this.resetIdleTimer(session)
    } catch (error) {
      console.error("Failed to update activity:", error)
    }
  }

  /**
   * Mark session as idle
   */
  async markSessionIdle(sessionId: string): Promise<void> {
    try {
      const session = await this.getActiveSession()
      if (!session || session.sessionId !== sessionId) return

      session.idleSince = new Date().toISOString()

      // Update in database
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
        { idleSince: session.idleSince },
      )

      // Update locally
      await this.storeLocalSession(session)
    } catch (error) {
      console.error("Failed to mark session idle:", error)
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      // Mark as revoked in database
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
        {
          revokedAt: new Date().toISOString(),
          active: false,
        },
      )

      // Clear local session if it's the active one
      const activeSession = await this.getActiveSession()
      if (activeSession?.sessionId === sessionId) {
        await this.clearLocalSession()
      }

      // Stop monitoring
      this.stopSessionMonitoring()
    } catch (error) {
      console.error("Failed to revoke session:", error)
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all active sessions for user
      const sessions = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        [Query.equal("userId", userId), Query.equal("active", true)],
      )

      // Revoke each session
      for (const session of sessions.documents) {
        await this.revokeSession(session.$id)
      }

      // Clear local session
      await this.clearLocalSession()
    } catch (error) {
      console.error("Failed to revoke all sessions:", error)
    }
  }

  /**
   * Revoke token family (potential token theft)
   */
  async revokeTokenFamily(sessionId: string): Promise<void> {
    try {
      // Get session details
      const session = await appwriteDatabases.getDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
      )

      // Revoke all sessions for this user (security measure)
      await this.revokeAllUserSessions(session.userId)

      // Log security event
      await this.logSecurityEvent({
        type: "token_theft_detected",
        sessionId,
        userId: session.userId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to revoke token family:", error)
    }
  }

  /**
   * Update session tokens after refresh
   */
  async updateSessionTokens(
    sessionId: string,
    tokens: { accessToken: string; refreshToken: string },
  ): Promise<void> {
    try {
      // Update in database
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          lastRefreshed: new Date().toISOString(),
        },
      )

      // Update local session
      const session = await this.getActiveSession()
      if (session && session.sessionId === sessionId) {
        session.tokens = tokens
        await this.storeLocalSession(session)
      }
    } catch (error) {
      console.error("Failed to update session tokens:", error)
    }
  }

  /**
   * Get all user sessions
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessions = await appwriteDatabases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        [
          Query.equal("userId", userId),
          Query.equal("active", true),
          Query.orderDesc("lastActivity"),
        ],
      )

      return sessions.documents as unknown as SessionData[]
    } catch (error) {
      console.error("Failed to get user sessions:", error)
      return []
    }
  }

  /**
   * Trust current device
   */
  async trustDevice(sessionId: string, duration: "session" | "persistent"): Promise<void> {
    try {
      const session = await this.getActiveSession()
      if (!session || session.sessionId !== sessionId) return

      session.trustLevel = duration

      // Update in database
      await appwriteDatabases.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        "sessions",
        sessionId,
        { trustLevel: duration },
      )

      // Store device trust token
      if (duration === "persistent") {
        await AsyncStorage.setItem(
          "device_trust_token",
          JSON.stringify({
            deviceId: session.deviceId,
            userId: session.userId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          }),
        )
      }

      // Update local session
      await this.storeLocalSession(session)
    } catch (error) {
      console.error("Failed to trust device:", error)
    }
  }

  /**
   * Create pending 2FA session
   */
  async createPending2FASession(userId: string, sessionId: string): Promise<void> {
    await AsyncStorage.setItem(
      "pending_2fa_session",
      JSON.stringify({
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      }),
    )
  }

  // Private helper methods

  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId)

    if (sessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest inactive session
      const oldestSession = sessions[sessions.length - 1]
      await this.revokeSession(oldestSession.sessionId)
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem("device_id")

    if (!deviceId) {
      deviceId = ID.unique()
      await AsyncStorage.setItem("device_id", deviceId)
    }

    return deviceId
  }

  private async getDeviceName(): Promise<string> {
    // In React Native, get device info
    // For now, return a placeholder
    return "Mobile Device"
  }

  private async getIPAddress(): Promise<string> {
    // Would need to get from server or API
    return "0.0.0.0"
  }

  private async getUserAgent(): Promise<string> {
    // Get from React Native device info
    return "StitchAndWear Mobile App"
  }

  private calculateExpiry(rememberMe: boolean): string {
    const duration = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000 // 7 days

    return new Date(Date.now() + duration).toISOString()
  }

  private async storeSession(session: SessionData): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "sessions",
      session.sessionId,
      {
        ...session,
        active: true,
      },
    )
  }

  private async storeLocalSession(session: SessionData): Promise<void> {
    await AsyncStorage.setItem("active_session", JSON.stringify(session))
  }

  private async clearLocalSession(): Promise<void> {
    await AsyncStorage.removeItem("active_session")
    await AsyncStorage.removeItem("pending_2fa_session")
    this.stopSessionMonitoring()
  }

  private startSessionMonitoring(session: SessionData): void {
    // Monitor idle time
    this.resetIdleTimer(session)

    // Monitor token refresh
    this.startTokenRefreshTimer(session)
  }

  private stopSessionMonitoring(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private resetIdleTimer(session: SessionData): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    // Set idle timer for 15 minutes
    this.idleTimer = setTimeout(() => {
      this.markSessionIdle(session.sessionId)
    }, this.SESSION_TIMEOUT)
  }

  private startTokenRefreshTimer(session: SessionData): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Check every minute if token needs refresh
    this.refreshTimer = setInterval(() => {
      this.checkTokenRefresh(session)
    }, 60 * 1000)
  }

  private async checkTokenRefresh(session: SessionData): Promise<void> {
    // This would trigger token refresh if needed
    // Implementation would depend on token expiry times
  }

  private async logSecurityEvent(event: any): Promise<void> {
    await appwriteDatabases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      "security_events",
      ID.unique(),
      event,
    )
  }
}

export default SessionManager
