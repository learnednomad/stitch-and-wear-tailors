import { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, TouchableOpacity, TextStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, TextField, Button, Icon } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
import { spacing, colors } from "@/theme"
import { ValidationUtils } from "@/utils/validation"
import { ErrorHandler } from "@/utils/error-handler"
import { RateLimiter } from "@/utils/rate-limiter"

interface SignInScreenProps extends AppStackScreenProps<"SignIn"> {}

export const SignInScreen: FC<SignInScreenProps> = observer(function SignInScreen() {
  const { authStore } = useStores()
  const navigation = useNavigation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(authStore.rememberUser)
  const [currentTab, setCurrentTab] = useState<"login" | "register">("login")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [rateLimitError, setRateLimitError] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSignIn = async () => {
    // Clear previous errors
    setFormErrors({})
    setRateLimitError("")
    authStore.clearError()

    // Validate form input
    const validation = ValidationUtils.validateLoginForm({ email, password })
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      return
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check rate limiting
    const rateLimitResult = RateLimiter.checkLoginAttempts(trimmedEmail)
    if (!rateLimitResult.allowed) {
      const timeRemaining = RateLimiter.formatTimeRemaining(
        RateLimiter.getBlockTimeRemaining(`login_${trimmedEmail}`)
      )
      setRateLimitError(`Too many failed attempts. Try again in ${timeRemaining}.`)
      return
    }

    setIsLoading(true)
    authStore.setLoading(true)

    // Set remember user preference before signing in
    authStore.setRememberUser(rememberMe)

    try {
      const authAdapter = getAppwriteAuthAdapter()
      const result = await authAdapter.login(trimmedEmail, password)

      if (result.success && result.data) {
        // Reset rate limiting on successful login
        RateLimiter.resetLoginAttempts(trimmedEmail)

        const userData = {
          id: result.data.user.$id,
          email: result.data.user.email,
          role: "client" as const,
          status: "active" as const,
          profile: {
            firstName: result.data.user.name.split(" ")[0] || "",
            lastName: result.data.user.name.split(" ").slice(1).join(" ") || "",
            phone: result.data.user.phone || "",
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
          accessToken: result.data.session.$id,
          refreshToken: result.data.session.$id,
          expiresAt: result.data.session.expire,
        })

        const userRole = userData.role
        if (userRole === "tailor") {
          navigation.navigate("TailorTab" as never)
        } else {
          navigation.navigate("ClientTab" as never)
        }
      } else {
        // Record failed login attempt
        RateLimiter.recordFailedLogin(trimmedEmail)
        
        const friendlyError = ErrorHandler.formatErrorMessage(result)
        authStore.setError(friendlyError)
        
        Alert.alert("Sign In Failed", friendlyError)
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      
      // Record failed login attempt
      RateLimiter.recordFailedLogin(trimmedEmail)
      
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

  const handleFacebookLogin = () => {
    Alert.alert("Facebook Login", "Facebook login not implemented yet")
  }

  const handleGoogleLogin = () => {
    Alert.alert("Google Login", "Google login not implemented yet")
  }

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Forgot password not implemented yet")
  }

  return (
    <Screen
      preset="auto"
      backgroundColor="#f7fafc"
      contentContainerStyle={$contentContainer}
      safeAreaEdges={["top", "bottom"]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={$tabContainer}>
        <TouchableOpacity
          style={[$tab, currentTab === "login" && $activeTab]}
          onPress={() => setCurrentTab("login")}
        >
          <Text text="Login" style={[$tabText, currentTab === "login" && $activeTabText]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[$tab, currentTab === "register" && $activeTab]}
          onPress={() => {
            setCurrentTab("register")
            handleSignUp()
          }}
        >
          <Text text="Register" style={[$tabText, currentTab === "register" && $activeTabText]} />
        </TouchableOpacity>
      </View>

      <Text preset="heading" text="Welcome to Stitch & Wear" style={$title} />
      <Text
        text="Nigeria's premier luxury tailoring experience awaits you"
        style={$subtitle}
      />

      {(authStore.error || rateLimitError) && (
        <View style={$errorContainer}>
          <Text text={authStore.error || rateLimitError} style={$errorText} />
        </View>
      )}

      <TextField
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          // Clear email error when user starts typing
          if (formErrors.email) {
            setFormErrors(prev => ({ ...prev, email: "" }))
          }
        }}
        label="Email"
        placeholder="john.doe@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={[$textField, formErrors.email && $textFieldError]}
        status={formErrors.email ? "error" : undefined}
        helper={formErrors.email}
      />

      <TextField
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          // Clear password error when user starts typing
          if (formErrors.password) {
            setFormErrors(prev => ({ ...prev, password: "" }))
          }
        }}
        label="Password"
        placeholder="Type your password"
        secureTextEntry={!showPassword}
        style={[$textField, formErrors.password && $textFieldError]}
        status={formErrors.password ? "error" : undefined}
        helper={formErrors.password}
        RightAccessory={() => (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon 
              icon={showPassword ? "hidden" : "view"} 
              size={22} 
              style={$passwordIcon} 
            />
          </TouchableOpacity>
        )}
      />

      <View style={$rememberForgotContainer}>
        <TouchableOpacity style={$rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
          <View style={[$checkbox, rememberMe && $checkboxChecked]}>
            {rememberMe && <Text text="✓" style={$checkmark} />}
          </View>
          <Text text="Remember me" style={$rememberMeText} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text text="Forgot password?" style={$forgotPasswordText} />
        </TouchableOpacity>
      </View>

      <Button
        text={isLoading ? "Signing In..." : "Login"}
        onPress={handleSignIn}
        disabled={isLoading || authStore.isLoading}
        style={$loginButton}
      />

      <View style={$orContainer}>
        <View style={$orLine} />
        <Text text="OR" style={$orText} />
        <View style={$orLine} />
      </View>

      <Button
        text="Login with Facebook"
        onPress={handleFacebookLogin}
        style={$socialButton}
        textStyle={$socialButtonText}
        LeftAccessory={() => <Icon icon="facebook" size={20} style={$socialIcon} />}
      />

      <Button
        text="Login with Google"
        onPress={handleGoogleLogin}
        style={$socialButton}
        textStyle={$socialButtonText}
        LeftAccessory={() => <Icon icon="google" size={20} style={$socialIcon} />}
      />
    </Screen>
  )
})

