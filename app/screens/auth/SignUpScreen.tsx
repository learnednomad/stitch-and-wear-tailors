import { FC, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ViewStyle, View, Alert, TouchableOpacity, TextStyle } from "react-native";
import { AppStackScreenProps } from "@/navigators";
import { Screen, Text, TextField, Button, PasswordStrengthIndicator, Icon } from "@/components";
import { useNavigation } from "@react-navigation/native";
import { useStores } from "@/models";
import { getAppwriteAuthAdapter } from "@/services/appwrite/appwrite-auth-adapter";
import { validateEmail } from "@/utils/emailValidation";
import { validatePassword, validatePasswordConfirmation } from "@/utils/passwordValidation";
import { spacing, colors } from "@/theme";

interface SignUpScreenProps extends AppStackScreenProps<"SignUp"> {}

export const SignUpScreen: FC<SignUpScreenProps> = observer(function SignUpScreen() {
  const { authStore } = useStores();
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"client" | "tailor">("client");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<"login" | "register">("register");
  const [showEmailValidation, setShowEmailValidation] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);

  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const confirmPasswordValidation = useMemo(
    () => validatePasswordConfirmation(password, confirmPassword),
    [password, confirmPassword],
  );

  const handleSignUp = async () => {
    setShowEmailValidation(true);
    setShowPasswordValidation(true);

    const validationErrors: string[] = [];
    if (!firstName.trim()) validationErrors.push("First name is required");
    if (!lastName.trim()) validationErrors.push("Last name is required");
    if (!emailValidation.isValid) validationErrors.push(...emailValidation.errors);
    if (!passwordValidation.isValid) validationErrors.push(...passwordValidation.errors);
    if (!confirmPasswordValidation.isValid)
      validationErrors.push(confirmPasswordValidation.error || "Password confirmation error");

    if (validationErrors.length > 0) {
      Alert.alert("Validation Error", validationErrors.join("\n"));
      return;
    }

    setIsLoading(true);
    authStore.setLoading(true);
    authStore.clearError();

    try {
      const authAdapter = getAppwriteAuthAdapter();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const result = await authAdapter.register(email.trim(), password, fullName);

      if (result.success && result.data) {
        const loginResult = await authAdapter.login(email.trim(), password);

        if (loginResult.success && loginResult.data) {
          const userData = {
            id: loginResult.data.user.$id,
            email: loginResult.data.user.email,
            role: userType,
            status: "active" as const,
            profile: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: "",
              avatar: "",
            },
            preferences: {
              notifications: {
                email: true,
                push: true,
                sms: false,
              },
              language: "en",
              timezone: "UTC",
              currency: "USD",
            },
            emailVerified: loginResult.data.user.emailVerification,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date(loginResult.data.user.registration).toISOString(),
            updatedAt: new Date(loginResult.data.user.accessedAt).toISOString(),
          };

          authStore.setUser(userData);
          authStore.setSession({
            accessToken: loginResult.data.session.$id,
            refreshToken: loginResult.data.session.$id,
            expiresAt: loginResult.data.session.expire,
          });

          const verificationResult = await authAdapter.sendEmailVerification();
          if (verificationResult.success) {
            Alert.alert(
              "Account Created!",
              "Please check your email to verify your account before you can access the app.",
              [{ text: "OK", onPress: () => navigation.navigate("VerifyEmail" as never) }],
            );
          } else {
            Alert.alert(
              "Account Created",
              "Your account was created but we couldn't send the verification email. Please try signing in.",
              [{ text: "OK", onPress: () => navigation.navigate("SignIn" as never) }],
            );
          }
        } else {
          Alert.alert("Success", "Account created! Please sign in to verify your email.", [
            { text: "OK", onPress: () => navigation.navigate("SignIn" as never) },
          ]);
        }
      } else {
        Alert.alert("Sign Up Failed", result.message || "Registration failed");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      Alert.alert("Error", error.message || "Registration failed");
      authStore.setError(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
      authStore.setLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn" as never);
  };

  const handleFacebookSignup = () => {
    Alert.alert("Facebook Signup", "Facebook signup not implemented yet");
  };

  const handleGoogleSignup = () => {
    Alert.alert("Google Signup", "Google signup not implemented yet");
  };

  return (
    <Screen
      preset="auto"
      backgroundColor="#f7fafc"
      contentContainerStyle={$contentContainer}
      safeAreaEdges={["top", "bottom"]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={$tabContainer}>
        <TouchableOpacity
          style={[$tab, currentTab === "login" && $activeTab]}
          onPress={() => {
            setCurrentTab("login")
            handleSignIn()
          }}
        >
          <Text text="Login" style={[$tabText, currentTab === "login" && $activeTabText]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[$tab, currentTab === "register" && $activeTab]}
          onPress={() => setCurrentTab("register")}
        >
          <Text text="Register" style={[$tabText, currentTab === "register" && $activeTabText]} />
        </TouchableOpacity>
      </View>

      <Text preset="heading" text="Join Stitch & Wear" style={$title} />
      <Text text="Experience the finest Nigerian craftsmanship" style={$subtitle} />

      {authStore.error && <Text text={authStore.error} style={$errorText} />}

      <TextField
        value={firstName}
        onChangeText={setFirstName}
        label="First Name *"
        placeholder="Enter your first name"
        autoCapitalize="words"
        style={$textField}
      />

      <TextField
        value={lastName}
        onChangeText={setLastName}
        label="Last Name *"
        placeholder="Enter your last name"
        autoCapitalize="words"
        style={$textField}
      />

      <TextField
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          if (text.length > 0) setShowEmailValidation(true)
        }}
        label="Email *"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        status={showEmailValidation && !emailValidation.isValid ? "error" : undefined}
        helper={
          showEmailValidation && !emailValidation.isValid
            ? emailValidation.errors.join(", ")
            : showEmailValidation && emailValidation.suggestions.length > 0
              ? emailValidation.suggestions[0]
              : undefined
        }
        style={$textField}
      />

      {showEmailValidation && emailValidation.warnings.length > 0 && (
        <View style={$validationWarning}>
          {emailValidation.warnings.map((warning, index) => (
            <Text key={index} text={`⚠️ ${warning}`} style={$warningText} />
          ))}
        </View>
      )}

      <TextField
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          if (text.length > 0) setShowPasswordValidation(true)
        }}
        label="Password *"
        placeholder="Enter a strong password"
        secureTextEntry
        status={showPasswordValidation && !passwordValidation.isValid ? "error" : undefined}
        style={$textField}
      />

      {showPasswordValidation && (
        <PasswordStrengthIndicator
          password={password}
          showCriteria={true}
          showFeedback={false}
          compact={false}
          style={$passwordStrength}
        />
      )}

      <TextField
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        label="Confirm Password *"
        placeholder="Confirm your password"
        secureTextEntry
        status={
          confirmPassword.length > 0 && !confirmPasswordValidation.isValid ? "error" : undefined
        }
        helper={
          confirmPassword.length > 0 && !confirmPasswordValidation.isValid
            ? confirmPasswordValidation.error
            : confirmPassword.length > 0 && confirmPasswordValidation.isValid
              ? "✓ Passwords match"
              : undefined
        }
        style={$textField}
      />

      <View style={$userTypeContainer}>
        <Text text="I am a:" style={$userTypeLabel} />
        <View style={$userTypeButtons}>
          <Button
            text="Client"
            preset={userType === "client" ? "default" : "reversed"}
            onPress={() => setUserType("client")}
            style={$userTypeButton}
          />
          <Button
            text="Tailor"
            preset={userType === "tailor" ? "default" : "reversed"}
            onPress={() => setUserType("tailor")}
            style={$userTypeButton}
          />
        </View>
      </View>

      <Button
        text={isLoading ? "Creating Account..." : "Create Account"}
        onPress={handleSignUp}
        disabled={isLoading || authStore.isLoading}
        style={$signUpButton}
      />

      <View style={$orContainer}>
        <View style={$orLine} />
        <Text text="OR" style={$orText} />
        <View style={$orLine} />
      </View>

      <Button
        text="Sign up with Facebook"
        onPress={handleFacebookSignup}
        style={$socialButton}
        textStyle={$socialButtonText}
        LeftAccessory={() => <Icon icon="facebook" size={20} style={$socialIcon} />}
      />

      <Button
        text="Sign up with Google"
        onPress={handleGoogleSignup}
        style={$socialButton}
        textStyle={$socialButtonText}
        LeftAccessory={() => <Icon icon="google" size={20} style={$socialIcon} />}
      />

      <Button
        text="Already have an account? Sign In"
        preset="reversed"
        onPress={handleSignIn}
        style={$signInButton}
      />
    </Screen>
  )
});

