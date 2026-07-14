/**
 * Two-Factor Authentication Setup Screen
 *
 * v1: authenticator-app TOTP was retired with the move to PocketBase.
 * Email one-time codes can be enabled server-side per collection; this
 * screen explains the current state and will grow the toggle when
 * per-user MFA ships.
 */
import { useRouter } from "expo-router"
import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { Screen, Text, Button } from "@/components"
import { spacing, colors } from "@/theme"

export const TwoFactorSetupScreen: FC = () => {
  const router = useRouter()

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <View className="p-lg">
        <Text preset="heading" text="Two-Factor Authentication" className="mb-md" />
        <Text
          text="Your account is protected with secure email verification. When we detect a sign-in from a new device, we may send a one-time code to your email address."
          className="mb-md"
          style={{ color: colors.textDim }}
        />
        <Text
          text="Authenticator-app support is coming in a future update."
          className="mb-md"
          style={{ color: colors.textDim }}
        />
        <Button text="Go Back" style={$button} onPress={() =>router.back()} />
      </View>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

const $button: ViewStyle = {
  marginTop: spacing.lg,
}
