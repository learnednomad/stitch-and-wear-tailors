import { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, TouchableOpacity } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Button } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useAuthStore } from "@/state/authStore"
import { getPocketBaseAuthAdapter } from "@/services/pocketbase/pocketbase-auth-adapter"
import { useAppTheme } from "@/utils/useAppTheme"
import { spacing } from "@/theme"

interface VerifyEmailScreenProps extends AppStackScreenProps<"VerifyEmail"> {}

export const VerifyEmailScreen: FC<VerifyEmailScreenProps> = observer(function VerifyEmailScreen() {
  const authStore = useAuthStore()
  const navigation = useNavigation()
  const { theme } = useAppTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(60)

  // Get user email from store or route params
  const userEmail = authStore.user?.email || "your email"

  useEffect(() => {
    // Start countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
    return undefined
  }, [countdown])

  const handleResendVerification = async () => {
    if (!canResend || isLoading) return

    setIsLoading(true)
    try {
      const authAdapter = getPocketBaseAuthAdapter()
      const result = await authAdapter.sendEmailVerification()

      if (result.success) {
        Alert.alert(
          "Verification Email Sent",
          "A new verification email has been sent to your inbox.",
        )
        setCanResend(false)
        setCountdown(60)
      } else {
        Alert.alert("Error", result.message || "Failed to send verification email")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send verification email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    setIsLoading(true)
    try {
      const authAdapter = getPocketBaseAuthAdapter()
      const result = await authAdapter.getCurrentUser()

      if (result.success && result.data?.verified) {
        Alert.alert(
          "Email Verified!",
          "Your email has been successfully verified. Please sign in to continue.",
          [
            {
              text: "Sign In",
              onPress: () => {
                // Clear any existing auth state and navigate to sign in
                authStore.clearAuth()
                navigation.navigate("SignIn" as never)
              },
            },
          ],
        )
      } else {
        Alert.alert("Not Verified Yet", "Please check your email and click the verification link.")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to check verification status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToSignIn = () => {
    Alert.alert(
      "Verification Required",
      "You need to verify your email before you can sign in. Are you sure you want to go back?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Go Back",
          style: "destructive",
          onPress: () => navigation.navigate("SignIn" as never),
        },
      ],
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      <View className="flex-1 justify-center px-lg py-xl">
        {/* Header */}
        <View className="mb-xl items-center">
          <Text preset="heading" text="Verify Your Email" className="mb-sm text-center" />
          <Text
            text={`We've sent a verification link to ${userEmail}`}
            className="text-center leading-6"
          />
        </View>

        {/* Email Icon */}
        <View className="mb-xl items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary100 dark:bg-primary100-dark">
            <Text text="📧" className="text-[40px]" />
          </View>
        </View>

        {/* Instructions */}
        <View className="mb-xl">
          <Text preset="subheading" text="What to do next:" className="mb-md" />
          <Text text="1. Check your email inbox" className="mb-sm pl-md leading-5" />
          <Text text="2. Click the verification link" className="mb-sm pl-md leading-5" />
          <Text text="3. Return here and click 'I've Verified'" className="mb-sm pl-md leading-5" />
        </View>

        {/* Action Buttons */}
        <Button
          text={isLoading ? "Checking..." : "I've Verified My Email"}
          onPress={handleCheckVerification}
          disabled={isLoading}
          style={$primaryButton}
        />

        {/* Resend Button */}
        <TouchableOpacity
          onPress={handleResendVerification}
          disabled={!canResend || isLoading}
          className="mb-xl items-center py-sm"
        >
          <Text
            text={canResend ? "Resend verification email" : `Resend in ${countdown} seconds`}
            className="text-[16px] font-medium underline"
            style={{
              color:
                canResend && !isLoading ? theme.colors.palette.primary600 : theme.colors.textDim,
            }}
          />
        </TouchableOpacity>

        {/* Help Section */}
        <View className="mb-xl px-sm">
          <Text preset="formLabel" text="Need help?" className="mb-sm" />
          <Text text="• Check your spam/junk folder" className="mb-xs pl-md text-[14px] leading-[18px]" />
          <Text
            text="• Make sure you entered the correct email"
            className="mb-xs pl-md text-[14px] leading-[18px]"
          />
          <Text
            text="• The verification link expires in 24 hours"
            className="mb-xs pl-md text-[14px] leading-[18px]"
          />
        </View>

        {/* Back Button */}
        <Button
          text="Back to Sign In"
          preset="reversed"
          onPress={handleBackToSignIn}
          style={$backButton}
        />
      </View>
    </Screen>
  )
})

// Only Button style overrides remain inline (Button owns its own className).
const $root: ViewStyle = {
  flex: 1,
}

const $primaryButton: ViewStyle = {
  marginBottom: spacing.lg,
}

const $backButton: ViewStyle = {
  marginTop: spacing.sm,
}
