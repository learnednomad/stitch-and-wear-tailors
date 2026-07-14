/**
 * Reset Password Screen
 * Allows users to set a new password after clicking the reset link
 */

import React, { useState, useEffect } from "react"
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
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator"
import { colors as themeColors } from "@/theme"
import { validatePassword } from "@/utils/passwordValidation"
import AuthService from "@/services/auth/AuthService"
import { useRouter, useLocalSearchParams } from "expo-router"

// Local aliases mapping this screen's legacy color names onto the app theme
// (the theme has no primary/card/success entries). Consumed only by the Icon /
// ActivityIndicator `color` props; every style is now a NativeWind className.
// This screen is light-only, so color utilities carry no `dark:` twin.
const colors = {
  ...themeColors,
  primary: themeColors.tint,
  card: themeColors.palette.neutral100,
  success: themeColors.palette.success500,
}

export function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ userId?: string; secret?: string; token?: string }>()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")

  // Extract userId and secret from route params or deep link
  const userId = params.userId || ""
  // deep links may deliver the token under either name
  const secret = params.secret || params.token || ""

  const authService = AuthService

  useEffect(() => {
    if (!userId || !secret) {
      Alert.alert("Invalid Link", "The reset link is invalid or expired.", [
        {
          text: "OK",
          onPress: () => router.push("/sign-in"),
        },
      ])
    }
  }, [userId, secret])

  const validateForm = () => {
    let isValid = true

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.errors[0])
      isValid = false
    } else {
      setPasswordError("")
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match")
      isValid = false
    } else if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password")
      isValid = false
    } else {
      setConfirmPasswordError("")
    }

    return isValid
  }

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const result = await authService.updatePassword(userId, secret, password)

      if (result.success) {
        Alert.alert("Password Reset!", "Your password has been successfully reset.", [
          {
            text: "Sign In",
            onPress: () => router.push("/sign-in"),
          },
        ])
      } else {
        Alert.alert("Error", result.error || "Failed to reset password")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={$scrollContent}>
        <View className="flex-row items-center border-b border-b-border p-lg">
          <TouchableOpacity onPress={() => router.push("/sign-in")}>
            <Icon icon="back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="ml-md flex-1 text-[22px] font-spaceBold">Create New Password</Text>
        </View>

        <View className="p-lg">
          <View className="my-xl items-center">
            <Icon icon="lock" size={48} color={colors.primary} />
          </View>

          <Text className="mb-xl text-center text-[16px] font-spaceRegular text-textDim">
            Create a strong password for your account. Make sure it's unique and secure.
          </Text>

          <View className="mb-md">
            <Text className="mb-sm text-[13px] font-spaceRegular text-text">New Password</Text>
            <View className="relative">
              <TextInput
                className={`rounded-lg border bg-neutral100 p-md pr-[56px] text-[16px] font-spaceRegular ${
                  passwordError ? "border-error" : "border-border"
                }`}
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  setPasswordError("")
                }}
                placeholder="Enter new password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                className="absolute right-md top-md p-xs"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon icon={showPassword ? "hidden" : "view"} size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text className="mt-xs text-[13px] font-spaceRegular text-error">{passwordError}</Text>
            ) : null}
          </View>

          <PasswordStrengthIndicator password={password} showCriteria={true} />

          <View className="mb-md">
            <Text className="mb-sm text-[13px] font-spaceRegular text-text">Confirm Password</Text>
            <View className="relative">
              <TextInput
                className={`rounded-lg border bg-neutral100 p-md pr-[56px] text-[16px] font-spaceRegular ${
                  confirmPasswordError ? "border-error" : "border-border"
                }`}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text)
                  setConfirmPasswordError("")
                }}
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                className="absolute right-md top-md p-xs"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  icon={showConfirmPassword ? "hidden" : "view"}
                  size={20}
                  color={colors.textDim}
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text className="mt-xs text-[13px] font-spaceRegular text-error">
                {confirmPasswordError}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            className={`mb-md mt-lg items-center rounded-lg bg-tint p-md ${
              isLoading ? "opacity-60" : ""
            }`}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
                Reset Password
              </Text>
            )}
          </TouchableOpacity>

          <View className="mt-xl rounded-lg bg-neutral100 p-md">
            <Text className="mb-md text-[16px] font-spaceMedium">Password Tips</Text>
            <View className="mb-sm flex-row items-center">
              <Icon icon="check" size={16} color={colors.success} />
              <Text className="ml-sm flex-1 text-[13px] font-spaceRegular text-textDim">
                Use a unique password for this account
              </Text>
            </View>
            <View className="mb-sm flex-row items-center">
              <Icon icon="check" size={16} color={colors.success} />
              <Text className="ml-sm flex-1 text-[13px] font-spaceRegular text-textDim">
                Consider using a password manager
              </Text>
            </View>
            <View className="mb-sm flex-row items-center">
              <Icon icon="check" size={16} color={colors.success} />
              <Text className="ml-sm flex-1 text-[13px] font-spaceRegular text-textDim">
                Enable two-factor authentication after reset
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ScrollView contentContainerStyle stays inline (style prop, not className).
const $scrollContent: ViewStyle = {
  flexGrow: 1,
}
