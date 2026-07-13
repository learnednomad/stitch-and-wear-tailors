/**
 * VerifyOtpScreen
 *
 * "Enter verification code" — v1 accepts the emailed verification token
 * (pasted or typed) and confirms it through AuthService.verifyEmail.
 * PocketBase OTP auth is not configured server-side yet.
 */
import { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { Alert, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Screen, Text, TextField } from "@/components"
import AuthService from "@/services/auth/AuthService"
import { spacing } from "@/theme"

interface VerifyOtpScreenProps extends AppStackScreenProps<"VerifyOtp"> {}

export const VerifyOtpScreen: FC<VerifyOtpScreenProps> = observer(function VerifyOtpScreen() {
  const navigation = useNavigation<any>()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    const token = code.trim()
    if (!token) {
      Alert.alert("Missing code", "Paste the verification code from your email.")
      return
    }

    setIsLoading(true)
    const result = await AuthService.verifyEmail(token)
    setIsLoading(false)

    if (result.success) {
      Alert.alert("Verified!", "Your email has been verified.", [
        { text: "Continue", onPress: () => navigation.navigate("SignIn") },
      ])
    } else {
      Alert.alert("Verification failed", result.error ?? "The code is invalid or has expired.")
    }
  }

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <View className="p-lg">
        <Text preset="heading" text="Enter verification code" className="mb-xs" />
        <Text
          className="mb-lg leading-5 text-textDim dark:text-textDim-dark"
          text="Paste the verification code from the email we sent you."
        />
        <TextField
          label="Verification code"
          placeholder="Paste your code here"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          containerStyle={$field}
        />
        <Button
          text={isLoading ? "Verifying..." : "Verify"}
          onPress={handleVerify}
          disabled={isLoading}
          style={$button}
        />
        <Button text="Back" preset="default" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $field: ViewStyle = {
  marginBottom: spacing.md,
}

const $button: ViewStyle = {
  marginBottom: spacing.sm,
}
