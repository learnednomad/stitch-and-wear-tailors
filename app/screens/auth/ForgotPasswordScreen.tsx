/**
 * Forgot Password Screen
 * Allows users to request password reset via email
 */

import React, { useState } from "react"
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
import { useNavigation } from "@react-navigation/native"
import { Icon } from "@/components"
import { colors, spacing, typography } from "@/theme"
import { appwriteAccount } from "@/services/appwrite/appwrite-client"
import { validateEmail } from "@/utils/emailValidation"
import AuthService from "@/services/auth/AuthService"

export function ForgotPasswordScreen() {
  const navigation = useNavigation()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  // For React Native, we need to use a web URL that will handle the deep link
  // This URL should be configured in your Appwrite console
  const RECOVERY_URL = "https://stitchandwear.com/reset-password"

  const authService = new AuthService()

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
            onPress: () => navigation.goBack(),
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon icon="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Password Reset</Text>
        </View>

        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Icon icon="check-circle" size={64} color={colors.success} />
          </View>

          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successMessage}>
            We've sent password reset instructions to {email}
          </Text>

          <View style={styles.infoBox}>
            <Icon icon="info" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Please check your email and follow the instructions to reset your password. The link
              will expire in 1 hour.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon icon="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon icon="lock" size={48} color={colors.primary} />
          </View>

          <Text style={styles.description}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
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
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePasswordReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Send Reset Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              If you don't receive an email within a few minutes, check your spam folder or contact
              support.
            </Text>
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
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    padding: spacing.lg,
  },
  helpSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  helpText: {
    ...typography.caption,
    color: colors.textDim,
    lineHeight: 20,
  },
  helpTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  infoBox: {
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputError: {
    borderColor: colors.error,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  linkButton: {
    alignItems: "center",
    padding: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  scrollContent: {
    flexGrow: 1,
  },
  successContent: {
    alignItems: "center",
    padding: spacing.lg,
  },
  successIcon: {
    marginVertical: spacing.xl,
  },
  successMessage: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  successTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    flex: 1,
    marginLeft: spacing.md,
  },
})
