/**
 * Reset Password Screen
 * Allows users to set a new password after clicking the reset link
 */

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native"
import { Icon } from "@/components"
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator"
import { colors, spacing, typography } from "@/theme"
import { appwriteAccount } from "@/services/appwrite/appwrite-client"
import { validatePassword } from "@/utils/passwordValidation"
import AuthService from "@/services/auth/AuthService"
import { AuthNavigatorParamList } from "@/navigators"

type ResetPasswordScreenRouteProp = RouteProp<AuthNavigatorParamList, "ResetPassword">

export function ResetPasswordScreen() {
  const navigation = useNavigation()
  const route = useRoute<ResetPasswordScreenRouteProp>()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")

  // Extract userId and secret from route params or deep link
  const userId = route.params?.userId || ""
  const secret = route.params?.secret || ""

  const authService = new AuthService()

  useEffect(() => {
    if (!userId || !secret) {
      Alert.alert("Invalid Link", "The reset link is invalid or expired.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("SignIn" as any),
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
            onPress: () => navigation.navigate("SignIn" as any),
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate("SignIn" as any)}>
            <Icon icon="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Password</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon icon="shield" size={48} color={colors.primary} />
          </View>

          <Text style={styles.description}>
            Create a strong password for your account. Make sure it's unique and secure.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null]}
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
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon icon={showPassword ? "eye-off" : "eye"} size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <PasswordStrengthIndicator password={password} showCriteria={true} />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, confirmPasswordError ? styles.inputError : null]}
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
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textDim}
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Password Tips</Text>
            <View style={styles.tip}>
              <Icon icon="check" size={16} color={colors.success} />
              <Text style={styles.tipText}>Use a unique password for this account</Text>
            </View>
            <View style={styles.tip}>
              <Icon icon="check" size={16} color={colors.success} />
              <Text style={styles.tipText}>Consider using a password manager</Text>
            </View>
            <View style={styles.tip}>
              <Icon icon="check" size={16} color={colors.success} />
              <Text style={styles.tipText}>Enable two-factor authentication after reset</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.body,
    color: colors.card,
    fontWeight: "600",
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  eyeIcon: {
    padding: spacing.xs,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    paddingRight: spacing.xl + 24,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputWrapper: {
    position: "relative",
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tip: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.caption,
    color: colors.textDim,
    flex: 1,
    marginLeft: spacing.sm,
  },
  tipsSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  tipsTitle: {
    ...typography.subheading,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    flex: 1,
    marginLeft: spacing.md,
  },
})
