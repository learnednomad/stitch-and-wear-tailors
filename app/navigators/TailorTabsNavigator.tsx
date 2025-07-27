import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CompositeScreenProps } from "@react-navigation/native"
import { TextStyle, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/components"
import { translate } from "@/i18n"
import { SettingsScreen } from "@/screens"
import type { ThemedStyle } from "@/theme"
import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"
import { useAppTheme } from "@/utils/useAppTheme"
import { TailorScreen } from "@/screens/tailor-screens/TailorScreen"
import { TailorOrderScreen } from "@/screens/tailor-screens/orders/TailorOrderScreen"
import { AnalyticsScreen } from "@/screens/tailor-screens/analytics/AnalyticsScreen"
import { MeasurementScreen } from "@/screens/tailor-screens/measurements/MeasurementScreen"

export type TailorTabParamList = {
  TailorHome: undefined
  TailorOrders: { queryIndex?: string; itemIndex?: string }
  Measurements: undefined
  Analytics: undefined
  Settings: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type TailorTabScreenProps<T extends keyof TailorTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TailorTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

const Tab = createBottomTabNavigator<TailorTabParamList>()

/**
 * This is the main navigator for tailor screens with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `TailorTabNavigator`.
 */
export function TailorTabNavigator() {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
        tabBarActiveTintColor: "#000", // Black text
        tabBarInactiveTintColor: "#FFD700", // Yellow for inactive
        tabBarLabelStyle: themed($tabBarLabel),
        tabBarItemStyle: themed($tabBarItem),
      }}
    >
      <Tab.Screen
        name="TailorHome"
        component={TailorScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <Icon icon="home" color={focused ? colors.tint : "#000"} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="TailorOrders"
        component={TailorOrderScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ focused }) => (
            <Icon icon="sew" color={focused ? colors.tint : "#000"} size={35} />
          ),
        }}
      />
      <Tab.Screen
        name="Measurements"
        component={MeasurementScreen}
        options={{
          tabBarLabel: "Measurements",
          tabBarIcon: ({ focused }) => (
            <Icon icon="profile" color={focused ? colors.tint : "#000"} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: "Analytics",
          tabBarIcon: ({ focused }) => (
            <Icon icon="bell" color={focused ? colors.tint : "#000"} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused }) => (
            <Icon icon="settings" color={focused ? colors.tint : "#000"} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const $tabBar: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#FFF", // White background
  borderTopColor: "#000", // Black border
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  color: "#000", // Black text
})
