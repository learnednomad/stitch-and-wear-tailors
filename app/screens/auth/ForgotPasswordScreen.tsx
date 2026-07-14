/**
 * Forgot Password Screen
 * Allows users to request password reset via email
 */

import { useRouter } from "expo-router"
import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from "react-native"
import { Icon } from "@/components"
import { colors as themeColors } from "@/theme"
import { validateEmail } from "@/utils/emailValidation"
import AuthService from "@/services/auth/AuthService"

// Local aliases mapping this screen's legacy color names onto the app theme
// (the theme has no primary/card/success entries). Consumed only by the Icon /
// ActivityIndicator `color` props; every style is now a NativeWind className.
// This screen is light-only, so color utilities carry no `dark:` twin.
const colors = {
  ...themeColors,
  primary: themeColors.tint,
  primaryLight: themeColors.palette.primary100,
  card: themeColors.palette.neutral100,
  success: themeColors.palette.success500,
}

export function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  // For React Native, we need to use a web URL that will handle the deep link
  // This URL should be configured in your Appwrite console
  const RECOVERY_URL = "https://stitchandwear.com/reset-password"

  const authService = AuthService

  const validateForm = () => {
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.errors[0])
      return false
    }
    setEmailError("")
    return true
  }

  const handlePasswordReset = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const result = await authService.createPasswordRecovery(email)

      if (result.success) {
        setEmailSent(true)
        Alert.alert("Email Sent!", "Check your email for password reset instructions.", [
          {
            text: "OK",
            onPress: () =>router.back(),
          },
        ])
      } else {
        Alert.alert("Error", result.error || "Failed to send recovery email")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send recovery email")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center border-b border-b-border p-lg">
          <TouchableOpacity onPress={() =>router.back()}>
            <Icon icon="back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="ml-md flex-1 text-[22px] font-spaceBold">Password Reset</Text>
        </View>

        <View className="items-center p-lg">
          <View className="my-xl">
            <Icon icon="check" size={64} color={colors.success} />
          </View>

          <Text className="mb-sm text-[22px] font-spaceBold">Email Sent!</Text>
          <Text className="mb-xl text-center text-[16px] font-spaceRegular text-textDim">
            We've sent password reset instructions to {email}
          </Text>

          <View className="mb-xl flex-row items-start rounded-lg bg-primary100 p-md">
            <Icon icon="feedback" size={20} color={colors.primary} />
            <Text className="ml-sm flex-1 text-[13px] font-spaceRegular leading-5 text-tint">
              Please check your email and follow the instructions to reset your password. The link
              will expire in 1 hour.
            </Text>
          </View>

          <TouchableOpacity
            className="mb-md items-center rounded-lg bg-tint p-md"
            onPress={() =>router.back()}
          >
            <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={$scrollContent}>
        <View className="flex-row items-center border-b border-b-border p-lg">
          <TouchableOpacity onPress={() =>router.back()}>
            <Icon icon="back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="ml-md flex-1 text-[22px] font-spaceBold">Reset Password</Text>
        </View>

        <View className="p-lg">
          <View className="my-xl items-center">
            <Icon icon="lock" size={48} color={colors.primary} />
          </View>

          <Text className="mb-xl text-center text-[16px] font-spaceRegular text-textDim">
            Enter your email address and we'll send you instructions to reset your password.
          </Text>

          <View className="mb-lg">
            <Text className="mb-sm text-[13px] font-spaceRegular text-text">Email Address</Text>
            <TextInput
              className={`rounded-lg border bg-neutral100 p-md text-[16px] font-spaceRegular ${
                emailError ? "border-error" : "border-border"
              }`}
              value={email}
              onChangeText={(text) => {
                setEmail(text)
                setEmailError("")
              }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {emailError ? (
              <Text className="mt-xs text-[13px] font-spaceRegular text-error">{emailError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            className={`mb-md items-center rounded-lg bg-tint p-md ${isLoading ? "opacity-60" : ""}`}
            onPress={handlePasswordReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
                Send Reset Email
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="items-center p-sm" onPress={() =>router.back()}>
            <Text className="text-[16px] font-spaceRegular text-tint underline">Back to Sign In</Text>
          </TouchableOpacity>

          <View className="mt-xl rounded-lg bg-neutral100 p-md">
            <Text className="mb-sm text-[16px] font-spaceMedium">Need Help?</Text>
            <Text className="text-[13px] font-spaceRegular leading-5 text-textDim">
              If you don't receive an email within a few minutes, check your spam folder or contact
              support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ScrollView contentContainerStyle stays inline (it is a style prop, not
// className): flexGrow keeps the short form vertically centered on tall screens.
const $scrollContent: ViewStyle = {
  flexGrow: 1,
}
