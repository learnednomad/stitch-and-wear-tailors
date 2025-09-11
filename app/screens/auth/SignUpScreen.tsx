import { FC, useState, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, TouchableOpacity, TextStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, TextField, Button, PasswordStrengthIndicator, Icon } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import AuthService from "@/services/auth/AuthService"
import { validateEmail } from "@/utils/emailValidation"
import { validatePassword, validatePasswordConfirmation } from "@/utils/passwordValidation"
import { spacing, colors } from "@/theme"

interface SignUpScreenProps extends AppStackScreenProps<"SignUp"> {}

export const SignUpScreen: FC<SignUpScreenProps> = observer(function SignUpScreen() {
  const { authStore } = useStores()
  const navigation = useNavigation()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userType, setUserType] = useState<"client" | "tailor">("client")
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState<"login" | "register">("register")
  const [showEmailValidation, setShowEmailValidation] = useState(false)
  const [showPasswordValidation, setShowPasswordValidation] = useState(false)

  const emailValidation = useMemo(() => validateEmail(email), [email])
  const passwordValidation = useMemo(() => validatePassword(password), [password])
  const confirmPasswordValidation = useMemo(
    () => validatePasswordConfirmation(password, confirmPassword),
    [password, confirmPassword],
  )

  const handleSignUp = async () => {
    setShowEmailValidation(true)
    setShowPasswordValidation(true)

    const validationErrors: string[] = []
    if (!firstName.trim()) validationErrors.push("First name is required")
    if (!lastName.trim()) validationErrors.push("Last name is required")
    if (!emailValidation.isValid) validationErrors.push(...emailValidation.errors)
    if (!passwordValidation.isValid) validationErrors.push(...passwordValidation.errors)
    if (!confirmPasswordValidation.isValid)
      validationErrors.push(confirmPasswordValidation.error || "Password confirmation error")

    if (validationErrors.length > 0) {
      Alert.alert("Validation Error", validationErrors.join("\n"))
      return
    }

    setIsLoading(true)
    authStore.setLoading(true)
    authStore.clearError()

    try {
      // Use the new AuthService
      const result = await AuthService.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        userType,
      })

      if (result.success) {
        // Registration successful, email verification sent
        Alert.alert(
          "Account Created!",
          "Please check your email to verify your account. You'll need to verify before you can sign in.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("VerifyEmail" as never),
            },
          ],
        )
      } else {
        // Handle specific error cases
        let errorMessage = result.error || "Registration failed"

        // Check for specific error types
        if (errorMessage.includes("already")) {
          errorMessage = "An account with this email already exists. Please sign in instead."
        } else if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
          errorMessage = "Too many registration attempts. Please try again later."
        }

        Alert.alert("Sign Up Failed", errorMessage)
        authStore.setError(errorMessage)
      }
    } catch (error: any) {
      console.error("Sign up error:", error)

      const errorMessage = error.message || "Registration failed. Please try again."
      Alert.alert("Sign Up Failed", errorMessage)
      authStore.setError(errorMessage)
    } finally {
      setIsLoading(false)
      authStore.setLoading(false)
    }
  }

  const handleSignIn = () => {
    navigation.navigate("SignIn" as never)
  }

  const handleFacebookSignup = () => {
    Alert.alert("Facebook Signup", "Facebook signup not implemented yet")
  }

  const handleGoogleSignup = () => {
    Alert.alert("Google Signup", "Google signup not implemented yet")
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
          onPress={() => {
            setCurrentTab("login")
            handleSignIn()
          }}
        >
          <Text text="Login" style={[$tabText, currentTab === "login" && $activeTabText]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[$tab, currentTab === "register" && $activeTab]}
          onPress={() => setCurrentTab("register")}
        >
          <Text text="Register" style={[$tabText, currentTab === "register" && $activeTabText]} />
        </TouchableOpacity>
      </View>

      <Text preset="heading" text="Join Stitch & Wear" style={$title} />
      <Text text="Experience the finest Nigerian craftsmanship" style={$subtitle} />

      {authStore.error && (
        <View style={$errorContainer}>
          <Text text={authStore.error} style={$errorText} />
        </View>
      )}

      <TextField
        value={firstName}
        onChangeText={setFirstName}
        label="First Name *"
        placeholder="Enter your first name"
        autoCapitalize="words"
        style={$textField}
        status={isLoading ? "disabled" : undefined}
      />

      <TextField
        value={lastName}
        onChangeText={setLastName}
        label="Last Name *"
        placeholder="Enter your last name"
        autoCapitalize="words"
        style={$textField}
        status={isLoading ? "disabled" : undefined}
      />

      <TextField
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          if (text.length > 0) setShowEmailValidation(true)
        }}
        label="Email *"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        status={
          isLoading
            ? "disabled"
            : showEmailValidation && !emailValidation.isValid
              ? "error"
              : undefined
        }
        helper={
          showEmailValidation && !emailValidation.isValid
            ? emailValidation.errors.join(", ")
            : showEmailValidation && emailValidation.suggestions.length > 0
              ? emailValidation.suggestions[0]
              : undefined
        }
        style={$textField}
      />

      {showEmailValidation && emailValidation.warnings.length > 0 && (
        <View style={$validationWarning}>
          {emailValidation.warnings.map((warning, index) => (
            <Text key={index} text={`⚠️ ${warning}`} style={$warningText} />
          ))}
        </View>
      )}

      <TextField
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          if (text.length > 0) setShowPasswordValidation(true)
        }}
        label="Password *"
        placeholder="Enter a strong password"
        secureTextEntry
        status={
          isLoading
            ? "disabled"
            : showPasswordValidation && !passwordValidation.isValid
              ? "error"
              : undefined
        }
        style={$textField}
      />

      {showPasswordValidation && (
        <PasswordStrengthIndicator
          password={password}
          showCriteria={true}
          showFeedback={false}
          compact={false}
          style={$passwordStrength}
        />
      )}

      <TextField
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        label="Confirm Password *"
        placeholder="Confirm your password"
        secureTextEntry
        status={
          isLoading
            ? "disabled"
            : confirmPassword.length > 0 && !confirmPasswordValidation.isValid
              ? "error"
              : undefined
        }
        helper={
          confirmPassword.length > 0 && !confirmPasswordValidation.isValid
            ? confirmPasswordValidation.error
            : confirmPassword.length > 0 && confirmPasswordValidation.isValid
              ? "✓ Passwords match"
              : undefined
        }
        style={$textField}
      />

      <View style={$userTypeContainer}>
        <Text text="I am a:" style={$userTypeLabel} />
        <View style={$userTypeButtons}>
          <Button
            text="Client"
            preset={userType === "client" ? "default" : "reversed"}
            onPress={() => setUserType("client")}
            style={$userTypeButton}
            disabled={isLoading}
          />
          <Button
            text="Tailor"
            preset={userType === "tailor" ? "default" : "reversed"}
            onPress={() => setUserType("tailor")}
            style={$userTypeButton}
            disabled={isLoading}
          />
        </View>
      </View>

      <Button
        text={isLoading ? "Creating Account..." : "Create Account"}
        onPress={handleSignUp}
        disabled={isLoading || authStore.isLoading}
        style={$signUpButton}
      />

      <View style={$orContainer}>
        <View style={$orLine} />
        <Text text="OR" style={$orText} />
        <View style={$orLine} />
      </View>

      <Button
        text="Sign up with Facebook"
        onPress={handleFacebookSignup}
        style={$socialButton}
        textStyle={$socialButtonText}
        disabled={isLoading}
        LeftAccessory={() => <Icon icon="facebook" size={20} style={$socialIcon} />}
      />

      <Button
        text="Sign up with Google"
        onPress={handleGoogleSignup}
        style={$socialButton}
        textStyle={$socialButtonText}
        disabled={isLoading}
        LeftAccessory={() => <Icon icon="google" size={20} style={$socialIcon} />}
      />

      <Button
        text="Already have an account? Sign In"
        preset="reversed"
        onPress={handleSignIn}
        style={$signInButton}
        disabled={isLoading}
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

const $textField: ViewStyle = {
  marginBottom: spacing.lg,
}

const $userTypeContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $userTypeLabel: TextStyle = {
  marginBottom: spacing.sm,
  fontWeight: "600",
  fontSize: 16,
  color: "#333333",
}

const $userTypeButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $userTypeButton: ViewStyle = {
  flex: 1,
}

const $signUpButton: ViewStyle = {
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
  fontSize: 12,
  color: "#666666",
  fontWeight: "300",
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

const $signInButton: ViewStyle = {
  marginTop: spacing.sm,
}

const $validationWarning: ViewStyle = {
  marginBottom: spacing.md,
  paddingHorizontal: spacing.sm,
}

const $warningText: TextStyle = {
  fontSize: 13,
  color: "#f59e0b",
  marginBottom: spacing.xs,
}

const $passwordStrength: ViewStyle = {
  marginBottom: spacing.md,
}
