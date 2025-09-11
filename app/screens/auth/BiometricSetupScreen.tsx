/**
 * Biometric Authentication Setup Screen
 * Allows users to enable Face ID, Touch ID, or fingerprint authentication
 */

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Icon } from "@/components"
import { colors, spacing, typography } from "@/theme"
import BiometricAuthService from "@/services/auth/BiometricAuthService"
import { useStores } from "@/models"

export function BiometricSetupScreen() {
  const navigation = useNavigation()
  const { authenticationStore } = useStores()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnrolled, setBiometricEnrolled] = useState(false)
  const [biometricType, setBiometricType] = useState<string>("none")
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  const biometricService = new BiometricAuthService()

  useEffect(() => {
    checkBiometricStatus()
  }, [])

  const checkBiometricStatus = async () => {
    try {
      setChecking(true)

      // Check hardware and enrollment
      const availability = await biometricService.checkBiometricAvailability()
      setBiometricAvailable(availability.isAvailable)
      setBiometricEnrolled(availability.isEnrolled)
      setBiometricType(availability.biometricType)

      // Check if already enabled for user
      const userId = authenticationStore.authUserId
      if (userId) {
        const enabled = await biometricService.isBiometricEnabled(userId)
        setBiometricEnabled(enabled)
      }
    } catch (error) {
      console.error("Failed to check biometric status:", error)
    } finally {
      setChecking(false)
    }
  }

  const enableBiometric = async () => {
    try {
      setLoading(true)

      const userId = authenticationStore.authUserId
      const email = authenticationStore.userEmail

      if (!userId || !email) {
        Alert.alert("Error", "User not authenticated")
        return
      }

      // For demo purposes, we'll use stored credentials
      // In production, prompt for password
      Alert.prompt(
        "Enable Biometric Login",
        "Enter your password to enable biometric authentication",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            onPress: async (password) => {
              if (!password) {
                Alert.alert("Error", "Password is required")
                return
              }

              const result = await biometricService.enableBiometric(userId, {
                email,
                password,
              })

              if (result.success) {
                setBiometricEnabled(true)
                Alert.alert("Success", `${getBiometricName()} login enabled successfully!`)
              } else {
                Alert.alert("Failed", result.error || "Failed to enable biometric")
              }
            },
          },
        ],
        "secure-text",
      )
    } catch (error) {
      Alert.alert("Error", "Failed to enable biometric authentication")
    } finally {
      setLoading(false)
    }
  }

  const disableBiometric = async () => {
    Alert.alert(
      "Disable Biometric Login",
      `Are you sure you want to disable ${getBiometricName()} login?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true)
              const userId = authenticationStore.authUserId

              if (!userId) {
                Alert.alert("Error", "User not authenticated")
                return
              }

              const result = await biometricService.disableBiometric(userId)

              if (result.success) {
                setBiometricEnabled(false)
                Alert.alert("Success", "Biometric login disabled")
              } else {
                Alert.alert("Failed", "Failed to disable biometric")
              }
            } catch (error) {
              Alert.alert("Error", "Failed to disable biometric authentication")
            } finally {
              setLoading(false)
            }
          },
        },
      ],
    )
  }

  const testBiometric = async () => {
    try {
      const userId = authenticationStore.authUserId

      if (!userId) {
        Alert.alert("Error", "User not authenticated")
        return
      }

      const result = await biometricService.authenticate(userId)

      if (result.authenticated) {
        Alert.alert("Success", "Biometric authentication successful!")
      } else {
        Alert.alert("Failed", result.error || "Authentication failed")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to test biometric authentication")
    }
  }

  const getBiometricName = () => {
    switch (biometricType) {
      case "face":
        return Platform.OS === "ios" ? "Face ID" : "Face Recognition"
      case "fingerprint":
        return Platform.OS === "ios" ? "Touch ID" : "Fingerprint"
      case "iris":
        return "Iris Recognition"
      default:
        return "Biometric"
    }
  }

  const getBiometricIcon = () => {
    switch (biometricType) {
      case "face":
        return "smile"
      case "fingerprint":
        return "fingerprint"
      case "iris":
        return "eye"
      default:
        return "shield"
    }
  }

  const getBiometricDescription = () => {
    const name = getBiometricName()
    if (biometricEnabled) {
      return `${name} is enabled. You can use it to quickly log in to your account.`
    }
    if (!biometricAvailable) {
      return `${name} is not available on this device.`
    }
    if (!biometricEnrolled) {
      return `Please set up ${name} in your device settings first.`
    }
    return `Enable ${name} for quick and secure access to your account.`
  }

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking biometric status...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon icon="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Biometric Authentication</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            icon={getBiometricIcon() as any}
            size={80}
            color={biometricEnabled ? colors.success : colors.primary}
          />
        </View>

        <Text style={styles.biometricName}>{getBiometricName()}</Text>
        <Text style={styles.description}>{getBiometricDescription()}</Text>

        {biometricAvailable && biometricEnrolled && (
          <>
            {!biometricEnabled ? (
              <TouchableOpacity style={styles.button} onPress={enableBiometric} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.buttonText}>Enable {getBiometricName()}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.testButton]}
                  onPress={testBiometric}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Test {getBiometricName()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.disableButton]}
                  onPress={disableBiometric}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <Text style={styles.buttonText}>Disable {getBiometricName()}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {!biometricAvailable && (
          <View style={styles.infoBox}>
            <Icon icon="info" size={20} color={colors.warning} />
            <Text style={styles.infoText}>
              Biometric authentication is not available on this device.
            </Text>
          </View>
        )}

        {biometricAvailable && !biometricEnrolled && (
          <View style={styles.infoBox}>
            <Icon icon="alert-circle" size={20} color={colors.warning} />
            <Text style={styles.infoText}>
              Please set up {getBiometricName()} in your device settings to use this feature.
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                // Open device settings
                if (Platform.OS === "ios") {
                  // Linking.openURL('app-settings:')
                } else {
                  // Linking.openSettings()
                }
              }}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Benefits of Biometric Login</Text>
          <View style={styles.benefit}>
            <Icon icon="zap" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Quick access without typing passwords</Text>
          </View>
          <View style={styles.benefit}>
            <Icon icon="lock" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Enhanced security with unique biometric data</Text>
          </View>
          <View style={styles.benefit}>
            <Icon icon="shield" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Your biometric data never leaves your device</Text>
          </View>
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyTitle}>Privacy & Security</Text>
          <Text style={styles.privacyText}>
            Your biometric data is stored securely on your device and is never sent to our servers.
            We only store an encrypted token that allows you to authenticate using your biometric.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  benefit: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    flex: 1,
    marginLeft: spacing.sm,
  },
  benefits: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  benefitsTitle: {
    ...typography.subheading,
    marginBottom: spacing.md,
  },
  biometricName: {
    ...typography.heading,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginBottom: spacing.md,
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
  content: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  disableButton: {
    backgroundColor: colors.error,
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
  infoBox: {
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.textDim,
    marginTop: spacing.md,
  },
  privacy: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textDim,
    lineHeight: 20,
  },
  privacyTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
  },
  settingsButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.warning,
    borderRadius: 4,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  settingsButtonText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: "600",
  },
  testButton: {
    backgroundColor: colors.success,
  },
  title: {
    ...typography.heading,
    flex: 1,
    marginLeft: spacing.md,
  },
})
