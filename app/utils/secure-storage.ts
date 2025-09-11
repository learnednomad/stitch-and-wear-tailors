/**
 * Secure Storage Utility using react-native-keychain
 * Provides secure storage for sensitive authentication data
 */

import Keychain from "react-native-keychain"

export class SecureStorage {
  private static readonly SERVICE_NAME = "StitchAndWearTailors"

  /**
   * Store authentication tokens securely
   */
  static async setAuthTokens(tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: string
  }): Promise<boolean> {
    try {
      const tokenData = JSON.stringify(tokens)
      await Keychain.setInternetCredentials("auth_tokens", "auth_tokens", tokenData, {
        service: this.SERVICE_NAME,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        authenticatePrompt: "Authenticate to access your account",
      })
      return true
    } catch (error) {
      console.error("Failed to store auth tokens:", error)
      return false
    }
  }

  /**
   * Retrieve authentication tokens securely
   */
  static async getAuthTokens(): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: string
  } | null> {
    try {
      const credentials = await Keychain.getInternetCredentials("auth_tokens", {
        service: this.SERVICE_NAME,
        authenticatePrompt: "Authenticate to access your account",
      })

      if (credentials && credentials.password) {
        return JSON.parse(credentials.password)
      }
      return null
    } catch (error) {
      console.error("Failed to retrieve auth tokens:", error)
      return null
    }
  }

  /**
   * Store user credentials securely (if remember me is enabled)
   */
  static async setUserCredentials(email: string, rememberMe: boolean): Promise<boolean> {
    try {
      if (!rememberMe) {
        await this.removeUserCredentials()
        return true
      }

      await Keychain.setInternetCredentials(
        "user_credentials",
        email,
        JSON.stringify({ rememberMe }),
        {
          service: this.SERVICE_NAME,
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        },
      )
      return true
    } catch (error) {
      console.error("Failed to store user credentials:", error)
      return false
    }
  }

  /**
   * Retrieve stored user credentials
   */
  static async getUserCredentials(): Promise<{ email: string; rememberMe: boolean } | null> {
    try {
      const credentials = await Keychain.getInternetCredentials("user_credentials", {
        service: this.SERVICE_NAME,
      })

      if (credentials && credentials.username) {
        const data = JSON.parse(credentials.password)
        return {
          email: credentials.username,
          rememberMe: data.rememberMe,
        }
      }
      return null
    } catch (error) {
      console.error("Failed to retrieve user credentials:", error)
      return null
    }
  }

  /**
   * Store user profile data securely
   */
  static async setUserProfile(profileData: any): Promise<boolean> {
    try {
      const dataString = JSON.stringify(profileData)
      await Keychain.setInternetCredentials("user_profile", "user_profile", dataString, {
        service: this.SERVICE_NAME,
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
      })
      return true
    } catch (error) {
      console.error("Failed to store user profile:", error)
      return false
    }
  }

  /**
   * Retrieve user profile data
   */
  static async getUserProfile(): Promise<any | null> {
    try {
      const credentials = await Keychain.getInternetCredentials("user_profile", {
        service: this.SERVICE_NAME,
      })

      if (credentials && credentials.password) {
        return JSON.parse(credentials.password)
      }
      return null
    } catch (error) {
      console.error("Failed to retrieve user profile:", error)
      return null
    }
  }

  /**
   * Remove authentication tokens
   */
  static async removeAuthTokens(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials("auth_tokens", {
        service: this.SERVICE_NAME,
      })
      return true
    } catch (error) {
      console.error("Failed to remove auth tokens:", error)
      return false
    }
  }

  /**
   * Remove user credentials
   */
  static async removeUserCredentials(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials("user_credentials", {
        service: this.SERVICE_NAME,
      })
      return true
    } catch (error) {
      console.error("Failed to remove user credentials:", error)
      return false
    }
  }

  /**
   * Remove user profile data
   */
  static async removeUserProfile(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials("user_profile", {
        service: this.SERVICE_NAME,
      })
      return true
    } catch (error) {
      console.error("Failed to remove user profile:", error)
      return false
    }
  }

  /**
   * Clear all secure storage data
   */
  static async clearAll(): Promise<boolean> {
    try {
      await Promise.all([
        this.removeAuthTokens(),
        this.removeUserCredentials(),
        this.removeUserProfile(),
      ])
      return true
    } catch (error) {
      console.error("Failed to clear secure storage:", error)
      return false
    }
  }

  /**
   * Check if biometric authentication is available
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType()
      return biometryType !== null
    } catch (error) {
      console.error("Failed to check biometric availability:", error)
      return false
    }
  }
}
