/**
 * Reactotron Development Configuration
 *
 * Comprehensive development tools configuration for debugging the
 * Stitch and Wear Tailors application with enhanced API monitoring.
 */

import { Platform } from "react-native"
import Config from "../config"

/**
 * Reactotron configuration for different environments
 */
export const ReactotronDevConfig = {
  /**
   * Development environment settings
   */
  development: {
    name: "Stitch & Wear Tailors (Dev)",
    host: "localhost",
    port: 9090,
    enabled: __DEV__,
    networking: {
      ignoreUrls: /symbolicate|logs|hot-reload/,
      ignoreContentTypes: /^(image|video)\//,
    },
    features: {
      mst: true,
      mmkv: true,
      networking: true,
      asyncStorage: false, // Using MMKV instead
      trackGlobalErrors: true,
      openInEditor: true,
    },
    customCommands: {
      navigation: true,
      storage: true,
      api: true,
      authentication: true,
      storeReset: true,
    },
  },

  /**
   * Staging environment settings
   */
  staging: {
    name: "Stitch & Wear Tailors (Staging)",
    host: "localhost",
    port: 9090,
    enabled: __DEV__,
    networking: {
      ignoreUrls: /symbolicate|logs|hot-reload|analytics/,
      ignoreContentTypes: /^(image|video)\//,
    },
    features: {
      mst: true,
      mmkv: true,
      networking: true,
      asyncStorage: false,
      trackGlobalErrors: true,
      openInEditor: false,
    },
    customCommands: {
      navigation: true,
      storage: true,
      api: true,
      authentication: false,
      storeReset: false,
    },
  },

  /**
   * Production environment settings (disabled)
   */
  production: {
    name: "Stitch & Wear Tailors (Prod)",
    enabled: false,
    features: {},
    customCommands: {},
  },
}

/**
 * Get current environment configuration
 */
export function getCurrentReactotronConfig() {
  const environment = __DEV__ ? "development" : "production"

  switch (environment) {
    case "production":
      return ReactotronDevConfig.production
    case "development":
    default:
      return ReactotronDevConfig.development
  }
}

/**
 * Platform-specific Reactotron settings
 */
export const PlatformConfig = {
  ios: {
    simulator: {
      host: "localhost",
      port: 9090,
    },
    device: {
      host: "YOUR_IP_ADDRESS", // Users need to set their IP
      port: 9090,
    },
  },
  android: {
    emulator: {
      host: "10.0.2.2", // Android emulator host
      port: 9090,
    },
    device: {
      host: "YOUR_IP_ADDRESS", // Users need to set their IP
      port: 9090,
    },
  },
  web: {
    host: "localhost",
    port: 9090,
  },
}

/**
 * Get platform-specific host configuration
 */
export function getReactotronHost(): string {
  if (Platform.OS === "web") {
    return PlatformConfig.web.host
  }

  if (Platform.OS === "ios") {
    return __DEV__ ? PlatformConfig.ios.simulator.host : PlatformConfig.ios.device.host
  }

  if (Platform.OS === "android") {
    return __DEV__ ? PlatformConfig.android.emulator.host : PlatformConfig.android.device.host
  }

  return "localhost"
}

/**
 * Get platform-specific port configuration
 */
export function getReactotronPort(): number {
  return 9090 // Default port
}

/**
 * Custom command configuration
 */
