import { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, TextField, Button } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
import { spacing } from "@/theme"

interface SignInScreenProps extends AppStackScreenProps<"SignIn"> {}

export const SignInScreen: FC<SignInScreenProps> = observer(function SignInScreen() {
  const { authStore } = useStores()
  const navigation = useNavigation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)
    authStore.setLoading(true)
    authStore.clearError()

    try {
      const authAdapter = getAppwriteAuthAdapter()
      const result = await authAdapter.login(email.trim(), password)
      
      if (result.success && result.data) {
        // Transform Appwrite user data to our User type
        const userData = {
          id: result.data.user.$id,
          email: result.data.user.email,
          role: "client" as const, // Default role, will be updated from user profile
          status: "active" as const,
          profile: {
            firstName: result.data.user.name.split(" ")[0] || "",
            lastName: result.data.user.name.split(" ").slice(1).join(" ") || "",
            phone: result.data.user.phone || "", // Convert null to empty string
            avatar: "", // Convert null to empty string
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
          createdAt: new Date(result.data.user.registration).toISOString(), // Ensure proper date format
          updatedAt: new Date(result.data.user.accessedAt).toISOString(), // Ensure proper date format
        }

        // Set user and session in auth store
        authStore.setUser(userData)
        authStore.setSession({
          accessToken: result.data.session.$id,
          refreshToken: result.data.session.$id,
          expiresAt: result.data.session.expire,
        })

        // Navigate based on user role
        const userRole = userData.role
        if (userRole === "tailor") {
          navigation.navigate("TailorTab" as any)
        } else {
          navigation.navigate("ClientTab" as any)
        }
      } else {
        Alert.alert("Sign In Failed", result.message || "Invalid credentials")
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      Alert.alert("Error", error.message || "Sign in failed")
      authStore.setError(error.message || "Sign in failed")
    } finally {
      setIsLoading(false)
      authStore.setLoading(false)
    }
  }

  const handleSignUp = () => {
    navigation.navigate("SignUp" as any)
  }

  return (
    <Screen style={$root} preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Welcome Back" style={$title} />
        <Text text="Sign in to your account" style={$subtitle} />
        
        {authStore.error && (
          <Text text={authStore.error} style={$errorText} />
        )}
        
        <TextField
          value={email}
          onChangeText={setEmail}
          label="Email"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={$textField}
        />
        
        <TextField
          value={password}
          onChangeText={setPassword}
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          style={$textField}
        />
        
        <Button
          text={isLoading ? "Signing In..." : "Sign In"}
          onPress={handleSignIn}
          disabled={isLoading || authStore.isLoading}
          style={$signInButton}
        />
        
        <Button
          text="Don't have an account? Sign Up"
          preset="reversed"
          onPress={handleSignUp}
          style={$signUpButton}
        />
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  flex: 1,
  justifyContent: "center",
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

const $signInButton: ViewStyle = {
  marginBottom: spacing.md,
}

const $signUpButton: ViewStyle = {
  marginTop: spacing.sm,
}