const $contentContainer: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
};

const $tabContainer: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.xl,
  backgroundColor: "#e2e8f0",
  borderRadius: 12,
  padding: 6,
};

const $tab: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 6,
  alignItems: "center",
};

const $activeTab: ViewStyle = {
  backgroundColor: "#ffffff",
  elevation: 3,
  shadowColor: "#2B5D2F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
};

const $tabText: TextStyle = {
  fontSize: 14,
  color: "#666666",
  fontWeight: "500",
};

const $activeTabText: TextStyle = {
  color: "#333333",
  fontWeight: "600",
};

const $illustrationContainer: ViewStyle = {
  alignItems: "center",
  marginVertical: spacing.xl,
};


const $title: TextStyle = {
  marginBottom: spacing.sm,
  textAlign: "center",
  fontSize: 28,
  fontWeight: "700",
  color: "#1a202c",
  letterSpacing: 0.5,
};

const $subtitle: TextStyle = {
  marginBottom: spacing.xl,
  textAlign: "center",
  fontSize: 16,
  color: "#4a5568",
  lineHeight: 22,
  fontWeight: "400",
};

const $errorText: TextStyle = {
  color: "#ff4444",
  marginBottom: spacing.md,
  textAlign: "center",
  fontSize: 14,
};

const $textField: ViewStyle = {
  marginBottom: spacing.lg,
};

