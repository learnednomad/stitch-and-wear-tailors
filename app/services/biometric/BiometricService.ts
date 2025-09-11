/**
 * BiometricService - Premium biometric authentication service
 * Implements modern security patterns with device integrity checks and fallbacks
 */

import {
  isSensorAvailable,
  simplePrompt,
  authenticateWithOptions,
  getDeviceIntegrityStatus,
  createKeys,
  deleteKeys,
  getAllKeys,
  getDiagnosticInfo,
  runBiometricTest,
  setDebugMode,
} from "@sbaiahmed1/react-native-biometrics"
import { Alert, Platform } from "react-native"
import * as storage from "@/utils/storage"

export interface BiometricSensorInfo {
  available: boolean
  biometryType?: string
  error?: string
}

export interface BiometricAuthResult {
  success: boolean
  error?: string
  errorCode?: string
  fallbackUsed?: boolean
}

export interface DeviceSecurityResult {
  isSecure: boolean
  isCompromised: boolean
  riskLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
  reasons: string[]
}

export interface BiometricConfig {
  title?: string
  subtitle?: string
  description?: string
  cancelLabel?: string
  fallbackLabel?: string
  allowDeviceCredentials?: boolean
  disableDeviceFallback?: boolean
}

class BiometricServiceImpl {
  private isInitialized = false
  private keyAlias = "com.stitchandwear.biometric.main"
  private debugMode = __DEV__

  /**
   * Initialize the biometric service with comprehensive checks
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await setDebugMode(this.debugMode)

      // Check device security status
      const securityStatus = await this.checkDeviceSecurity()
      if (!securityStatus.isSecure && securityStatus.riskLevel === "HIGH") {
        console.warn("⚠️ Device security compromised, biometric auth disabled")
        return
      }

      // Run comprehensive diagnostic if in debug mode
      if (this.debugMode) {
        const diagnostics = await this.runDiagnostics()
        console.log("🔍 Biometric Diagnostics:", diagnostics)
      }

      this.isInitialized = true
      console.log("✅ BiometricService initialized successfully")
    } catch (error) {
      console.error("💥 BiometricService initialization failed:", error)
    }
  }

  /**
   * Check if biometric authentication is available on this device
   */
  async isBiometricAvailable(): Promise<BiometricSensorInfo> {
    try {
      const sensorInfo = await isSensorAvailable()

      return {
        available: sensorInfo.available,
        biometryType: sensorInfo.biometryType,
        error: sensorInfo.error,
      }
    } catch (error: any) {
      console.error("💥 Error checking biometric availability:", error)
      return {
        available: false,
        error: error.message || "Unknown error",
      }
    }
  }

  /**
   * Check device security and integrity status
   */
  async checkDeviceSecurity(): Promise<DeviceSecurityResult> {
    try {
      const integrityStatus = await getDeviceIntegrityStatus()
      const reasons: string[] = []

      if (integrityStatus.isCompromised) {
        if (integrityStatus.isRooted) reasons.push("Device is rooted")
        if (integrityStatus.isJailbroken) reasons.push("Device is jailbroken")
        if (integrityStatus.isKeyguardSecure === false) reasons.push("Device lock not secure")
      }

      return {
        isSecure: !integrityStatus.isCompromised,
        isCompromised: integrityStatus.isCompromised,
        riskLevel: integrityStatus.riskLevel,
        reasons,
      }
    } catch (error: any) {
      console.error("💥 Device security check failed:", error)
      return {
        isSecure: false,
        isCompromised: false,
        riskLevel: "UNKNOWN",
        reasons: ["Security check failed"],
      }
    }
  }

  /**
   * Authenticate user with customizable biometric prompt
   */
  async authenticate(config?: BiometricConfig): Promise<BiometricAuthResult> {
    try {
      await this.initialize()

      // Check if biometrics are available
      const sensorInfo = await this.isBiometricAvailable()
      if (!sensorInfo.available) {
        return {
          success: false,
          error: sensorInfo.error || "Biometric authentication not available",
          errorCode: "BIOMETRIC_NOT_AVAILABLE",
        }
      }

      // Check device security
      const securityStatus = await this.checkDeviceSecurity()
      if (!securityStatus.isSecure && securityStatus.riskLevel === "HIGH") {
        return {
          success: false,
          error: "Device security compromised. Please use alternative authentication.",
          errorCode: "DEVICE_COMPROMISED",
        }
      }

      // Default configuration for luxury tailoring app
      const authConfig: BiometricConfig = {
        title: "🔐 Secure Access",
        subtitle: "Authenticate with your biometric",
        description: "Verify your identity to access your tailoring profile securely",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        allowDeviceCredentials: true,
        disableDeviceFallback: false,
        ...config,
      }

      // Perform authentication
      const result = await authenticateWithOptions(authConfig)

      if (result.success) {
        // Store successful authentication timestamp
        await storage.save("lastBiometricAuth", new Date().toISOString())
        return {
          success: true,
          fallbackUsed: authConfig.allowDeviceCredentials && !result.success,
        }
      } else {
        return {
          success: false,
          error: result.error || "Authentication failed",
          errorCode: result.errorCode || "AUTH_FAILED",
        }
      }
    } catch (error: any) {
      console.error("💥 Biometric authentication failed:", error)
      return {
        success: false,
        error: error.message || "Authentication error occurred",
        errorCode: "UNKNOWN_ERROR",
      }
    }
  }

