/**
 * Two-Factor Authentication Setup Screen
 *
 * v1: authenticator-app TOTP was retired with the move to PocketBase.
 * Email one-time codes can be enabled server-side per collection; this
 * screen explains the current state and will grow the toggle when
 * per-user MFA ships.
 */
import { FC } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Screen, Text, Button } from "@/components"
import { spacing, colors } from "@/theme"

export const TwoFactorSetupScreen: FC = () => {
  const navigation = useNavigation()

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <View style={$container}>
        <Text preset="heading" text="Two-Factor Authentication" style={$title} />
        <Text
          text="Your account is protected with secure email verification. When we detect a sign-in from a new device, we may send a one-time code to your email address."
          style={$body}
        />
        <Text text="Authenticator-app support is coming in a future update." style={$body} />
        <Button text="Go Back" style={$button} onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  padding: spacing.lg,
}

const $title: TextStyle = {
  marginBottom: spacing.md,
}

const $body: TextStyle = {
  marginBottom: spacing.md,
  color: colors.textDim,
}

const $button: ViewStyle = {
  marginTop: spacing.lg,
}
