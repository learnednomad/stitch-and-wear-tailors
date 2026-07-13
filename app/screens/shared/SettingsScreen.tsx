/**
 * SettingsScreen (shared)
 *
 * Routed from both the client and tailor tab navigators. Sections:
 * Profile (edit name/phone), Preferences (language), Security (password
 * reset email, biometric setup), Notifications (local switches persisted
 * to storage) and About, plus Sign Out.
 */
import { FC, useState } from "react"
import { Alert, Image, Platform, TouchableOpacity, View, ViewStyle } from "react-native"
import i18next from "i18next"
import Constants from "expo-constants"
import { AppStackScreenProps } from "@/navigators"
import { Button, Screen, Switch, Text, TextField } from "@/components"
import { useAuthStore } from "@/state/authStore"
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

// Card section: solid neutral100 surface with a dark twin (mirrors the previous
// theme.colors.palette.neutral100 lookup). Used by every section on the screen.
const $sectionClass = "mx-4 mb-4 rounded-xl bg-neutral100 p-4 dark:bg-neutral100-dark"
const $sectionTitleClass = "mb-2 mt-3 px-4"

export const SettingsScreen: FC<SettingsScreenProps> = function SettingsScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const authStore = useAuthStore()
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

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <Text preset="heading" text="Settings" className="px-4 pt-4" />

      {/* Profile */}
      <Text preset="subheading" text="Profile" className={$sectionTitleClass} />
      <View className={$sectionClass}>
        <View className="mb-3 flex-row items-center">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="h-14 w-14 rounded-full" />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-tint dark:bg-tint-dark">
              <Text
                className="text-[24px]"
                weight="bold"
                style={{ color: "#FFFFFF" }}
                text={(firstName || "U").charAt(0).toUpperCase()}
              />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-text dark:text-text-dark" text={user?.email ?? ""} />
            <Text
              className="mt-0.5 text-[12px] text-textDim dark:text-textDim-dark"
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
      <Text preset="subheading" text="Preferences" className={$sectionTitleClass} />
      <View className={$sectionClass}>
        <Text preset="formLabel" text="Language" className="mb-2" />
        <View className="flex-row flex-wrap gap-2">
          {LANGUAGES.map((option) => {
            const active = language === option.tag
            return (
              <TouchableOpacity
                key={option.tag}
                className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
                style={{ backgroundColor: active ? theme.colors.tint : theme.colors.background }}
                onPress={() => handleLanguage(option.tag)}
              >
                <Text
                  className="text-[13px]"
                  weight="semiBold"
                  style={{ color: active ? theme.colors.palette.neutral100 : theme.colors.text }}
                  text={option.label}
                />
              </TouchableOpacity>
            )
          })}
        </View>
        <Text
          className="mt-3 text-[12px] text-textDim dark:text-textDim-dark"
          text={`Theme follows your system setting (${theme.isDark ? "dark" : "light"} right now).`}
        />
      </View>

      {/* Security */}
      <Text preset="subheading" text="Security" className={$sectionTitleClass} />
      <View className={$sectionClass}>
        <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={handleChangePassword}>
          <Text className="text-text dark:text-text-dark" text="Change password" />
          <Text className="text-textDim dark:text-textDim-dark" text="Email link" />
        </TouchableOpacity>
        {Platform.OS !== "web" && (
          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => navigation.navigate("BiometricSetup")}
          >
            <Text className="text-text dark:text-text-dark" text="Biometric login" />
            <Text className="text-textDim dark:text-textDim-dark" text="Set up" />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications (local, v1) */}
      <Text preset="subheading" text="Notifications" className={$sectionTitleClass} />
      <View className={$sectionClass}>
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
      <Text preset="subheading" text="About" className={$sectionTitleClass} />
      <View className={$sectionClass}>
        <View className="flex-row items-center justify-between py-3">
          <Text className="text-text dark:text-text-dark" text="Version" />
          <Text className="text-textDim dark:text-textDim-dark" text={appVersion} />
        </View>
        <View className="flex-row items-center justify-between py-3">
          <Text className="text-text dark:text-text-dark" text="Stitch & Wear Tailors" />
        </View>
      </View>

      <Button text="Sign Out" preset="reversed" onPress={handleSignOut} style={$signOutButton} />
    </Screen>
  )
}

// Screen `style` prop stays an inline style object (Screen owns its own layout).
const $root: ViewStyle = {
  flex: 1,
}

// Component style-prop overrides (TextField/Switch containerStyle, Button style)
// stay inline per the recipe.
const $field: ViewStyle = {
  marginBottom: spacing.sm,
}

const $switchRow: ViewStyle = {
  paddingVertical: spacing.xs,
}

const $signOutButton: ViewStyle = {
  marginHorizontal: spacing.md,
  marginTop: spacing.sm,
  marginBottom: spacing.xl,
}
