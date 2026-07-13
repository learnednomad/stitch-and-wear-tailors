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
import { TailorMeasurementScreen } from "@/screens/tailor-screens/measurements/MeasurementScreen"
import { ManageProductsScreen } from "@/screens/tailor-screens/marketplace/ManageProductsScreen"

export type TailorTabParamList = {
  TailorHome: undefined
  TailorOrders: { queryIndex?: string; itemIndex?: string }
  Products: undefined
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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.palette.gray500,
        tabBarLabelStyle: themed($tabBarLabel),
        tabBarItemStyle: themed($tabBarItem),
      }}
    >
      <Tab.Screen
        name="TailorHome"
        component={TailorScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => <Icon icon="home" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="TailorOrders"
        component={TailorOrderScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => <Icon icon="sew" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ManageProductsScreen as any}
        options={{
          tabBarLabel: "Products",
          tabBarIcon: ({ color }) => <Icon icon="coins" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Measurements"
        component={TailorMeasurementScreen as any}
        options={{
          tabBarLabel: "Measure",
          tabBarIcon: ({ color }) => <Icon icon="profile" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: "Analytics",
          tabBarIcon: ({ color }) => <Icon icon="menu" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color }) => <Icon icon="settings" color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
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