const $userTypeContainer: ViewStyle = {
  marginBottom: spacing.lg,
};

const $userTypeLabel: TextStyle = {
  marginBottom: spacing.sm,
  fontWeight: "600",
  fontSize: 16,
  color: "#333333",
};

const $userTypeButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
};

const $userTypeButton: ViewStyle = {
  flex: 1,
};

const $signUpButton: ViewStyle = {
  marginBottom: spacing.lg,
  backgroundColor: "#2B5D2F",
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: "#2B5D2F",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};

const $orContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.lg,
};

const $orLine: ViewStyle = {
  flex: 1,
  height: 1,
  backgroundColor: "#e0e0e0",
};

const $orText: TextStyle = {
  marginHorizontal: spacing.md,
  fontSize: 12,
  color: "#666666",
  fontWeight: "300",
};

const $socialButton: ViewStyle = {
  marginBottom: spacing.md,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: "#e0e0e0",
  borderRadius: 8,
};

const $socialButtonText: TextStyle = {
  color: "#333333",
  fontSize: 16,
  fontWeight: "500",
};

const $socialIcon: ViewStyle = {
  marginRight: spacing.sm,
};

const $signInButton: ViewStyle = {
  marginTop: spacing.sm,
};

const $validationWarning: ViewStyle = {
  marginBottom: spacing.md,
  paddingHorizontal: spacing.sm,
};

const $warningText: TextStyle = {
  fontSize: 13,
  color: "#f59e0b",
  marginBottom: spacing.xs,
};

const $passwordStrength: ViewStyle = {
  marginBottom: spacing.md,
};