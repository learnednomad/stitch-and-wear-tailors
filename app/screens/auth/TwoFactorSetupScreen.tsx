/**
 * Two-Factor Authentication Setup Screen
 * Allows users to enable and configure 2FA methods
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
  Image,
  Clipboard,
  Platform,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import QRCode from "react-native-qrcode-svg"
import { Icon } from "@/components"
import { colors, spacing, typography } from "@/theme"
import TwoFactorAuthService from "@/services/auth/TwoFactorAuthService"
import { useStores } from "@/models"

interface SetupMethod {
  id: "2fa_totp" | "2fa_sms"
  title: string
  description: string
  icon: string
  enabled: boolean
}

export function TwoFactorSetupScreen() {
  const navigation = useNavigation()
  const { authenticationStore } = useStores()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<"select" | "setup" | "verify" | "complete">(
    "select",
  )
  const [selectedMethod, setSelectedMethod] = useState<"2fa_totp" | "2fa_sms" | null>(null)
  const [setupData, setSetupData] = useState<any>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [methods, setMethods] = useState<SetupMethod[]>([
    {
      id: "2fa_totp",
      title: "Authenticator App",
      description: "Use an app like Google Authenticator or Authy",
      icon: "smartphone",
      enabled: false,
    },
    {
      id: "2fa_sms",
      title: "SMS Text Message",
      description: "Receive codes via text message",
      icon: "message-square",
      enabled: false,
    },
  ])

  const twoFactorService = new TwoFactorAuthService()

  useEffect(() => {
    checkExisting2FA()
  }, [])

  const checkExisting2FA = async () => {
    try {
      const userId = authenticationStore.authUserId
      if (!userId) return

      const status = await twoFactorService.has2FAEnabled(userId)

      setMethods((prev) =>
        prev.map((method) => ({
          ...method,
          enabled: status.methods.includes(method.id),
        })),
      )
    } catch (error) {
      console.error("Failed to check 2FA status:", error)
    }
  }

  const handleMethodSelect = (method: "2fa_totp" | "2fa_sms") => {
    setSelectedMethod(method)
    setCurrentStep("setup")

    if (method === "2fa_totp") {
      setupTOTP()
    }
  }

  const setupTOTP = async () => {
    try {
      setLoading(true)
      const userId = authenticationStore.authUserId
      const userEmail = authenticationStore.userEmail || ""

      if (!userId) {
        Alert.alert("Error", "User not authenticated")
        return
      }

      const setup = await twoFactorService.setupTOTP(userId, userEmail)
      setSetupData(setup)
    } catch (error) {
      Alert.alert("Setup Failed", "Failed to setup authenticator app")
      setCurrentStep("select")
    } finally {
      setLoading(false)
    }
  }

  const setupSMS = async () => {
    try {
      setLoading(true)
      const userId = authenticationStore.authUserId

      if (!userId || !phoneNumber) {
        Alert.alert("Error", "Please enter your phone number")
        return
      }

      const result = await twoFactorService.setupSMS(userId, phoneNumber)

      if (result.success) {
        Alert.alert("Code Sent", result.message)
        setCurrentStep("verify")
      } else {
        Alert.alert("Setup Failed", result.message)
      }
    } catch (error) {
      Alert.alert("Setup Failed", "Failed to setup SMS authentication")
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    try {
      setLoading(true)
      const userId = authenticationStore.authUserId

      if (!userId || !verificationCode) {
        Alert.alert("Error", "Please enter verification code")
        return
      }

      let success = false

      if (selectedMethod === "2fa_totp") {
        success = await twoFactorService.verifyAndEnableTOTP(userId, verificationCode)
      } else if (selectedMethod === "2fa_sms") {
        success = await twoFactorService.verifyAndEnableSMS(userId, verificationCode)
      }

      if (success) {
        setCurrentStep("complete")
      } else {
        Alert.alert("Verification Failed", "Invalid code. Please try again.")
      }
    } catch (error) {
      Alert.alert("Verification Failed", "Failed to verify code")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text)
    Alert.alert("Copied", "Secret key copied to clipboard")
  }

  const saveBackupCodes = () => {
    if (!setupData?.backupCodes) return

    const codesText = setupData.backupCodes.join("\n")
    Clipboard.setString(codesText)
    Alert.alert(
      "Backup Codes Copied",
      "Save these codes in a secure place. Each code can only be used once.",
    )
  }

  const renderMethodSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Choose 2FA Method</Text>
      {methods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[styles.methodCard, method.enabled && styles.methodCardEnabled]}
          onPress={() => !method.enabled && handleMethodSelect(method.id)}
          disabled={method.enabled}
        >
          <Icon icon={method.icon as any} size={24} color={colors.primary} />
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>{method.title}</Text>
            <Text style={styles.methodDescription}>{method.description}</Text>
            {method.enabled && <Text style={styles.enabledBadge}>✓ Enabled</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderTOTPSetup = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Setup Authenticator App</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : setupData ? (
        <>
          <Text style={styles.instructions}>
            1. Install an authenticator app like Google Authenticator or Authy
          </Text>
          <Text style={styles.instructions}>2. Scan this QR code with your authenticator app:</Text>

          <View style={styles.qrContainer}>
            <QRCode value={setupData.qrCode} size={200} backgroundColor="white" color="black" />
          </View>

          <Text style={styles.instructions}>Or enter this key manually:</Text>

          <TouchableOpacity
            style={styles.secretKey}
            onPress={() => copyToClipboard(setupData.secret)}
          >
            <Text style={styles.secretKeyText}>{setupData.manualEntryKey}</Text>
            <Icon icon="copy" size={20} color={colors.primary} />
          </TouchableOpacity>

          <Text style={styles.instructions}>3. Enter the 6-digit code from your app:</Text>

          <TextInput
            style={styles.input}
            placeholder="000000"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={verifyAndEnable}
            disabled={verificationCode.length !== 6}
          >
            <Text style={styles.buttonText}>Verify and Enable</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  )

  const renderSMSSetup = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Setup SMS Authentication</Text>

      {currentStep === "setup" ? (
        <>
          <Text style={styles.instructions}>
            Enter your phone number to receive verification codes:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="+1234567890"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={setupSMS}
            disabled={!phoneNumber || loading}
          >
            <Text style={styles.buttonText}>Send Verification Code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.instructions}>
            Enter the verification code sent to {phoneNumber}:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="000000"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={verifyAndEnable}
            disabled={verificationCode.length !== 6 || loading}
          >
            <Text style={styles.buttonText}>Verify and Enable</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )

  const renderComplete = () => (
    <View style={styles.section}>
      <View style={styles.successIcon}>
        <Icon icon="check-circle" size={64} color={colors.success} />
      </View>

      <Text style={styles.successTitle}>2FA Enabled Successfully!</Text>
      <Text style={styles.successMessage}>
        Your account is now protected with two-factor authentication.
      </Text>

      {setupData?.backupCodes && (
        <>
          <Text style={styles.backupTitle}>Backup Codes</Text>
          <Text style={styles.backupMessage}>
            Save these codes in a secure place. You can use them to access your account if you lose
            your authentication device.
          </Text>

          <View style={styles.backupCodes}>
            {setupData.backupCodes.map((code: string, index: number) => (
              <Text key={index} style={styles.backupCode}>
                {code}
              </Text>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={saveBackupCodes}>
            <Text style={styles.buttonText}>Copy Backup Codes</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.button, styles.doneButton]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon icon="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Two-Factor Authentication</Text>
      </View>

      {currentStep === "select" && renderMethodSelection()}
      {currentStep === "setup" && selectedMethod === "2fa_totp" && renderTOTPSetup()}
      {currentStep === "setup" && selectedMethod === "2fa_sms" && renderSMSSetup()}
      {currentStep === "verify" && selectedMethod === "2fa_sms" && renderSMSSetup()}
      {currentStep === "complete" && renderComplete()}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  backupCode: {
    ...typography.monospace,
    marginBottom: spacing.xs,
  },
  backupCodes: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  backupMessage: {
    ...typography.caption,
    color: colors.textDim,
    marginBottom: spacing.md,
  },
  backupTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    padding: spacing.md,
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
  doneButton: {
    backgroundColor: colors.success,
  },
  enabledBadge: {
    ...typography.caption,
    color: colors.success,
    marginTop: 4,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    padding: spacing.lg,
  },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    letterSpacing: 4,
    marginBottom: spacing.md,
    padding: spacing.md,
    textAlign: "center",
  },
  instructions: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: spacing.md,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  methodCardEnabled: {
    opacity: 0.6,
  },
  methodDescription: {
    ...typography.caption,
    color: colors.textDim,
    marginTop: 4,
  },
  methodInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  methodTitle: {
    ...typography.body,
    fontWeight: "600",
  },
  qrContainer: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    marginVertical: spacing.md,
    padding: spacing.lg,
  },
  secretKey: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  secretKeyText: {
    ...typography.monospace,
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.subheading,
    marginBottom: spacing.md,
  },
  successIcon: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  successMessage: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  successTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  title: {
    ...typography.heading,
    flex: 1,
    marginLeft: spacing.md,
  },
})
