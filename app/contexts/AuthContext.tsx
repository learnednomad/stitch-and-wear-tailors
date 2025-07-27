/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app,
 * wrapping the AuthStore with React Context for easier access.
 */

import React, { createContext, useContext, useEffect, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
import * as storage from "@/utils/storage"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  signIn: (email: string, password: string) => Promise<void>
  signUp: (userData: any) => Promise<void>
  signOut: () => Promise<void>
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = observer(({ children }) => {
  const { authStore } = useStores()

  // Check authentication status on app start
  useEffect(() => {
    authStore.checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    // Use the AuthStore's built-in checkAuthStatus method
    await authStore.checkAuthStatus()
  }

  const clearStoredAuth = async () => {
    // Use the AuthStore's built-in clearAuth method
    authStore.clearAuth()
  }

  const signIn = async (email: string, password: string) => {
    try {
      // AuthStore now handles persistence internally
      const result = await authStore.signIn({ email, password })
      return result
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signUp = async (userData: any) => {
    try {
      // AuthStore now handles persistence internally
      const result = await authStore.signUp(userData)
      return result
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signOut = async () => {
    // AuthStore now handles clearing persistence internally
    await authStore.signOut()
  }

  const contextValue: AuthContextType = {
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading || authStore.status === "checking",
    user: authStore.user,
    signIn,
    signUp,
    signOut,
    checkAuthStatus,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
})

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
