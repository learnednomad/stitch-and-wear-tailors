/**
 * PremiumSignInForm - Luxury tailoring app authentication component
 * Features: Biometric auth, premium animations, accessibility, modern UX
 */

import { FC, useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Pressable,
} from "react-native"
import { LinearGradient } from "react-native-linear-gradient"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BiometricService } from "@/services/biometric/BiometricService"
import { spacing } from "@/theme"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type SignInFormValues = z.infer<typeof signInSchema>

interface PremiumSignInFormProps {
  onSignIn: (email: string, password: string, biometric?: boolean) => Promise<void>
  onForgotPassword: () => void
  onSignUp: () => void
  onBiometricAuth: () => Promise<void>
  isLoading?: boolean
}

export const PremiumSignInForm: FC<PremiumSignInFormProps> = 
  ({ onSignIn, onForgotPassword, onSignUp, onBiometricAuth, isLoading = false }) => {
    // Form state — react-hook-form + zod own field values and validation
    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<SignInFormValues>({
      resolver: zodResolver(signInSchema),
      defaultValues: { email: "", password: "" },
    })
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    // Biometric state
    const [biometricAvailable, setBiometricAvailable] = useState(false)
    const [biometricType, setBiometricType] = useState<string>("")
    const [biometricLoading, setBiometricLoading] = useState(false)

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const biometricPulse = useRef(new Animated.Value(1)).current

    // Input focus animations
    const emailFocusAnim = useRef(new Animated.Value(0)).current
    const passwordFocusAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
      initializeComponent()
      checkBiometricAvailability()
    }, [])

    const initializeComponent = () => {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start()
    }

    const checkBiometricAvailability = async () => {
      try {
        const sensorInfo = await BiometricService.isBiometricAvailable()
        setBiometricAvailable(sensorInfo.available)
        setBiometricType(sensorInfo.biometryType || "")

        if (sensorInfo.available) {
          // Start biometric pulse animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(biometricPulse, {
                toValue: 1.1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(biometricPulse, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
          ).start()
        }
      } catch (error) {
        console.error("Error checking biometric availability:", error)
      }
    }

    const handleBiometricAuth = async () => {
      if (!biometricAvailable) return

      setBiometricLoading(true)

      try {
        const result = await BiometricService.showAuthPrompt()

        if (result.success) {
          await onBiometricAuth()
        } else {
          Alert.alert(
            "Authentication Failed",
            result.error || "Biometric authentication was not successful",
            [{ text: "OK" }],
          )
        }
      } catch (error: any) {
        Alert.alert("Error", error.message || "Authentication failed")
      } finally {
        setBiometricLoading(false)
      }
    }

    const animateInputFocus = (animValue: Animated.Value, focused: boolean) => {
      Animated.timing(animValue, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start()
    }

    const onSubmit = handleSubmit(async (values) => {
      await onSignIn(values.email.trim().toLowerCase(), values.password, false)
    })

    const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
      switch (biometricType) {
        case "FaceID":
          return "scan-outline"
        case "TouchID":
        case "Fingerprint":
          return "finger-print-outline"
        default:
          return "shield-checkmark-outline"
      }
    }

    const getBiometricLabel = () => {
      switch (biometricType) {
        case "FaceID":
          return "Sign in with Face ID"
        case "TouchID":
          return "Sign in with Touch ID"
        case "Fingerprint":
          return "Sign in with Fingerprint"
        default:
          return "Sign in with Biometrics"
      }
    }

    return (
      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }}
      >
        <LinearGradient
          colors={["rgba(43, 93, 47, 0.1)", "rgba(43, 93, 47, 0.05)", "transparent"]}
          style={styles.backgroundGradient}
        />

        {/* Header */}
        <View className="mb-xl items-center">
          <Text className="mb-sm text-center text-[32px] font-bold text-[#1a202c]">Welcome Back</Text>
          <Text className="text-center text-[16px] leading-[22px] text-[#4a5568]">
            Access your premium tailoring experience
          </Text>
        </View>

        {/* Biometric Authentication */}
        {biometricAvailable && (
          <Animated.View
            style={{
              alignItems: "center",
              marginBottom: spacing.lg,
              transform: [{ scale: biometricPulse }],
            }}
          >
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
              disabled={biometricLoading || isLoading}
              activeOpacity={0.7}
            >
              <LinearGradient colors={["#2B5D2F", "#1e4522"]} style={styles.biometricGradient}>
                <Ionicons name={getBiometricIcon()} size={32} color="white" />
                <Text className="ml-sm text-[16px] font-semibold text-[#FFFFFF]">
                  {getBiometricLabel()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Divider */}
        {biometricAvailable && (
          <View className="my-lg flex-row items-center">
            <View className="h-px flex-1 bg-[#e0e0e0]" />
            <Text className="mx-md text-[14px] text-[#666]">or continue with email</Text>
            <View className="h-px flex-1 bg-[#e0e0e0]" />
          </View>
        )}

        {/* Form Fields */}
        <View className="flex-1">
          {/* Email Input */}
          <View className="mb-lg">
            <Animated.View
              style={[
                styles.inputWrapper,
                {
                  borderColor: emailFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["#e0e0e0", "#2B5D2F"],
                  }),
                  shadowOpacity: emailFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.1],
                  }),
                },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    className="flex-1 py-md text-[16px] text-[#333333]"
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => animateInputFocus(emailFocusAnim, true)}
                    onBlur={() => {
                      animateInputFocus(emailFocusAnim, false)
                      onBlur()
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                )}
              />
            </Animated.View>
            {errors.email && (
              <Text className="ml-md mt-xs text-[14px] text-[#dc2626]">{errors.email.message}</Text>
            )}
          </View>

          {/* Password Input */}
          <View className="mb-lg">
            <Animated.View
              style={[
                styles.inputWrapper,
                {
                  borderColor: passwordFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["#e0e0e0", "#2B5D2F"],
                  }),
                  shadowOpacity: passwordFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.1],
                  }),
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    className="flex-1 py-md text-[16px] text-[#333333]"
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => animateInputFocus(passwordFocusAnim, true)}
                    onBlur={() => {
                      animateInputFocus(passwordFocusAnim, false)
                      onBlur()
                    }}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                )}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-xs"
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </Animated.View>
            {errors.password && (
              <Text className="ml-md mt-xs text-[14px] text-[#dc2626]">
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Remember Me & Forgot Password */}
          <View className="mb-xl flex-row items-center justify-between">
            <Pressable
              className="flex-row items-center"
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View
                className={`mr-sm h-5 w-5 items-center justify-center rounded border ${
                  rememberMe ? "border-emerald500 bg-emerald500" : "border-[#ccc]"
                }`}
              >
                {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text className="text-[14px] text-[#666]">Remember me</Text>
            </Pressable>

            <TouchableOpacity onPress={onForgotPassword} disabled={isLoading}>
              <Text className="text-[14px] font-medium text-emerald500">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={onSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isLoading ? ["#ccc", "#999"] : ["#2B5D2F", "#1e4522"]}
              style={styles.buttonGradient}
            >
              <Text className="text-[16px] font-semibold text-[#FFFFFF]">
                {isLoading ? "Signing In..." : "Sign In"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-[14px] text-[#666]">Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={onSignUp} disabled={isLoading}>
              <Text className="text-[14px] font-semibold text-emerald500">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    )
  }

// Only styles that must stay inline remain here: the LinearGradient targets
// (className is not wired through that third-party component), RN shadows /
// elevation, the icon offset, dynamic window-relative dimensions, and the base
// of the animated input wrapper (its borderColor/shadowOpacity are animated).
// Every static layout/typography style migrated to className token utilities.
const styles = StyleSheet.create({
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
  } as ViewStyle,

  biometricButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#2B5D2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  } as ViewStyle,

  biometricGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: width * 0.7,
  } as ViewStyle,

  buttonGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
  } as ViewStyle,

  disabledButton: {
    elevation: 2,
    shadowOpacity: 0.1,
  } as ViewStyle,

  inputIcon: {
    marginRight: spacing.sm,
  } as ImageStyle,

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  } as ViewStyle,

  signInButton: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#2B5D2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: spacing.lg,
  } as ViewStyle,
})

export default PremiumSignInForm
