import { Redirect, Tabs } from "expo-router"
import { TextStyle, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Icon } from "@/components"
import { useAuth } from "@/contexts/AuthContext"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

/**
 * Tailor bottom-tab bar (re-implements TailorTabsNavigator). Redirects clients
 * to their home so the tailor tabs never mount for the wrong role.
 */
export default function TailorTabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/sign-in" />
  if (user?.role !== "tailor") return <Redirect href="/home" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.palette.gray500,
        tabBarLabelStyle: themed($tabBarLabel),
        tabBarItemStyle: themed($tabBarItem),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => <Icon icon="home" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="tailor-orders"
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => <Icon icon="sew" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="measurements"
        options={{
          tabBarLabel: "Measure",
          tabBarIcon: ({ color }) => <Icon icon="profile" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarLabel: "Analytics",
          tabBarIcon: ({ color }) => <Icon icon="menu" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="tailor-settings"
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color }) => <Icon icon="settings" color={color} size={24} />,
        }}
      />
    </Tabs>
  )
}

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderTopColor: colors.border,
  borderTopWidth: 1,
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xs,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 11,
  fontFamily: typography.primary.medium,
  lineHeight: 15,
})
