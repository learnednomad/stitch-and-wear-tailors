/**
 * SecureStorage — web fallback.
 *
 * The keychain does not exist in browsers; auth state on web lives in
 * localStorage like every SPA. Same public surface as the native
 * implementation so callers never branch on platform.
 */

const PREFIX = "sw.secure."

function setItem(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function getItem<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function removeItem(key: string): boolean {
  try {
    window.localStorage.removeItem(PREFIX + key)
    return true
  } catch {
    return false
  }
}

export class SecureStorage {
  static async setAuthTokens(tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: string
  }): Promise<boolean> {
    return setItem("auth_tokens", tokens)
  }

  static async getAuthTokens(): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: string
  } | null> {
    return getItem("auth_tokens")
  }

  static async setUserCredentials(email: string, rememberMe: boolean): Promise<boolean> {
    return setItem("user_credentials", { email, rememberMe })
  }

  static async getUserCredentials(): Promise<{ email: string; rememberMe: boolean } | null> {
    return getItem("user_credentials")
  }

  static async setUserProfile(profileData: any): Promise<boolean> {
    return setItem("user_profile", profileData)
  }

  static async getUserProfile(): Promise<any | null> {
    return getItem("user_profile")
  }

  static async removeAuthTokens(): Promise<boolean> {
    return removeItem("auth_tokens")
  }

  static async removeUserCredentials(): Promise<boolean> {
    return removeItem("user_credentials")
  }

  static async removeUserProfile(): Promise<boolean> {
    return removeItem("user_profile")
  }

  static async clearAll(): Promise<boolean> {
    this.removeAuthTokens()
    this.removeUserCredentials()
    this.removeUserProfile()
    return true
  }

  /** Biometrics are never available in the browser. */
  static async isBiometricAvailable(): Promise<boolean> {
    return false
  }
}
