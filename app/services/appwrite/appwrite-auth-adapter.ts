/**
 * Appwrite Authentication Adapter
 *
 * Bridges our AuthAPI service with Appwrite's authentication system,
 * providing a seamless integration layer.
 */

import { Account, ID, Query } from "appwrite"
import { AppwriteClient, getAppwriteClient } from "./appwrite-client"
import { ServiceResult } from "../api/base-api-service"

/**
 * Appwrite authentication response types
 */
export interface AppwriteSession {
  $id: string
  userId: string
  expire: string
  provider: string
  providerUid?: string
  providerAccessToken?: string
  providerRefreshToken?: string
  current: boolean
}

export interface AppwriteUser {
  $id: string
  name: string
  email: string
  phone: string
  emailVerification: boolean
  phoneVerification: boolean
  prefs: Record<string, any>
  status: boolean
  accessedAt: string
  registration: string
}

/**
 * Authentication adapter for Appwrite backend
 */
export class AppwriteAuthAdapter {
  private client: AppwriteClient
  private account: Account

  constructor(client?: AppwriteClient) {
    this.client = client || getAppwriteClient()
    this.account = this.client.account
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
  ): Promise<
    ServiceResult<{
      session: AppwriteSession
      user: AppwriteUser
    }>
  > {
    try {
      // Create session
      const session = await this.account.createEmailSession(email, password)

      // Get user info
      const user = await this.account.get()

      return {
        success: true,
        data: {
          session: session as AppwriteSession,
          user: user as AppwriteUser,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Login failed",
      }
    }
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.create(ID.unique(), email, password, name)
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Registration failed",
      }
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.get()
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: error.message || "Not authenticated",
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ServiceResult<void>> {
    try {
      await this.account.deleteSession("current")
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Logout failed",
      }
    }
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(): Promise<ServiceResult<void>> {
    try {
      await this.account.deleteSessions()
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Logout all failed",
      }
    }
  }

  /**
   * Update password
   */
  async updatePassword(
    newPassword: string,
    oldPassword: string,
  ): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.updatePassword(newPassword, oldPassword)
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Password update failed",
      }
    }
  }

  /**
   * Update user name
   */
  async updateName(name: string): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.updateName(name)
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Name update failed",
      }
    }
  }

  /**
   * Update user email
   */
  async updateEmail(email: string, password: string): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.updateEmail(email, password)
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Email update failed",
      }
    }
  }

  /**
   * Send password recovery email
   */
  async sendPasswordRecovery(email: string, url: string): Promise<ServiceResult<void>> {
    try {
      await this.account.createRecovery(email, url)
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Password recovery failed",
      }
    }
  }

  /**
   * Complete password recovery
   */
  async completePasswordRecovery(
    userId: string,
    secret: string,
    password: string,
    passwordAgain: string,
  ): Promise<ServiceResult<void>> {
    try {
      await this.account.updateRecovery(userId, secret, password, passwordAgain)
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Password recovery completion failed",
      }
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(url: string): Promise<ServiceResult<void>> {
    try {
      await this.account.createVerification(url)
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Email verification failed",
      }
    }
  }

  /**
   * Complete email verification
   */
  async completeEmailVerification(userId: string, secret: string): Promise<ServiceResult<void>> {
    try {
      await this.account.updateVerification(userId, secret)
      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Email verification completion failed",
      }
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<ServiceResult<AppwriteSession[]>> {
    try {
      const sessions = await this.account.listSessions()
      return {
        success: true,
        data: sessions.sessions as AppwriteSession[],
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to get sessions",
      }
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(prefs: Record<string, any>): Promise<ServiceResult<AppwriteUser>> {
    try {
      const user = await this.account.updatePrefs(prefs)
      return {
        success: true,
        data: user as AppwriteUser,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Preferences update failed",
      }
    }
  }

  /**
   * Create OAuth2 session
   */
  async createOAuth2Session(
    provider: string,
    success?: string,
    failure?: string,
    scopes?: string[],
  ): Promise<void> {
    try {
      this.account.createOAuth2Session(provider as any, success, failure, scopes)
    } catch (error: any) {
      throw new Error(error.message || "OAuth2 session creation failed")
    }
  }

  /**
   * Get OAuth2 token
   */
  async getOAuth2Token(provider: string): Promise<ServiceResult<any>> {
    try {
      // This is a placeholder - Appwrite doesn't directly expose OAuth tokens
      // You would need to implement this based on your specific needs
      return {
        success: false,
        problem: { kind: "not-found" },
        message: "OAuth2 token retrieval not implemented",
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to get OAuth2 token",
      }
    }
  }

  /**
   * Test connection to Appwrite
   */
  async testConnection(): Promise<ServiceResult<boolean>> {
    try {
      await this.account.get()
      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      // Not authenticated is still a successful connection test
      if (error.code === 401) {
        return {
          success: true,
          data: true,
        }
      }

      return {
        success: false,
        problem: { kind: "network" },
        message: error.message || "Connection test failed",
      }
    }
  }
}

/**
 * Create singleton Appwrite auth adapter
 */
let appwriteAuthAdapter: AppwriteAuthAdapter | null = null

export function getAppwriteAuthAdapter(): AppwriteAuthAdapter {
  if (!appwriteAuthAdapter) {
    appwriteAuthAdapter = new AppwriteAuthAdapter()
  }
  return appwriteAuthAdapter
}

export function resetAppwriteAuthAdapter(): void {
  appwriteAuthAdapter = null
}
