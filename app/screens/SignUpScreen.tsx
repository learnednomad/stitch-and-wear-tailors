import { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, ScrollView } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, TextField, Button } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
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

  const handleSignUp = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long")
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
        // Auto-login after successful registration
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

          Alert.alert(
            "Success", 
            "Account created successfully!", 
            [{
              text: "OK",
              onPress: () => {
                // Navigate based on user type
                if (userType === "tailor") {
                  navigation.navigate("TailorTab" as any)
                } else {
                  navigation.navigate("ClientTab" as any)
                }
              }
            }]
          )
        } else {
          Alert.alert("Success", "Account created! Please sign in.", [
            { text: "OK", onPress: () => navigation.navigate("SignIn" as any) }
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
        
        {authStore.error && (
          <Text text={authStore.error} style={$errorText} />
        )}
        
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
          onChangeText={setEmail}
          label="Email *"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={$textField}
        />
        
        <TextField
          value={password}
          onChangeText={setPassword}
          label="Password *"
          placeholder="Enter your password (min 8 characters)"
          secureTextEntry
          style={$textField}
        />
        
        <TextField
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          label="Confirm Password *"
          placeholder="Confirm your password"
          secureTextEntry
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
