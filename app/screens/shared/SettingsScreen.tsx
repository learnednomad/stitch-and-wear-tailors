/**
 * SettingsScreen (shared)
 *
 * Routed from both the client and tailor tab navigators. Sections:
 * Profile (edit name/phone), Preferences (language), Security (password
 * reset email, biometric setup), Notifications (local switches persisted
 * to storage) and About, plus Sign Out.
 */
import { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Image, ImageStyle, Platform, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import i18next from "i18next"
import Constants from "expo-constants"
import { AppStackScreenProps } from "@/navigators"
import { Button, Screen, Switch, Text, TextField } from "@/components"
import { useStores } from "@/models"
import { useAuth } from "@/contexts/AuthContext"
import AuthService from "@/services/auth/AuthService"
import { getPocketBaseAuthAdapter } from "@/services/pocketbase/pocketbase-auth-adapter"
import { pb, fileUrl } from "@/services/pocketbase/pocketbase-client"
import * as storage from "@/utils/storage"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface SettingsScreenProps extends AppStackScreenProps<"Settings"> {}

const LANGUAGES: Array<{ tag: string; label: string }> = [
  { tag: "en", label: "English" },
  { tag: "fr", label: "Français" },
  { tag: "es", label: "Español" },
  { tag: "ar", label: "العربية" },
  { tag: "hi", label: "हिन्दी" },
  { tag: "ja", label: "日本語" },
  { tag: "ko", label: "한국어" },
]

const NOTIFICATION_PREFS_KEY = "settings.notificationPrefs"
const LANGUAGE_KEY = "settings.language"

interface LocalNotificationPrefs {
  orderUpdates: boolean
  appointments: boolean
  payments: boolean
}

const DEFAULT_PREFS: LocalNotificationPrefs = {
  orderUpdates: true,
  appointments: true,
  payments: true,
}

export const SettingsScreen: FC<SettingsScreenProps> = observer(function SettingsScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const { authStore } = useStores()
  const { signOut } = useAuth()

  const user = authStore.user
  const pbRecord = pb.authStore.record as any

  // profile edit state
  const [firstName, setFirstName] = useState(user?.profile?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.profile?.lastName ?? "")
  const [phone, setPhone] = useState(user?.profile?.phone ?? "")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // local preference state (persisted to storage in v1)
  const [language, setLanguage] = useState(storage.loadString(LANGUAGE_KEY) ?? "en")
  const [notifPrefs, setNotifPrefs] = useState<LocalNotificationPrefs>(
    storage.load<LocalNotificationPrefs>(NOTIFICATION_PREFS_KEY) ?? DEFAULT_PREFS,
  )

  const avatarUrl =
    pbRecord?.avatar && pbRecord?.id ? fileUrl(pbRecord, pbRecord.avatar, "100x100") : ""

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    const result = await getPocketBaseAuthAdapter().updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    })
    setIsSavingProfile(false)
    if (result.success) {
      // keep the in-memory auth user in sync
      authStore.updateUserProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() })
      Alert.alert("Saved", "Your profile has been updated.")
    } else {
      Alert.alert("Error", result.message ?? "Failed to update your profile")
    }
  }

  const handleLanguage = (tag: string) => {
    setLanguage(tag)
    storage.saveString(LANGUAGE_KEY, tag)
    i18next.changeLanguage(tag)
  }

  const handleChangePassword = () => {
    const email = user?.email
    if (!email) return
    Alert.alert("Change password", `We'll email a password reset link to ${email}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send email",
        onPress: async () => {
          const result = await AuthService.createPasswordRecovery(email)
          if (result.success) {
            Alert.alert("Email sent", "Check your inbox for the password reset link.")
          } else {
            Alert.alert("Error", result.error ?? "Failed to send the reset email")
          }
        },
      },
    ])
  }

  const updateNotifPref = (key: keyof LocalNotificationPrefs, value: boolean) => {
    const next = { ...notifPrefs, [key]: value }
    setNotifPrefs(next)
    storage.save(NOTIFICATION_PREFS_KEY, next)
  }

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ])
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0"

  const $section: ViewStyle = {
    backgroundColor: theme.colors.palette.neutral100,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  }

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <Text preset="heading" text="Settings" style={$heading} />

      {/* Profile */}
      <Text preset="subheading" text="Profile" style={$sectionTitle} />
      <View style={$section}>
        <View style={$profileRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={$avatar} />
          ) : (
            <View style={[$avatar, $avatarPlaceholder, { backgroundColor: theme.colors.tint }]}>
              <Text style={$avatarInitial} text={(firstName || "U").charAt(0).toUpperCase()} />
            </View>
          )}
          <View style={$profileMeta}>
            <Text style={{ color: theme.colors.text }} text={user?.email ?? ""} />
            <Text
              style={[$roleText, { color: theme.colors.textDim }]}
              text={user?.role === "tailor" ? "Tailor account" : "Client account"}
            />
          </View>
        </View>
        <TextField label="First name" value={firstName} onChangeText={setFirstName} containerStyle={$field} />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} containerStyle={$field} />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          containerStyle={$field}
        />
        <Button
          text={isSavingProfile ? "Saving..." : "Save profile"}
          onPress={handleSaveProfile}
          disabled={isSavingProfile}
        />
      </View>

      {/* Preferences */}
      <Text preset="subheading" text="Preferences" style={$sectionTitle} />
      <View style={$section}>
        <Text preset="formLabel" text="Language" style={$fieldLabel} />
        <View style={$languageChips}>
          {LANGUAGES.map((option) => {
            const active = language === option.tag
            return (
              <TouchableOpacity
                key={option.tag}
                style={[
                  $chip,
                  {
                    backgroundColor: active ? theme.colors.tint : theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => handleLanguage(option.tag)}
              >
                <Text
                  style={[
                    $chipText,
                    { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                  ]}
                  text={option.label}
                />
              </TouchableOpacity>
            )
          })}
        </View>
        <Text
          style={[$hint, { color: theme.colors.textDim }]}
          text={`Theme follows your system setting (${theme.isDark ? "dark" : "light"} right now).`}
        />
      </View>

      {/* Security */}
      <Text preset="subheading" text="Security" style={$sectionTitle} />
      <View style={$section}>
        <TouchableOpacity style={$row} onPress={handleChangePassword}>
          <Text style={{ color: theme.colors.text }} text="Change password" />
          <Text style={{ color: theme.colors.textDim }} text="Email link" />
        </TouchableOpacity>
        {Platform.OS !== "web" && (
          <TouchableOpacity
            style={$row}
            onPress={() => navigation.navigate("BiometricSetup")}
          >
            <Text style={{ color: theme.colors.text }} text="Biometric login" />
            <Text style={{ color: theme.colors.textDim }} text="Set up" />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications (local, v1) */}
      <Text preset="subheading" text="Notifications" style={$sectionTitle} />
      <View style={$section}>
        <Switch
          label="Order updates"
          value={notifPrefs.orderUpdates}
          onValueChange={(v) => updateNotifPref("orderUpdates", v)}
          containerStyle={$switchRow}
        />
        <Switch
          label="Appointments"
          value={notifPrefs.appointments}
          onValueChange={(v) => updateNotifPref("appointments", v)}
          containerStyle={$switchRow}
        />
        <Switch
          label="Payments"
          value={notifPrefs.payments}
          onValueChange={(v) => updateNotifPref("payments", v)}
          containerStyle={$switchRow}
        />
      </View>

      {/* About */}
      <Text preset="subheading" text="About" style={$sectionTitle} />
      <View style={$section}>
        <View style={$row}>
          <Text style={{ color: theme.colors.text }} text="Version" />
          <Text style={{ color: theme.colors.textDim }} text={appVersion} />
        </View>
        <View style={$row}>
          <Text style={{ color: theme.colors.text }} text="Stitch & Wear Tailors" />
        </View>
      </View>

      <Button text="Sign Out" preset="reversed" onPress={handleSignOut} style={$signOutButton} />
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $heading: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $sectionTitle: TextStyle = {
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
}

const $profileRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $avatar: ImageStyle = {
  width: 56,
  height: 56,
  borderRadius: 28,
}

const $avatarPlaceholder: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
}

const $avatarInitial: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: "#FFFFFF",
}

const $profileMeta: ViewStyle = {
  marginLeft: spacing.sm,
  flex: 1,
}

const $roleText: TextStyle = {
  fontSize: 12,
  marginTop: 2,
}

const $field: ViewStyle = {
  marginBottom: spacing.sm,
}

const $fieldLabel: TextStyle = {
  marginBottom: spacing.xs,
}

const $languageChips: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
}

const $chip: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
}

const $chipText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $hint: TextStyle = {
  fontSize: 12,
  marginTop: spacing.sm,
}

const $row: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.sm,
}

const $switchRow: ViewStyle = {
  paddingVertical: spacing.xs,
}

const $signOutButton: ViewStyle = {
  marginHorizontal: spacing.md,
  marginTop: spacing.sm,
  marginBottom: spacing.xl,
}