export const CustomCommandsConfig = {
  /**
   * Navigation debugging commands
   */
  navigation: [
    {
      command: "resetNavigation",
      title: "Reset Navigation State",
      description: "Resets the navigation state to initial",
    },
    {
      command: "navigateTo",
      title: "Navigate To Screen",
      description: "Navigate to any screen by name",
      args: ["route"],
    },
    {
      command: "goBack",
      title: "Go Back",
      description: "Navigate back one screen",
    },
  ],

  /**
   * Storage debugging commands
   */
  storage: [
    {
      command: "resetStore",
      title: "Reset Root Store",
      description: "Clear all MST store data",
    },
    {
      command: "clearStorage",
      title: "Clear MMKV Storage",
      description: "Clear all MMKV storage data",
    },
  ],

  /**
   * API debugging commands
   */
  api: [
    {
      command: "showApiStats",
      title: "Show API Statistics",
      description: "Display API performance metrics",
    },
    {
      command: "showApiHistory",
      title: "Show API History",
      description: "Display recent API requests",
    },
    {
      command: "clearApiData",
      title: "Clear API Data",
      description: "Clear API monitoring data",
    },
    {
      command: "testEndpoint",
      title: "Test API Endpoint",
      description: "Test any API endpoint",
      args: ["endpoint"],
    },
  ],

  /**
   * Authentication debugging commands
   */
  authentication: [
    {
      command: "clearAuth",
      title: "Clear Authentication",
      description: "Clear all auth tokens and session data",
    },
    {
      command: "mockLogin",
      title: "Mock Login",
      description: "Simulate successful login",
    },
  ],
}

/**
 * Development utilities
 */
export const ReactotronDevUtils = {
  /**
   * Check if Reactotron should be enabled
   */
  isEnabled(): boolean {
    const config = getCurrentReactotronConfig()
    return config.enabled && __DEV__
  },

  /**
   * Get connection configuration
   */
  getConnectionConfig() {
    const config = getCurrentReactotronConfig()
    return {
      name: config.name,
      host: getReactotronHost(),
      port: getReactotronPort(),
    }
  },

  /**
   * Log environment info
   */
  logEnvironmentInfo(): void {
    if (!__DEV__) return

    const config = getCurrentReactotronConfig()
    console.log("🔧 Reactotron Development Configuration:", {
      environment: __DEV__ ? "development" : "production",
      platform: Platform.OS,
      host: getReactotronHost(),
      port: getReactotronPort(),
      features: config.features,
      enabled: config.enabled,
    })
  },

  /**
   * Setup development shortcuts
   */
  setupDevShortcuts(): void {
    if (!__DEV__) return // Add global shortcuts for common debugging tasks
    ;(global as any).debugApi = () => {
      const { ReactotronApiUtils } = require("./ReactotronApiPlugin")
      ReactotronApiUtils.logServiceStats()
      ReactotronApiUtils.showRequestHistory()
    }
    ;(global as any).clearAllData = () => {
      const { clear } = require("../utils/storage")
      const { ReactotronApiUtils } = require("./ReactotronApiPlugin")
      clear()
      ReactotronApiUtils.clearAll()
      console.log("🧹 All app data cleared")
    }

    console.log("🚀 Development shortcuts available:")
    console.log("  - debugApi() - Show API statistics")
    console.log("  - clearAllData() - Clear all app data")
  },
}

/**
 * Development environment validation
 */
export const DevEnvironmentValidator = {
  /**
   * Check if development environment is properly configured
   */
  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check if running in development mode
    if (!__DEV__) {
      issues.push("Not running in development mode")
    }

    // Check if Reactotron is enabled
    const config = getCurrentReactotronConfig()
    if (!config.enabled) {
      issues.push("Reactotron is disabled in configuration")
    }

    // Check network configuration
    const host = getReactotronHost()
    if (host === "YOUR_IP_ADDRESS") {
      issues.push("IP address not configured for device testing")
    }

    // Check if required development tools are available
    try {
      require("reactotron-react-native")
    } catch (error) {
      issues.push("Reactotron React Native not available")
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  },

  /**
   * Log validation results
   */
  logValidation(): void {
    if (!__DEV__) return

    const validation = this.validate()

    if (validation.valid) {
      console.log("✅ Development environment is properly configured")
    } else {
      console.log("⚠️ Development environment issues found:")
      validation.issues.forEach((issue) => console.log(`  - ${issue}`))
    }
  },
}
