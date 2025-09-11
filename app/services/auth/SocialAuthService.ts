/**
 * Social Authentication Service
 * Implements OAuth integration for Google, Facebook, and Apple Sign-In
 */

import {
  makeRedirectUri,
  useAuthRequest,
  AuthRequest,
  AuthRequestPromptOptions,
  AuthSessionResult,
  ResponseType,
} from "expo-auth-session"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import * as Facebook from "expo-auth-session/providers/facebook"
import * as AppleAuthentication from "expo-apple-authentication"
import { Platform } from "react-native"
import { appwriteAccount, appwriteDatabases } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"
import SessionManager from "./SessionManager"
import TokenService from "./TokenService"

WebBrowser.maybeCompleteAuthSession()

export interface SocialAuthConfig {
  google?: {
    clientId: string
    iosClientId?: string
    androidClientId?: string
    webClientId?: string
  }
  facebook?: {
    appId: string
    appSecret?: string
  }
  apple?: {
    enabled: boolean
  }
}

export interface SocialAuthResult {
  success: boolean
  provider: "google" | "facebook" | "apple"
  user?: {
    id: string
    email: string
    name: string
    picture?: string
    emailVerified: boolean
  }
  tokens?: {
    accessToken: string
    refreshToken: string
  }
  isNewUser: boolean
  error?: string
}

export interface LinkedAccount {
  provider: "google" | "facebook" | "apple"
  providerId: string
  email: string
  linkedAt: string
}

class SocialAuthService {
  private readonly DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear"
  private readonly COLLECTION_SOCIAL = "social_accounts"
  private sessionManager: SessionManager
  private tokenService: TokenService

  constructor() {
    this.sessionManager = new SessionManager()
    this.tokenService = new TokenService()
  }

  /**
   * Authenticate with Google
   */
  async authenticateWithGoogle(): Promise<SocialAuthResult> {
    try {
      const redirectUri = makeRedirectUri({
        scheme: "stitchandwear",
        path: "auth/google",
      })

      const config = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        scopes: ["openid", "profile", "email"],
        redirectUri,
      }

      // Create auth request
      const request = new AuthRequest({
        clientId: config.clientId,
        scopes: config.scopes,
        redirectUri: config.redirectUri,
        responseType: ResponseType.Token,
        extraParams: {
          access_type: "offline",
          prompt: "consent",
        },
      })

      // Initiate authentication
      const result = await request.promptAsync({
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      })

      if (result.type === "success") {
        const { authentication } = result

        // Get user info from Google
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        })
        const userInfo = await userInfoResponse.json()

