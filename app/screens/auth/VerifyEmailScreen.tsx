import { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, TouchableOpacity } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Button } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter"
import { useAppTheme } from "@/utils/useAppTheme"
import { spacing } from "@/theme"

interface VerifyEmailScreenProps extends AppStackScreenProps<"VerifyEmail"> {}

export const VerifyEmailScreen: FC<VerifyEmailScreenProps> = observer(function VerifyEmailScreen() {
  const { authStore } = useStores()
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
  }, [countdown])

  const handleResendVerification = async () => {
    if (!canResend || isLoading) return

    setIsLoading(true)
    try {
      const authAdapter = getAppwriteAuthAdapter()
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
      const authAdapter = getAppwriteAuthAdapter()
      const result = await authAdapter.getCurrentUser()

      if (result.success && result.data?.emailVerification) {
        Alert.alert(
          "Email Verified!",
          "Your email has been successfully verified. Please sign in to continue.",
          [
            {
              text: "Sign In",
              onPress: () => {
                // Clear any existing auth state and navigate to sign in
                authStore.clearAuth()
                navigation.navigate("SignIn" as any)
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
          onPress: () => navigation.navigate("SignIn" as any),
        },
      ],
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      <View style={$container}>
        {/* Header */}
        <View style={$header}>
          <Text preset="heading" text="Verify Your Email" style={$title} />
          <Text text={`We've sent a verification link to ${userEmail}`} style={$subtitle} />
        </View>

        {/* Email Icon */}
        <View style={$iconContainer}>
          <View style={[$emailIcon, { backgroundColor: theme.colors.palette.primary100 }]}>
            <Text text="📧" style={$emailIconText} />
          </View>
        </View>

        {/* Instructions */}
        <View style={$instructionsContainer}>
          <Text preset="subheading" text="What to do next:" style={$instructionsTitle} />
          <Text text="1. Check your email inbox" style={$instructionItem} />
          <Text text="2. Click the verification link" style={$instructionItem} />
          <Text text="3. Return here and click 'I've Verified'" style={$instructionItem} />
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
          style={$resendButton}
        >
          <Text
            text={canResend ? "Resend verification email" : `Resend in ${countdown} seconds`}
            style={[
              $resendText,
              {
                color:
                  canResend && !isLoading ? theme.colors.palette.primary600 : theme.colors.textDim,
              },
            ]}
          />
        </TouchableOpacity>

        {/* Help Section */}
        <View style={$helpContainer}>
          <Text preset="formLabel" text="Need help?" style={$helpTitle} />
          <Text text="• Check your spam/junk folder" style={$helpItem} />
          <Text text="• Make sure you entered the correct email" style={$helpItem} />
          <Text text="• The verification link expires in 24 hours" style={$helpItem} />
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

// Styles
const $root: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xl,
  justifyContent: "center",
}

const $header: ViewStyle = {
  alignItems: "center",
  marginBottom: spacing.xl,
}

const $title: ViewStyle = {
  marginBottom: spacing.sm,
  textAlign: "center",
}

const $subtitle: ViewStyle = {
  textAlign: "center",
  lineHeight: 24,
}

const $iconContainer: ViewStyle = {
  alignItems: "center",
  marginBottom: spacing.xl,
}

const $emailIcon: ViewStyle = {
  width: 80,
  height: 80,
  borderRadius: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $emailIconText: ViewStyle = {
  fontSize: 40,
}

const $instructionsContainer: ViewStyle = {
  marginBottom: spacing.xl,
}

const $instructionsTitle: ViewStyle = {
  marginBottom: spacing.md,
}

const $instructionItem: ViewStyle = {
  marginBottom: spacing.sm,
  paddingLeft: spacing.md,
  lineHeight: 20,
}

const $primaryButton: ViewStyle = {
  marginBottom: spacing.lg,
}

const $resendButton: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.sm,
  marginBottom: spacing.xl,
}

const $resendText: ViewStyle = {
  fontSize: 16,
  fontWeight: "500",
  textDecorationLine: "underline",
}

const $helpContainer: ViewStyle = {
  marginBottom: spacing.xl,
  paddingHorizontal: spacing.sm,
}

const $helpTitle: ViewStyle = {
  marginBottom: spacing.sm,
}

const $helpItem: ViewStyle = {
  marginBottom: spacing.xs,
  paddingLeft: spacing.md,
  fontSize: 14,
  lineHeight: 18,
}

const $backButton: ViewStyle = {
  marginTop: spacing.sm,
}
