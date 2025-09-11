/**
 * PremiumSignInForm - Luxury tailoring app authentication component
 * Features: Biometric auth, premium animations, accessibility, modern UX
 */

import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Alert,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Pressable,
} from "react-native"
import { LinearGradient } from "react-native-linear-gradient"
import { observer } from "mobx-react-lite"
import { useStores } from "@/models"
import { BiometricService } from "@/services/biometric/BiometricService"
import { spacing, colors } from "@/theme"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")

interface PremiumSignInFormProps {
  onSignIn: (email: string, password: string, biometric?: boolean) => Promise<void>
  onForgotPassword: () => void
  onSignUp: () => void
  onBiometricAuth: () => Promise<void>
  isLoading?: boolean
}

export const PremiumSignInForm: React.FC<PremiumSignInFormProps> = observer(
  ({ onSignIn, onForgotPassword, onSignUp, onBiometricAuth, isLoading = false }) => {
    const { authStore } = useStores()

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

    const validateForm = () => {
      const errors: Record<string, string> = {}

      if (!email.trim()) {
        errors.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Please enter a valid email"
      }

      if (!password.trim()) {
        errors.password = "Password is required"
      } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters"
      }

      setFormErrors(errors)
      return Object.keys(errors).length === 0
    }

    const handleSubmit = async () => {
      if (!validateForm()) return
      await onSignIn(email.trim().toLowerCase(), password, false)
    }

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
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(43, 93, 47, 0.1)", "rgba(43, 93, 47, 0.05)", "transparent"]}
          style={styles.backgroundGradient}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Access your premium tailoring experience</Text>
        </View>

        {/* Biometric Authentication */}
        {biometricAvailable && (
          <Animated.View
            style={[styles.biometricContainer, { transform: [{ scale: biometricPulse }] }]}
          >
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
              disabled={biometricLoading || isLoading}
              activeOpacity={0.7}
            >
              <LinearGradient colors={["#2B5D2F", "#1e4522"]} style={styles.biometricGradient}>
                <Ionicons name={getBiometricIcon()} size={32} color="white" />
                <Text style={styles.biometricText}>{getBiometricLabel()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Divider */}
        {biometricAvailable && (
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
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
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  if (formErrors.email) {
                    setFormErrors((prev) => ({ ...prev, email: "" }))
                  }
                }}
                onFocus={() => animateInputFocus(emailFocusAnim, true)}
                onBlur={() => animateInputFocus(emailFocusAnim, false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </Animated.View>
            {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
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
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  if (formErrors.password) {
                    setFormErrors((prev) => ({ ...prev, password: "" }))
                  }
                }}
                onFocus={() => animateInputFocus(passwordFocusAnim, true)}
                onBlur={() => animateInputFocus(passwordFocusAnim, false)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </Animated.View>
            {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsContainer}>
            <Pressable
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </Pressable>

            <TouchableOpacity onPress={onForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isLoading ? ["#ccc", "#999"] : ["#2B5D2F", "#1e4522"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.signInButtonText}>{isLoading ? "Signing In..." : "Sign In"}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={onSignUp} disabled={isLoading}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    )
  },
)

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

  biometricContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  } as ViewStyle,

  biometricGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: width * 0.7,
  } as ViewStyle,

  biometricText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: spacing.sm,
  } as TextStyle,

  buttonGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
  } as ViewStyle,

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  } as ViewStyle,

  checkboxChecked: {
    backgroundColor: "#2B5D2F",
    borderColor: "#2B5D2F",
  } as ViewStyle,

  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  } as ViewStyle,

  disabledButton: {
    elevation: 2,
    shadowOpacity: 0.1,
  } as ViewStyle,

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  } as ViewStyle,

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  } as ViewStyle,

  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 14,
    color: "#666",
  } as TextStyle,

  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  } as TextStyle,

  forgotPasswordText: {
    fontSize: 14,
    color: "#2B5D2F",
    fontWeight: "500",
  } as TextStyle,

  formContainer: {
    flex: 1,
  } as ViewStyle,

  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  } as ViewStyle,

  inputContainer: {
    marginBottom: spacing.lg,
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

  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  } as ViewStyle,

  passwordToggle: {
    padding: spacing.xs,
  } as ViewStyle,

  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,

  rememberMeText: {
    fontSize: 14,
    color: "#666",
  } as TextStyle,

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

  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,

  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  signUpLink: {
    fontSize: 14,
    color: "#2B5D2F",
    fontWeight: "600",
  } as TextStyle,

  signUpPrompt: {
    fontSize: 14,
    color: "#666",
  } as TextStyle,

  subtitle: {
    fontSize: 16,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 22,
  } as TextStyle,

  textInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: "#333",
  } as TextStyle,

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: spacing.sm,
    textAlign: "center",
  } as TextStyle,
})

export default PremiumSignInForm
