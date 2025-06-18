// import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
// import { CompositeScreenProps } from "@react-navigation/native"
// import { TextStyle, ViewStyle } from "react-native"
// import { useSafeAreaInsets } from "react-native-safe-area-context"
// import { Icon } from "@/components"
// import { translate } from "@/i18n"
// import { SettingsScreen, WelcomeScreen } from "@/screens"
// import type { ThemedStyle } from "@/theme"
// import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"
// import { useAppTheme } from "@/utils/useAppTheme"
// import { HomeScreen } from "@/screens/client-screens/HomeScreen"
// import { TailorScreen } from "@/screens/tailor-screens/TailorScreen"
// import { TailorOrderScreen } from "@/screens/tailor-screens/orders/TailorOrderScreen"
// import { InvoicesScreen } from "@/screens/tailor-screens/Invoicing/InvoicesScreen"
//
// export type TabParamListTailor = {
//   Home: undefined
//   Orders: { queryIndex?: string; itemIndex?: string }
//   Invoices: undefined
//   Settings: undefined
// }
//
// /**
//  * Helper for automatically generating navigation prop types for each route.
//  *
//  * More info: https://reactnavigation.org/docs/typescript/#organizing-types
//  */
//
// export type TabScreenProps<T extends keyof TabParamListTailor> = CompositeScreenProps<
//   BottomTabScreenProps<TabParamListTailor, T>,
//   AppStackScreenProps<keyof AppStackParamList>
// >
//
// const Tab = createBottomTabNavigator<TabParamListTailor>()
//
// /**
//  * This is the main navigator for the demo screens with a bottom tab bar.
//  * Each tab is a stack navigator with its own set of screens.
//  *
//  * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
//  * @returns {JSX.Element} The rendered `DemoNavigator`.
//  */
//
// export function TabNavigator() {
//   const { bottom } = useSafeAreaInsets()
//   const {
//     themed,
//     theme: { colors },
//   } = useAppTheme()
//
//   return (
//     <Tab.Navigator
//       screenOptions={{
//         headerShown: false,
//         tabBarHideOnKeyboard: true,
//         tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
//         tabBarActiveTintColor: "#000", // Black text
//         tabBarInactiveTintColor: "#FFD700", // Yellow for inactive
//         tabBarLabelStyle: themed($tabBarLabel),
//         tabBarItemStyle: themed($tabBarItem),
//       }}
//     >
//       <Tab.Screen
//         name="Home"
//         component={TailorScreen}
//         options={{
//           tabBarLabel: "Home",
//           tabBarIcon: ({ focused }) => (
//             <Icon icon="home" color={focused ? colors.tint : colors.tintInactive} size={25} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Orders"
//         component={TailorOrderScreen}
//         options={{
//           tabBarLabel: "Orders",
//           tabBarIcon: ({ focused }) => (
//             <Icon icon="plane" color={focused ? colors.tint : colors.tintInactive} size={25} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Invoices"
//         component={InvoicesScreen}
//         options={{
//           tabBarLabel: "Invoice",
//           tabBarIcon: ({ focused }) => (
//             <Icon icon="tour" color={focused ? colors.tint : colors.tintInactive} size={25} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Settings"
//         component={SettingsScreen}
//         options={{
//           tabBarLabel: "Settings",
//           tabBarIcon: ({ focused }) => (
//             <Icon icon="gear" color={focused ? colors.tint : colors.tintInactive} size={25} />
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   )
// }
//
// const $tabBar: ThemedStyle<ViewStyle> = () => ({
//   backgroundColor: "#000", // White background
//   borderTopColor: "#FFF", // Black border
// })
//
// const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
//   paddingTop: spacing.md,
// })
//
// const $tabBarLabel: ThemedStyle<TextStyle> = ({ typography }) => ({
//   fontSize: 12,
//   fontFamily: typography.primary.medium,
//   lineHeight: 16,
//   color: "#FFF", // Black text
// })