  /**
   * Simple biometric prompt for quick authentication
   */
  async quickAuth(reason: string = "Authenticate to continue"): Promise<boolean> {
    try {
      await this.initialize()

      const sensorInfo = await this.isBiometricAvailable()
      if (!sensorInfo.available) {
        return false
      }

      const result = await simplePrompt(reason)
      return result
    } catch (error) {
      console.error("💥 Quick auth failed:", error)
      return false
    }
  }

  /**
   * Setup biometric keys for secure operations
   */
  async setupBiometricKeys(): Promise<{ success: boolean; publicKey?: string; error?: string }> {
    try {
      await this.initialize()

      const result = await createKeys()
      await storage.save("biometricPublicKey", result.publicKey)

      console.log("🔐 Biometric keys created successfully")
      return {
        success: true,
        publicKey: result.publicKey,
      }
    } catch (error: any) {
      console.error("💥 Failed to create biometric keys:", error)
      return {
        success: false,
        error: error.message || "Key creation failed",
      }
    }
  }

  /**
   * Remove biometric keys (logout/security reset)
   */
  async removeBiometricKeys(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await deleteKeys()
      await storage.remove("biometricPublicKey")
      await storage.remove("lastBiometricAuth")

      console.log("🗑️ Biometric keys removed successfully")
      return { success: result.success }
    } catch (error: any) {
      console.error("💥 Failed to remove biometric keys:", error)
      return {
        success: false,
        error: error.message || "Key deletion failed",
      }
    }
  }

  /**
   * Get stored biometric keys
   */
  async getBiometricKeys(): Promise<
    Array<{ alias: string; publicKey: string; creationDate?: string }>
  > {
    try {
      const result = await getAllKeys()
      return result.keys
    } catch (error) {
      console.error("💥 Failed to retrieve biometric keys:", error)
      return []
    }
  }

  /**
   * Run comprehensive diagnostics (development only)
   */
  async runDiagnostics(): Promise<any> {
    if (!this.debugMode) return null

    try {
      const [diagnosticInfo, testResults] = await Promise.all([
        getDiagnosticInfo(),
        runBiometricTest(),
      ])

      return {
        device: diagnosticInfo,
        tests: testResults,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("💥 Diagnostic failed:", error)
      return null
    }
  }

  /**
   * Show appropriate authentication prompt based on device capabilities
   */
  async showAuthPrompt(): Promise<BiometricAuthResult> {
    const sensorInfo = await this.isBiometricAvailable()

    if (!sensorInfo.available) {
      // No biometric available, show alert with alternatives
      return new Promise((resolve) => {
        Alert.alert(
          "Authentication Required",
          "Biometric authentication is not available. Please use your device passcode.",
          [
            {
              text: "Use Passcode",
              onPress: () =>
                resolve({
                  success: false,
                  errorCode: "BIOMETRIC_NOT_AVAILABLE",
                  error: "Please use device passcode",
                }),
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () =>
                resolve({
                  success: false,
                  errorCode: "USER_CANCELLED",
                  error: "User cancelled authentication",
                }),
            },
          ],
        )
      })
    }

    // Determine appropriate prompt based on biometric type
    let title = "🔐 Secure Access"
    let subtitle = "Authenticate with your biometric"

    switch (sensorInfo.biometryType) {
      case "FaceID":
        title = "👤 Face ID"
        subtitle = "Look at your device to authenticate"
        break
      case "TouchID":
        title = "👆 Touch ID"
        subtitle = "Place your finger on the sensor"
        break
      case "Fingerprint":
        title = "🔍 Fingerprint"
        subtitle = "Place your finger on the sensor"
        break
    }

    return this.authenticate({
      title,
      subtitle,
      description: "Access your premium tailoring experience securely",
      allowDeviceCredentials: true,
      disableDeviceFallback: false,
    })
  }

  /**
   * Check if user has recently authenticated with biometrics
   */
  async hasRecentAuth(timeoutMinutes: number = 15): Promise<boolean> {
    try {
      const lastAuth = await storage.load("lastBiometricAuth")
      if (!lastAuth) return false

      const lastAuthTime = new Date(lastAuth)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastAuthTime.getTime()) / (1000 * 60)

      return diffMinutes < timeoutMinutes
    } catch (error) {
      console.error("💥 Failed to check recent auth:", error)
      return false
    }
  }

  /**
   * Get user-friendly biometric type description
   */
  getBiometricDescription(biometryType?: string): string {
    switch (biometryType) {
      case "FaceID":
        return "Face ID"
      case "TouchID":
        return "Touch ID"
      case "Fingerprint":
        return "Fingerprint"
      case "Biometrics":
        return "Biometric Authentication"
      default:
        return "Biometric Authentication"
    }
  }
}

export const BiometricService = new BiometricServiceImpl()
export default BiometricService
