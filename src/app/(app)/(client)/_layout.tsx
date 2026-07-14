import { Redirect, Tabs } from "expo-router"
import { TextStyle, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Icon } from "@/components"
import { useAuth } from "@/contexts/AuthContext"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

/**
 * Client bottom-tab bar (re-implements ClientTabsNavigator). Redirects tailors
 * to their dashboard so the client tabs never mount for the wrong role.
 */
export default function ClientTabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/sign-in" />
  if (user?.role === "tailor") return <Redirect href="/dashboard" />

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
        name="home"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Icon icon="home" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => <Icon icon="sew" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          tabBarLabel: "Browse",
          tabBarIcon: ({ color }) => <Icon icon="view" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          tabBarLabel: "Pay",
          tabBarIcon: ({ color }) => <Icon icon="coins" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
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
