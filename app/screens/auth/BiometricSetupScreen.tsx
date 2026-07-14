/**
 * Biometric Authentication Setup Screen
 * Allows users to enable Face ID, Touch ID, or fingerprint authentication
 */

import { useRouter } from "expo-router"
import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native"
import { Icon, IconTypes } from "@/components"
import { colors as themeColors } from "@/theme"
import BiometricAuthService from "@/services/auth/BiometricAuthService"
import { useAuthStore } from "@/state/authStore"

// Local aliases mapping this screen's legacy color names onto the app theme
// (the theme has no primary/card/warning entries). Consumed only by the Icon /
// ActivityIndicator `color` props; every style is now a NativeWind className.
// This screen is light-only, so color utilities carry no `dark:` twin.
const colors = {
  ...themeColors,
  primary: themeColors.tint,
  card: themeColors.palette.neutral100,
  success: themeColors.palette.success500,
  warning: themeColors.palette.warning500,
  warningLight: themeColors.palette.warning100,
}

export function BiometricSetupScreen() {
  const router = useRouter()
  const authStore = useAuthStore()
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
      const userId = authStore.user?.id
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

      const userId = authStore.user?.id
      const email = authStore.user?.email

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
            onPress: async (password?: string) => {
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
              const userId = authStore.user?.id

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
      const userId = authStore.user?.id

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

  // icons come from the app's registered icon set (see app/components/Icon)
  const getBiometricIcon = (): IconTypes => {
    switch (biometricType) {
      case "face":
        return "profile"
      case "fingerprint":
        return "lock"
      case "iris":
        return "view"
      default:
        return "lock"
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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-md text-[16px] font-spaceRegular text-textDim">
          Checking biometric status...
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-b-border p-lg">
        <TouchableOpacity onPress={() =>router.back()}>
          <Icon icon="back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="ml-md flex-1 text-[22px] font-spaceBold">Biometric Authentication</Text>
      </View>

      <View className="p-lg">
        <View className="my-xl items-center">
          <Icon
            icon={getBiometricIcon()}
            size={80}
            color={biometricEnabled ? colors.success : colors.primary}
          />
        </View>

        <Text className="mb-sm text-center text-[22px] font-spaceBold">{getBiometricName()}</Text>
        <Text className="mb-xl text-center text-[16px] font-spaceRegular text-textDim">
          {getBiometricDescription()}
        </Text>

        {biometricAvailable && biometricEnrolled && (
          <>
            {!biometricEnabled ? (
              <TouchableOpacity
                className="mb-md items-center rounded-lg bg-tint p-md"
                onPress={enableBiometric}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
                    Enable {getBiometricName()}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  className="mb-md items-center rounded-lg bg-success500 p-md"
                  onPress={testBiometric}
                  disabled={loading}
                >
                  <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
                    Test {getBiometricName()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="mb-md items-center rounded-lg bg-error p-md"
                  onPress={disableBiometric}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <Text className="text-[16px] font-spaceRegular font-semibold text-neutral100">
                      Disable {getBiometricName()}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {!biometricAvailable && (
          <View className="my-md rounded-lg bg-warning100 p-md">
            <Icon icon="feedback" size={20} color={colors.warning} />
            <Text className="mt-sm text-[16px] font-spaceRegular text-warning500">
              Biometric authentication is not available on this device.
            </Text>
          </View>
        )}

        {biometricAvailable && !biometricEnrolled && (
          <View className="my-md rounded-lg bg-warning100 p-md">
            <Icon icon="feedback" size={20} color={colors.warning} />
            <Text className="mt-sm text-[16px] font-spaceRegular text-warning500">
              Please set up {getBiometricName()} in your device settings to use this feature.
            </Text>
            <TouchableOpacity
              className="mt-md self-start rounded bg-warning500 p-sm"
              onPress={() => {
                // Open device settings
                if (Platform.OS === "ios") {
                  // Linking.openURL('app-settings:')
                } else {
                  // Linking.openSettings()
                }
              }}
            >
              <Text className="text-[13px] font-spaceRegular font-semibold text-neutral100">
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mt-xl rounded-lg bg-neutral100 p-md">
          <Text className="mb-md text-[16px] font-spaceMedium">Benefits of Biometric Login</Text>
          <View className="mb-sm flex-row items-center">
            <Icon icon="check" size={20} color={colors.primary} />
            <Text className="ml-sm flex-1 text-[16px] font-spaceRegular">
              Quick access without typing passwords
            </Text>
          </View>
          <View className="mb-sm flex-row items-center">
            <Icon icon="lock" size={20} color={colors.primary} />
            <Text className="ml-sm flex-1 text-[16px] font-spaceRegular">
              Enhanced security with unique biometric data
            </Text>
          </View>
          <View className="mb-sm flex-row items-center">
            <Icon icon="lock" size={20} color={colors.primary} />
            <Text className="ml-sm flex-1 text-[16px] font-spaceRegular">
              Your biometric data never leaves your device
            </Text>
          </View>
        </View>

        <View className="mt-lg rounded-lg bg-neutral100 p-md">
          <Text className="mb-sm text-[16px] font-spaceMedium">Privacy & Security</Text>
          <Text className="text-[13px] font-spaceRegular leading-5 text-textDim">
            Your biometric data is stored securely on your device and is never sent to our servers.
            We only store an encrypted token that allows you to authenticate using your biometric.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}
