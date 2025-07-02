import { FC, useState, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, ScrollView } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, TextField, Button, PasswordStrengthIndicator } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
import { validateEmail } from "@/utils/emailValidation"
import { validatePassword, validatePasswordConfirmation } from "@/utils/passwordValidation"
import { spacing } from "@/theme"

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
  
  // Validation states
  const [showEmailValidation, setShowEmailValidation] = useState(false)
  const [showPasswordValidation, setShowPasswordValidation] = useState(false)

  // Real-time validation
  const emailValidation = useMemo(() => validateEmail(email), [email])
  const passwordValidation = useMemo(() => validatePassword(password), [password])
  const confirmPasswordValidation = useMemo(() => 
    validatePasswordConfirmation(password, confirmPassword), [password, confirmPassword]
  )

  const handleSignUp = async () => {
    // Show validation feedback
    setShowEmailValidation(true)
    setShowPasswordValidation(true)

    // Comprehensive validation
    const validationErrors: string[] = []

    if (!firstName.trim()) validationErrors.push("First name is required")
    if (!lastName.trim()) validationErrors.push("Last name is required")
    
    if (!emailValidation.isValid) {
      validationErrors.push(...emailValidation.errors)
    }

    if (!passwordValidation.isValid) {
      validationErrors.push(...passwordValidation.errors)
    }

    if (!confirmPasswordValidation.isValid) {
      validationErrors.push(confirmPasswordValidation.error || "Password confirmation error")
    }

    if (validationErrors.length > 0) {
      Alert.alert("Validation Error", validationErrors.join("\n"))
      return
    }

    setIsLoading(true)
    authStore.setLoading(true)
    authStore.clearError()

    try {
      const authAdapter = getAppwriteAuthAdapter()
      const fullName = `${firstName.trim()} ${lastName.trim()}`

      // Register user with Appwrite
      const result = await authAdapter.register(email.trim(), password, fullName)

      if (result.success && result.data) {
        // Auto-login after successful registration to get user session
        const loginResult = await authAdapter.login(email.trim(), password)

        if (loginResult.success && loginResult.data) {
          // Transform Appwrite user data to our User type
          const userData = {
            id: loginResult.data.user.$id,
            email: loginResult.data.user.email,
            role: userType,
            status: "active" as const,
            profile: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: null,
              avatar: null,
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
            emailVerified: loginResult.data.user.emailVerification,
            lastLoginAt: new Date().toISOString(),
            createdAt: loginResult.data.user.registration,
            updatedAt: loginResult.data.user.accessedAt,
          }

          // Set user and session in auth store
          authStore.setUser(userData)
          authStore.setSession({
            accessToken: loginResult.data.session.$id,
            refreshToken: loginResult.data.session.$id,
            expiresAt: loginResult.data.session.expire,
          })

          // Send verification email
          const verificationResult = await authAdapter.sendEmailVerification()
          
          if (verificationResult.success) {
            Alert.alert(
              "Account Created!",
              "Please check your email to verify your account before you can access the app.",
              [
                {
                  text: "OK",
                  onPress: () => navigation.navigate("VerifyEmail" as any),
                },
              ]
            )
          } else {
            Alert.alert(
              "Account Created",
              "Your account was created but we couldn't send the verification email. Please try signing in.",
              [
                { text: "OK", onPress: () => navigation.navigate("SignIn" as any) },
              ]
            )
          }
        } else {
          Alert.alert("Success", "Account created! Please sign in to verify your email.", [
            { text: "OK", onPress: () => navigation.navigate("SignIn" as any) },
          ])
        }
      } else {
        Alert.alert("Sign Up Failed", result.message || "Registration failed")
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      Alert.alert("Error", error.message || "Registration failed")
      authStore.setError(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
      authStore.setLoading(false)
    }
  }

  const handleSignIn = () => {
    navigation.navigate("SignIn" as any)
  }

  return (
    <Screen style={$root} preset="scroll">
      <ScrollView style={$scrollView} contentContainerStyle={$container}>
        <Text preset="heading" text="Create Account" style={$title} />
        <Text text="Join Stitch & Wear Tailors" style={$subtitle} />

        {authStore.error && <Text text={authStore.error} style={$errorText} />}

        <TextField
          value={firstName}
          onChangeText={setFirstName}
          label="First Name *"
          placeholder="Enter your first name"
          autoCapitalize="words"
          style={$textField}
        />

        <TextField
          value={lastName}
          onChangeText={setLastName}
          label="Last Name *"
          placeholder="Enter your last name"
          autoCapitalize="words"
          style={$textField}
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
          status={showEmailValidation && !emailValidation.isValid ? "error" : undefined}
          helper={
            showEmailValidation && !emailValidation.isValid 
              ? emailValidation.errors.join(", ")
              : showEmailValidation && emailValidation.suggestions.length > 0
              ? emailValidation.suggestions[0]
              : undefined
          }
          style={$textField}
        />
        
        {/* Email validation feedback */}
        {showEmailValidation && emailValidation.warnings.length > 0 && (
          <View style={$validationWarning}>
            {emailValidation.warnings.map((warning, index) => (
              <Text
                key={index}
                text={`⚠️ ${warning}`}
                style={$warningText}
              />
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
          status={showPasswordValidation && !passwordValidation.isValid ? "error" : undefined}
          style={$textField}
        />
        
        {/* Password strength indicator */}
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
          status={confirmPassword.length > 0 && !confirmPasswordValidation.isValid ? "error" : undefined}
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
            />
            <Button
              text="Tailor"
              preset={userType === "tailor" ? "default" : "reversed"}
              onPress={() => setUserType("tailor")}
              style={$userTypeButton}
            />
          </View>
        </View>

        <Button
          text={isLoading ? "Creating Account..." : "Create Account"}
          onPress={handleSignUp}
          disabled={isLoading || authStore.isLoading}
          style={$signUpButton}
        />

        <Button
          text="Already have an account? Sign In"
          preset="reversed"
          onPress={handleSignIn}
          style={$signInButton}
        />
      </ScrollView>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $scrollView: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xl,
}

const $title: ViewStyle = {
  marginBottom: spacing.sm,
  textAlign: "center",
}

const $subtitle: ViewStyle = {
  marginBottom: spacing.xl,
  textAlign: "center",
}

const $errorText: ViewStyle = {
  color: "red",
  marginBottom: spacing.md,
  textAlign: "center",
}

const $textField: ViewStyle = {
  marginBottom: spacing.lg,
}

const $userTypeContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $userTypeLabel: ViewStyle = {
  marginBottom: spacing.sm,
  fontWeight: "bold",
}

const $userTypeButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $userTypeButton: ViewStyle = {
  flex: 1,
}

const $signUpButton: ViewStyle = {
  marginBottom: spacing.md,
}

const $signInButton: ViewStyle = {
  marginTop: spacing.sm,
}

const $validationWarning: ViewStyle = {
  marginBottom: spacing.md,
  paddingHorizontal: spacing.sm,
}

const $warningText: ViewStyle = {
  fontSize: 13,
  color: "#f59e0b", // amber-500
  marginBottom: spacing.xs,
}

const $passwordStrength: ViewStyle = {
  marginBottom: spacing.md,
}