const $contentContainer: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
}

const $tabContainer: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.xl,
  backgroundColor: "#e2e8f0",
  borderRadius: 12,
  padding: 6,
}

const $tab: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 6,
  alignItems: "center",
}

const $activeTab: ViewStyle = {
  backgroundColor: "#ffffff",
  elevation: 3,
  shadowColor: "#2B5D2F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
}

const $tabText: TextStyle = {
  fontSize: 14,
  color: "#666666",
  fontWeight: "500",
}

const $activeTabText: TextStyle = {
  color: "#333333",
  fontWeight: "600",
}

const $title: TextStyle = {
  marginBottom: spacing.sm,
  textAlign: "center",
  fontSize: 28,
  fontWeight: "700",
  color: "#1a202c",
  letterSpacing: 0.5,
}

const $subtitle: TextStyle = {
  marginBottom: spacing.xl,
  textAlign: "center",
  fontSize: 16,
  color: "#4a5568",
  lineHeight: 22,
  fontWeight: "400",
}

const $errorContainer: ViewStyle = {
  backgroundColor: "#fee2e2",
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: "#dc2626",
}

const $errorText: TextStyle = {
  color: "#dc2626",
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "500",
}

const $textFieldError: ViewStyle = {
  borderColor: "#dc2626",
  borderWidth: 1,
}

const $textField: ViewStyle = {
  marginBottom: spacing.lg,
}

const $passwordIcon: ViewStyle = {
  tintColor: "#999999",
}

const $rememberForgotContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xl,
}

const $rememberMeContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $checkbox: ViewStyle = {
  width: 20,
  height: 20,
  borderWidth: 1,
  borderColor: "#cccccc",
  borderRadius: 4,
  marginRight: spacing.sm,
  alignItems: "center",
  justifyContent: "center",
}

const $checkboxChecked: ViewStyle = {
  backgroundColor: "#007AFF",
  borderColor: "#007AFF",
}

const $checkmark: TextStyle = {
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "bold",
}

const $rememberMeText: TextStyle = {
  fontSize: 14,
  color: "#666666",
}

const $forgotPasswordText: TextStyle = {
  fontSize: 14,
  color: "#007AFF",
  textDecorationLine: "underline",
}

const $loginButton: ViewStyle = {
  marginBottom: spacing.lg,
  backgroundColor: "#2B5D2F",
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: "#2B5D2F",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
}

const $orContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.lg,
}

const $orLine: ViewStyle = {
  flex: 1,
  height: 1,
  backgroundColor: "#e0e0e0",
}

const $orText: TextStyle = {
  marginHorizontal: spacing.md,
  fontSize: 14,
  color: "#666666",
  fontWeight: "500",
}

const $socialButton: ViewStyle = {
  marginBottom: spacing.md,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: "#e0e0e0",
  borderRadius: 8,
}

const $socialButtonText: TextStyle = {
  color: "#333333",
  fontSize: 16,
  fontWeight: "500",
}

const $socialIcon: ViewStyle = {
  marginRight: spacing.sm,
}
