/**
 * Biometric Authentication Service
 * Implements Face ID, Touch ID, and fingerprint authentication
 */

import * as LocalAuthentication from "expo-local-authentication"
import * as Keychain from "react-native-keychain"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import { Platform } from "react-native"
import { appwriteDatabases } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"

export interface BiometricConfig {
  userId: string
  enabled: boolean
  biometricType: "face" | "fingerprint" | "iris" | "none"
  deviceId: string
  encryptedCredentials?: string
  lastUsedAt?: string
  createdAt: string
}

export interface BiometricAuthResult {
  success: boolean
  authenticated: boolean
  biometricType?: string
  error?: string
  requiresFallback?: boolean
}

export interface BiometricEnrollment {
  isAvailable: boolean
  isEnrolled: boolean
  biometricType: string
  supportedTypes: string[]
}

class BiometricAuthService {
  private readonly DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear"
  private readonly COLLECTION_BIOMETRIC = "biometric_config"
  private readonly KEYCHAIN_SERVICE = "StitchAndWearBiometric"
  private readonly STORAGE_KEY_PREFIX = "@biometric:"

  /**
   * Check if biometric authentication is available
   */
  async checkBiometricAvailability(): Promise<BiometricEnrollment> {
    try {
      // Check hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      if (!hasHardware) {
        return {
          isAvailable: false,
          isEnrolled: false,
          biometricType: "none",
          supportedTypes: [],
        }
      }

      // Check enrollment
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()

      // Get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
      const typeNames = this.mapAuthenticationTypes(supportedTypes)

      // Determine primary biometric type
      const biometricType = this.determinePrimaryBiometric(supportedTypes)

      return {
        isAvailable: hasHardware,
        isEnrolled,
        biometricType,
        supportedTypes: typeNames,
      }
    } catch (error) {
      console.error("Failed to check biometric availability:", error)
      return {
        isAvailable: false,
        isEnrolled: false,
        biometricType: "none",
        supportedTypes: [],
      }
    }
  }

  /**
   * Enable biometric authentication for user
   */
  async enableBiometric(
    userId: string,
    credentials: { email: string; password: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check availability
      const availability = await this.checkBiometricAvailability()
      if (!availability.isAvailable || !availability.isEnrolled) {
        return {
          success: false,
          error: "Biometric authentication not available or not enrolled",
        }
      }

      // Authenticate with biometric to confirm
      const authResult = await this.authenticateWithBiometric(
        "Enable biometric authentication",
        "Confirm your identity to enable biometric login",
      )

      if (!authResult.authenticated) {
        return { success: false, error: "Biometric authentication failed" }
      }

      // Generate device-specific encryption key
      const deviceId = await this.getDeviceId()
      const encryptionKey = await this.generateEncryptionKey(userId, deviceId)

      // Encrypt and store credentials
      const encryptedCredentials = await this.encryptCredentials(credentials, encryptionKey)

      // Store in secure keychain
      await this.storeInKeychain(userId, encryptedCredentials)

      // Save configuration to database
      await this.saveBiometricConfig({
        userId,
        enabled: true,
        biometricType: availability.biometricType as "face" | "fingerprint" | "iris",
        deviceId,
        encryptedCredentials: encryptedCredentials.reference,
        createdAt: new Date().toISOString(),
      })

      // Store local flag
      await AsyncStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}:enabled`, "true")

      return { success: true }
    } catch (error) {
      console.error("Failed to enable biometric:", error)
      return { success: false, error: "Failed to enable biometric authentication" }
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId: string): Promise<{ success: boolean }> {
    try {
      // Remove from keychain
      await this.removeFromKeychain(userId)

      // Update database configuration
      const config = await this.getBiometricConfig(userId)
      if (config) {
        await appwriteDatabases.updateDocument(
          this.DATABASE_ID,
          this.COLLECTION_BIOMETRIC,
          config.$id,
          {
            enabled: false,
            disabledAt: new Date().toISOString(),
          },
        )
      }

      // Clear local storage
      await AsyncStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}:enabled`)

      return { success: true }
    } catch (error) {
      console.error("Failed to disable biometric:", error)
      return { success: false }
    }
  }

  /**
   * Authenticate using biometric
   */
  async authenticate(userId: string): Promise<BiometricAuthResult> {
    try {
      // Check if biometric is enabled for user
      const isEnabled = await this.isBiometricEnabled(userId)
      if (!isEnabled) {
        return {
          success: false,
          authenticated: false,
          error: "Biometric authentication not enabled",
        }
      }

      // Perform biometric authentication
      const authResult = await this.authenticateWithBiometric(
        "Authenticate to StitchAndWear",
        "Place your finger on the sensor or look at the camera",
      )

      if (!authResult.authenticated) {
        return {
          success: false,
          authenticated: false,
          error: authResult.error,
          requiresFallback: true,
        }
      }

      // Retrieve stored credentials
      const credentials = await this.retrieveCredentials(userId)
      if (!credentials) {
        return {
          success: false,
          authenticated: false,
          error: "Failed to retrieve credentials",
          requiresFallback: true,
        }
      }

      // Update last used timestamp
      await this.updateLastUsed(userId)

      return {
        success: true,
        authenticated: true,
        biometricType: authResult.biometricType,
      }
    } catch (error) {
      console.error("Biometric authentication failed:", error)
      return {
        success: false,
        authenticated: false,
        error: "Authentication failed",
        requiresFallback: true,
      }
    }
  }

  /**
   * Get stored credentials after successful biometric auth
   */
  async getAuthenticatedCredentials(
    userId: string,
  ): Promise<{ email: string; password: string } | null> {
    try {
      // Verify biometric first
      const authResult = await this.authenticate(userId)
      if (!authResult.authenticated) {
        return null
      }

      // Retrieve and decrypt credentials
      return await this.retrieveCredentials(userId)
    } catch (error) {
      console.error("Failed to get authenticated credentials:", error)
      return null
    }
  }

  /**
   * Check if biometric is enabled for user
   */
  async isBiometricEnabled(userId: string): Promise<boolean> {
    try {
      // Check local storage first (faster)
      const localEnabled = await AsyncStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}:enabled`)

      if (localEnabled === "true") {
        return true
      }

      // Fallback to database check
      const config = await this.getBiometricConfig(userId)
      return config?.enabled === true
    } catch {
      return false
    }
  }

  /**
   * Re-authenticate biometric (for sensitive operations)
   */
  async reAuthenticate(userId: string, reason: string): Promise<BiometricAuthResult> {
    try {
      // Force fresh authentication
      const authResult = await this.authenticateWithBiometric(
        "Security Verification Required",
        reason,
      )

      if (authResult.authenticated) {
        await this.updateLastUsed(userId)
      }

      return authResult
    } catch (error) {
      console.error("Re-authentication failed:", error)
      return {
        success: false,
        authenticated: false,
        error: "Re-authentication failed",
      }
    }
  }

  // Private helper methods

  private async authenticateWithBiometric(
    promptTitle: string,
    promptMessage: string,
  ): Promise<BiometricAuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      })

      if (result.success) {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
        const biometricType = this.determinePrimaryBiometric(supportedTypes)

        return {
          success: true,
          authenticated: true,
          biometricType,
        }
      }

      return {
        success: false,
        authenticated: false,
        error: this.mapErrorCode(result.error),
        requiresFallback: result.error === "user_fallback",
      }
    } catch (error) {
      console.error("Biometric authentication error:", error)
      return {
        success: false,
        authenticated: false,
        error: "Authentication failed",
      }
    }
  }

  private async storeInKeychain(
    userId: string,
    encryptedData: { data: string; reference: string },
  ): Promise<void> {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      await Keychain.setInternetCredentials(this.KEYCHAIN_SERVICE, userId, encryptedData.data, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticatePrompt: "Authenticate to save credentials",
        authenticationPromptTitle: "Save Credentials",
      })
    } else {
      // Fallback for web/other platforms
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}${userId}:credentials`,
        encryptedData.data,
      )
    }
  }

  private async removeFromKeychain(userId: string): Promise<void> {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      await Keychain.resetInternetCredentials(this.KEYCHAIN_SERVICE)
    } else {
      await AsyncStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}:credentials`)
    }
  }

  private async retrieveFromKeychain(userId: string): Promise<string | null> {
    try {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        const credentials = await Keychain.getInternetCredentials(this.KEYCHAIN_SERVICE)
        return credentials ? credentials.password : null
      } else {
        return await AsyncStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}:credentials`)
      }
    } catch {
      return null
    }
  }

  private async encryptCredentials(
    credentials: { email: string; password: string },
    key: string,
  ): Promise<{ data: string; reference: string }> {
    const data = JSON.stringify(credentials)
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + key,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    )

    // In production, use proper encryption (AES)
    const encodedData = Buffer.from(data).toString("base64")

    return {
      data: encodedData,
      reference: encrypted.substring(0, 16), // Reference for verification
    }
  }

  private async decryptCredentials(
    encryptedData: string,
    key: string,
  ): Promise<{ email: string; password: string } | null> {
    try {
      // In production, use proper decryption (AES)
      const decrypted = Buffer.from(encryptedData, "base64").toString()
      return JSON.parse(decrypted)
    } catch {
      return null
    }
  }

  private async retrieveCredentials(
    userId: string,
  ): Promise<{ email: string; password: string } | null> {
    try {
      const encryptedData = await this.retrieveFromKeychain(userId)
      if (!encryptedData) {
        return null
      }

      const deviceId = await this.getDeviceId()
      const encryptionKey = await this.generateEncryptionKey(userId, deviceId)

      return await this.decryptCredentials(encryptedData, encryptionKey)
    } catch {
      return null
    }
  }

  private async generateEncryptionKey(userId: string, deviceId: string): Promise<string> {
    const combined = `${userId}:${deviceId}:${this.KEYCHAIN_SERVICE}`
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, combined, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem("device_id")
    if (!deviceId) {
      deviceId = ID.unique()
      await AsyncStorage.setItem("device_id", deviceId)
    }
    return deviceId
  }

  private async getBiometricConfig(userId: string): Promise<any> {
    try {
      const configs = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_BIOMETRIC,
        [Query.equal("userId", userId), Query.equal("enabled", true)],
      )
      return configs.documents[0]
    } catch {
      return null
    }
  }

  private async saveBiometricConfig(config: BiometricConfig): Promise<void> {
    // Check if config exists
    const existing = await this.getBiometricConfig(config.userId)

    if (existing) {
      await appwriteDatabases.updateDocument(
        this.DATABASE_ID,
        this.COLLECTION_BIOMETRIC,
        existing.$id,
        config,
      )
    } else {
      await appwriteDatabases.createDocument(
        this.DATABASE_ID,
        this.COLLECTION_BIOMETRIC,
        ID.unique(),
        config,
      )
    }
  }

  private async updateLastUsed(userId: string): Promise<void> {
    const config = await this.getBiometricConfig(userId)
    if (config) {
      await appwriteDatabases.updateDocument(
        this.DATABASE_ID,
        this.COLLECTION_BIOMETRIC,
        config.$id,
        {
          lastUsedAt: new Date().toISOString(),
        },
      )
    }
  }

  private mapAuthenticationTypes(types: number[]): string[] {
    const typeMap: { [key: number]: string } = {
      [LocalAuthentication.AuthenticationType.FINGERPRINT]: "fingerprint",
      [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: "face",
      [LocalAuthentication.AuthenticationType.IRIS]: "iris",
    }

    return types.map((type) => typeMap[type] || "unknown").filter((t) => t !== "unknown")
  }

  private determinePrimaryBiometric(types: number[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return "face"
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "fingerprint"
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "iris"
    }
    return "none"
  }

  private mapErrorCode(error: string): string {
    const errorMap: { [key: string]: string } = {
      user_cancel: "Authentication cancelled",
      user_fallback: "User chose to use password",
      system_cancel: "System cancelled authentication",
      lockout: "Too many failed attempts",
      not_enrolled: "Biometric not enrolled",
      not_available: "Biometric not available",
      not_present: "Biometric hardware not present",
      authentication_failed: "Authentication failed",
    }

    return errorMap[error] || "Unknown error"
  }
}

export default BiometricAuthService
