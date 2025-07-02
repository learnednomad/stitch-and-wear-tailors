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
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      authStore.setStatus("checking")
      
      // Try to get stored session
      const storedSession = storage.load("userSession")
      const storedUser = storage.load("currentUser")
      
      if (storedSession && storedUser) {
        // Verify session is still valid with Appwrite
        const authAdapter = getAppwriteAuthAdapter()
        const result = await authAdapter.getCurrentUser()
        
        if (result.success) {
          // Restore auth state
          authStore.setUser(storedUser)
          authStore.setSession(storedSession)
          authStore.setStatus("authenticated")
        } else {
          // Session expired, clear stored data
          await clearStoredAuth()
          authStore.setStatus("unauthenticated")
        }
      } else {
        authStore.setStatus("unauthenticated")
      }
    } catch (error) {
      console.error("Auth status check failed:", error)
      await clearStoredAuth()
      authStore.setStatus("unauthenticated")
    }
  }

  const clearStoredAuth = async () => {
    try {
      storage.remove("userSession")
      storage.remove("currentUser")
    } catch (error) {
      console.error("Failed to clear stored auth:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authStore.signIn({ email, password })
      
      if (authStore.isAuthenticated && authStore.user && authStore.session) {
        // Store session and user data
        storage.save("userSession", {
          accessToken: authStore.session.accessToken,
          refreshToken: authStore.session.refreshToken,
          expiresAt: authStore.session.expiresAt,
        })
        storage.save("currentUser", authStore.user)
      }
      
      return result
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signUp = async (userData: any) => {
    try {
      const result = await authStore.signUp(userData)
      
      if (authStore.isAuthenticated && authStore.user && authStore.session) {
        // Store session and user data
        storage.save("userSession", {
          accessToken: authStore.session.accessToken,
          refreshToken: authStore.session.refreshToken,
          expiresAt: authStore.session.expiresAt,
        })
        storage.save("currentUser", authStore.user)
      }
      
      return result
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authStore.signOut()
    } finally {
      await clearStoredAuth()
    }
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

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
})

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}