        // Process authentication
        return await this.processSocialAuth(
          "google",
          {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            emailVerified: userInfo.verified_email,
          },
          {
            accessToken: authentication?.accessToken || "",
            refreshToken: authentication?.refreshToken || "",
          },
        )
      }

      return {
        success: false,
        provider: "google",
        isNewUser: false,
        error: "Authentication cancelled",
      }
    } catch (error) {
      console.error("Google authentication failed:", error)
      return {
        success: false,
        provider: "google",
        isNewUser: false,
        error: "Google authentication failed",
      }
    }
  }

  /**
   * Authenticate with Facebook
   */
  async authenticateWithFacebook(): Promise<SocialAuthResult> {
    try {
      const redirectUri = makeRedirectUri({
        scheme: "stitchandwear",
        path: "auth/facebook",
      })

      const config = {
        clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID!,
        scopes: ["public_profile", "email"],
        redirectUri,
      }

      // Create auth request
      const request = new AuthRequest({
        clientId: config.clientId,
        scopes: config.scopes,
        redirectUri: config.redirectUri,
        responseType: ResponseType.Token,
      })

      // Initiate authentication
      const result = await request.promptAsync({
        authorizationEndpoint: "https://www.facebook.com/v12.0/dialog/oauth",
      })

      if (result.type === "success") {
        const { authentication } = result

        // Get user info from Facebook
        const userInfoResponse = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${authentication?.accessToken}`,
        )
        const userInfo = await userInfoResponse.json()

        // Process authentication
        return await this.processSocialAuth(
          "facebook",
          {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture?.data?.url,
            emailVerified: true, // Facebook emails are pre-verified
          },
          {
            accessToken: authentication?.accessToken || "",
            refreshToken: authentication?.refreshToken || "",
          },
        )
      }

      return {
        success: false,
        provider: "facebook",
        isNewUser: false,
        error: "Authentication cancelled",
      }
    } catch (error) {
      console.error("Facebook authentication failed:", error)
      return {
        success: false,
        provider: "facebook",
        isNewUser: false,
        error: "Facebook authentication failed",
      }
    }
  }

  /**
   * Authenticate with Apple (iOS only)
   */
  async authenticateWithApple(): Promise<SocialAuthResult> {
    if (Platform.OS !== "ios") {
      return {
        success: false,
        provider: "apple",
        isNewUser: false,
        error: "Apple Sign-In is only available on iOS",
      }
    }

    try {
      // Check availability
      const isAvailable = await AppleAuthentication.isAvailableAsync()
      if (!isAvailable) {
        throw new Error("Apple Sign-In is not available on this device")
      }

      // Request authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      // Process authentication
      return await this.processSocialAuth(
        "apple",
        {
          id: credential.user,
          email: credential.email || "",
          name: `${credential.fullName?.givenName || ""} ${credential.fullName?.familyName || ""}`.trim(),
          emailVerified: true, // Apple emails are pre-verified
        },
        {
          accessToken: credential.identityToken || "",
          refreshToken: credential.authorizationCode || "",
        },
      )
    } catch (error: any) {
      if (error.code === "ERR_CANCELED") {
        return {
          success: false,
          provider: "apple",
          isNewUser: false,
          error: "Authentication cancelled",
        }
      }

      console.error("Apple authentication failed:", error)
      return {
        success: false,
        provider: "apple",
        isNewUser: false,
        error: "Apple authentication failed",
      }
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(
    userId: string,
    provider: "google" | "facebook" | "apple",
    providerUserId: string,
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already linked
      const existing = await this.getSocialAccount(userId, provider)
      if (existing) {
        return { success: false, error: "Account already linked" }
      }

      // Check if provider account is linked to another user
      const conflicting = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_SOCIAL,
        [
          Query.equal("provider", provider),
          Query.equal("providerUserId", providerUserId),
          Query.notEqual("userId", userId),
        ],
      )

      if (conflicting.documents.length > 0) {
        return {
          success: false,
          error: "This social account is already linked to another user",
        }
      }

      // Create link
      await appwriteDatabases.createDocument(
        this.DATABASE_ID,
        this.COLLECTION_SOCIAL,
        ID.unique(),
        {
          userId,
          provider,
          providerUserId,
          email,
          linkedAt: new Date().toISOString(),
        },
      )

      return { success: true }
    } catch (error) {
      console.error("Failed to link social account:", error)
      return { success: false, error: "Failed to link account" }
    }
  }

  /**
   * Unlink social account
   */
  async unlinkSocialAccount(
    userId: string,
    provider: "google" | "facebook" | "apple",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const account = await this.getSocialAccount(userId, provider)
      if (!account) {
        return { success: false, error: "Account not linked" }
      }

      // Check if user has other auth methods
      const hasPassword = await this.userHasPassword(userId)
      const otherSocialAccounts = await this.getLinkedAccounts(userId)

      if (!hasPassword && otherSocialAccounts.length <= 1) {
        return {
          success: false,
          error: "Cannot unlink the only authentication method",
        }
      }

      // Delete link
      await appwriteDatabases.deleteDocument(this.DATABASE_ID, this.COLLECTION_SOCIAL, account.$id)

      return { success: true }
    } catch (error) {
      console.error("Failed to unlink social account:", error)
      return { success: false, error: "Failed to unlink account" }
    }
  }

  /**
   * Get linked social accounts
   */
  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    try {
      const accounts = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_SOCIAL,
        [Query.equal("userId", userId)],
      )

      return accounts.documents.map((doc) => ({
        provider: doc.provider,
        providerId: doc.providerUserId,
        email: doc.email,
        linkedAt: doc.linkedAt,
      }))
    } catch (error) {
      console.error("Failed to get linked accounts:", error)
      return []
    }
  }

  // Private helper methods

  private async processSocialAuth(
    provider: "google" | "facebook" | "apple",
    userInfo: any,
    tokens: { accessToken: string; refreshToken: string },
  ): Promise<SocialAuthResult> {
    try {
      // Check if user exists with this social account
      const existingSocial = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_SOCIAL,
        [Query.equal("provider", provider), Query.equal("providerUserId", userInfo.id)],
      )

      let userId: string
      let isNewUser = false

      if (existingSocial.documents.length > 0) {
        // Existing social login
        userId = existingSocial.documents[0].userId
      } else {
        // Check if user exists with same email
        const existingUser = await this.findUserByEmail(userInfo.email)

        if (existingUser) {
          // Link to existing user
          userId = existingUser.$id
          await this.linkSocialAccount(userId, provider, userInfo.id, userInfo.email)
        } else {
          // Create new user
          const newUser = await this.createUserFromSocial(provider, userInfo)
          userId = newUser.$id
          isNewUser = true

          // Create social link
          await appwriteDatabases.createDocument(
            this.DATABASE_ID,
            this.COLLECTION_SOCIAL,
            ID.unique(),
            {
              userId,
              provider,
              providerUserId: userInfo.id,
              email: userInfo.email,
              linkedAt: new Date().toISOString(),
            },
          )
        }
      }

      // Create session
      const sessionData = await this.sessionManager.createSession({
        sessionId: ID.unique(),
        userId,
        deviceFingerprint: await this.getDeviceFingerprint(),
        rememberMe: true,
        tokens: await this.tokenService.generateTokenPair({
          userId,
          sessionId: ID.unique(),
          userType: "client",
        }),
      })

      return {
        success: true,
        provider,
        user: {
          id: userId,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          emailVerified: userInfo.emailVerified,
        },
        tokens: sessionData.tokens,
        isNewUser,
      }
    } catch (error) {
      console.error("Failed to process social auth:", error)
      return {
        success: false,
        provider,
        isNewUser: false,
        error: "Failed to process authentication",
      }
    }
  }

  private async getSocialAccount(userId: string, provider: string): Promise<any> {
    const accounts = await appwriteDatabases.listDocuments(
      this.DATABASE_ID,
      this.COLLECTION_SOCIAL,
      [Query.equal("userId", userId), Query.equal("provider", provider)],
    )

    return accounts.documents[0]
  }

  private async findUserByEmail(email: string): Promise<any> {
    try {
      const users = await appwriteDatabases.listDocuments(this.DATABASE_ID, "users", [
        Query.equal("email", email.toLowerCase()),
      ])
      return users.documents[0]
    } catch {
      return null
    }
  }

  private async createUserFromSocial(provider: string, userInfo: any): Promise<any> {
    // Create user in Appwrite
    const user = await appwriteAccount.create(
      ID.unique(),
      userInfo.email,
      ID.unique(), // Random password for social users
      userInfo.name,
    )

    // Create user profile
    await appwriteDatabases.createDocument(this.DATABASE_ID, "users", user.$id, {
      email: userInfo.email.toLowerCase(),
      fullName: userInfo.name,
      userType: "client",
      profilePicture: userInfo.picture,
      emailVerified: userInfo.emailVerified,
      authProvider: provider,
      status: "active",
      createdAt: new Date().toISOString(),
    })

    return user
  }

  private async userHasPassword(userId: string): Promise<boolean> {
    try {
      const user = await appwriteDatabases.getDocument(this.DATABASE_ID, "users", userId)
      return user.authProvider === "email" || user.hasPassword === true
    } catch {
      return false
    }
  }

  private async getDeviceFingerprint(): Promise<string> {
    // Generate device fingerprint
    // In production, use more sophisticated fingerprinting
    return Platform.OS + "-" + Date.now().toString(36)
  }
}

export default SocialAuthService
