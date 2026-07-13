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
import { HomeScreen } from "@/screens/client-screens/HomeScreen"
import { OrdersScreen } from "@/screens/client-screens/orders/OrdersScreen"
import { PaymentScreen } from "@/screens/client-screens/orders/PaymentScreen"
import { CatalogScreen } from "@/screens/client-screens/CatalogScreen"
import { MarketplaceScreen } from "@/screens/client-screens/marketplace/MarketplaceScreen"

export type TabParamList = {
  Home: undefined
  Orders: { queryIndex?: string; itemIndex?: string }
  Browse: undefined
  Shop: undefined
  Pay: undefined
  Settings: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

const Tab = createBottomTabNavigator<TabParamList>()

/**
 * This is the main navigator for the demo screens with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `DemoNavigator`.
 */

export function TabNavigator() {
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Icon icon="home" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => <Icon icon="sew" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Browse"
        component={CatalogScreen as any}
        options={{
          tabBarLabel: "Browse",
          tabBarIcon: ({ color }) => <Icon icon="view" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={MarketplaceScreen as any}
        options={{
          tabBarLabel: "Shop",
          tabBarIcon: ({ color }) => <Icon icon="money" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Pay"
        component={PaymentScreen}
        options={{
          tabBarLabel: "Pay",
          tabBarIcon: ({ color }) => <Icon icon="coins" color={color} size={24} />,
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
