import { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import AuthService from "@/services/auth/AuthService"
import { spacing, colors } from "@/theme"
import { ValidationUtils } from "@/utils/validation"
import { ErrorHandler } from "@/utils/error-handler"
import { RateLimiter } from "@/utils/rate-limiter"
import { PremiumSignInForm } from "@/components/PremiumSignInForm"
import { BiometricService } from "@/services/biometric/BiometricService"

interface SignInScreenProps extends AppStackScreenProps<"SignIn"> {}

export const SignInScreen: FC<SignInScreenProps> = observer(function SignInScreen() {
  const { authStore } = useStores()
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async (email: string, password: string, biometric = false) => {
    // Clear previous errors
    authStore.clearError()

    // Validate form input (skip validation for biometric auth)
    if (!biometric) {
      const validation = ValidationUtils.validateLoginForm({ email, password })
      if (!validation.isValid) {
        Alert.alert("Invalid Input", Object.values(validation.errors)[0])
        return
      }
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check rate limiting (skip for biometric auth)
    if (!biometric) {
      const rateLimitResult = RateLimiter.checkLoginAttempts(trimmedEmail)
      if (!rateLimitResult.allowed) {
        const timeRemaining = RateLimiter.formatTimeRemaining(
          RateLimiter.getBlockTimeRemaining(`login_${trimmedEmail}`),
        )
        Alert.alert("Rate Limited", `Too many failed attempts. Try again in ${timeRemaining}.`)
        return
      }
    }

    setIsLoading(true)
    authStore.setLoading(true)

    try {
      // Use the new AuthService
      const result = await AuthService.login({
        email: trimmedEmail,
        password,
        rememberMe: true,
      })

      if (result.success && result.data) {
        // Reset rate limiting on successful login
        if (!biometric) {
          RateLimiter.resetLoginAttempts(trimmedEmail)
        }

        // Check if email verification is required
        if (result.requiresVerification) {
          Alert.alert(
            "Email Not Verified",
            "Please verify your email before signing in. Check your inbox for the verification link.",
            [
              {
                text: "Resend Verification",
                onPress: async () => {
                  const verifyResult = await AuthService.resendVerificationEmail(
                    result.data!.user.$id,
                  )
                  if (verifyResult.success) {
                    Alert.alert("Verification Sent", "Please check your email.")
                  }
                  navigation.navigate("VerifyEmail" as never)
                },
              },
              {
                text: "OK",
                style: "cancel",
                onPress: () => navigation.navigate("VerifyEmail" as never),
              },
            ],
          )
          return
        }

        // Get user profile from database
        const profile = await AuthService.getUserProfile(result.data.user.$id)

        const userData = {
          id: result.data.user.$id,
          email: result.data.user.email,
          role: profile?.userType || ("client" as const),
          status: profile?.status || ("active" as const),
          profile: {
            firstName: profile?.firstName || result.data.user.name.split(" ")[0] || "",
            lastName:
              profile?.lastName || result.data.user.name.split(" ").slice(1).join(" ") || "",
            phone: profile?.phone || result.data.user.phone || "",
            avatar: "",
          },
          preferences: {
            notifications: {
              email: true,
              push: true,
              sms: false,
            },
            language: "en",
            timezone: "UTC",
            currency: "USD",
          },
          emailVerified: result.data.user.emailVerification,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date(result.data.user.registration).toISOString(),
          updatedAt: new Date(result.data.user.accessedAt).toISOString(),
        }

        authStore.setUser(userData)
        authStore.setSession({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresAt: result.data.session.expire,
        })

        // Setup biometric keys for future authentication
        if (biometric) {
          await BiometricService.setupBiometricKeys()
        }

        const userRole = userData.role
        if (userRole === "tailor") {
          navigation.navigate("TailorTab" as never)
        } else {
          navigation.navigate("ClientTab" as never)
        }
      } else {
        // Record failed login attempt
        if (!biometric) {
          RateLimiter.recordFailedLogin(trimmedEmail)
        }

        // Handle specific error cases
        let errorMessage = result.error || "Login failed"

        // Check for specific error types
        if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
          errorMessage = "Too many login attempts. Please try again later."
        } else if (errorMessage.includes("invalid") || errorMessage.includes("incorrect")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again."
        } else if (errorMessage.includes("disabled") || errorMessage.includes("suspended")) {
          errorMessage = "Your account has been suspended. Please contact support."
        }

        authStore.setError(errorMessage)
        Alert.alert("Sign In Failed", errorMessage)
      }
    } catch (error: any) {
      console.error("Sign in error:", error)

      // Record failed login attempt
      if (!biometric) {
        RateLimiter.recordFailedLogin(trimmedEmail)
      }

      const friendlyError = ErrorHandler.formatErrorMessage(error)
      authStore.setError(friendlyError)

      Alert.alert("Error", friendlyError)
    } finally {
      setIsLoading(false)
      authStore.setLoading(false)
    }
  }

  const handleSignUp = () => {
    navigation.navigate("SignUp" as never)
  }

  const handleBiometricAuth = async () => {
    try {
      // Check if user has stored credentials for biometric auth
      const hasRecentAuth = await BiometricService.hasRecentAuth(30) // 30 minutes timeout

      if (hasRecentAuth) {
        // User has recent auth, directly authenticate
        const result = await BiometricService.quickAuth("Access your tailoring profile")

        if (result) {
          // For demo purposes, we'll use stored credentials or navigate to main app
          // In production, you'd retrieve stored encrypted credentials
          Alert.alert("Biometric Success", "Welcome back! Biometric authentication successful.")

          // Navigate to appropriate screen based on user role
          const userRole = authStore.user?.role || "client"
          if (userRole === "tailor") {
            navigation.navigate("TailorTab" as never)
          } else {
            navigation.navigate("ClientTab" as never)
          }
        }
      } else {
        Alert.alert(
          "Biometric Setup Required",
          "Please sign in with your email and password first to enable biometric authentication.",
          [{ text: "OK" }],
        )
      }
    } catch (error) {
      console.error("Biometric authentication error:", error)
      Alert.alert(
        "Authentication Error",
        "Failed to authenticate with biometrics. Please try again.",
      )
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword" as never)
  }

  return (
    <Screen
      preset="scroll"
      backgroundColor="#ffffff"
      safeAreaEdges={["top", "bottom"]}
      keyboardShouldPersistTaps="handled"
    >
      <PremiumSignInForm
        onSignIn={handleSignIn}
        onForgotPassword={handleForgotPassword}
        onSignUp={handleSignUp}
        onBiometricAuth={handleBiometricAuth}
        isLoading={isLoading || authStore.isLoading}
      />
    </Screen>
  )
})
