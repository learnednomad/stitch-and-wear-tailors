/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import * as Screens from "@/screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { useAppTheme, useThemeProvider } from "@/utils/useAppTheme"
import { Component, ComponentProps } from "react"
import { TabNavigator, TabParamList } from "@/navigators/ClientTabsNavigator"
// import { TabParamListTailor } from "@/navigators/TailorTabsNavigator"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  Welcome: undefined
  // TailorTab: NavigatorScreenParams<TabParamListTailor>
  ClientTab: NavigatorScreenParams<TabParamList>

  // 🔥 Your screens go here
  SignIn: undefined
  SignUp: undefined
  Home: undefined
  Orders: undefined
  Order: undefined
  OrderHistory: undefined
  OrderTracking: undefined
  Payment: undefined
  Tailor: undefined
  TailorOrder: undefined
  Measurment: undefined
  AddMeasurment: undefined
  EditMeasurment: undefined
  DeleteMeasurment: undefined
  Invoices: undefined
  FabricSearch: undefined
  BookFitting: undefined
  Styles: undefined
  Catalog: undefined
  Settings: undefined
  Analytics: undefined
  Onboarding: undefined
  VerifyOtp: undefined
  VerifyEmail: undefined
  ClientNotifications: undefined
  TailorNotifications: undefined
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = observer(function AppStack() {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="ClientTab" component={TabNavigator} />
      {/** 🔥 Your screens go here */}
      <Stack.Screen name="SignIn" component={Screens.SignInScreen} />
      <Stack.Screen name="SignUp" component={Screens.SignUpScreen} />
      <Stack.Screen name="Home" component={Screens.HomeScreen} />
      <Stack.Screen name="Orders" component={Screens.OrdersScreen} />
      <Stack.Screen name="OrderHistory" component={Screens.OrderHistoryScreen} />
      <Stack.Screen name="OrderTracking" component={Screens.OrderTrackingScreen} />
      <Stack.Screen name="Payment" component={Screens.PaymentScreen} />
      <Stack.Screen name="Tailor" component={Screens.TailorScreen} />
      <Stack.Screen name="TailorOrder" component={Screens.TailorOrderScreen} />
      <Stack.Screen name="Measurment" component={Screens.MeasurmentScreen} />
      <Stack.Screen name="AddMeasurment" component={Screens.AddMeasurmentScreen} />
      <Stack.Screen name="EditMeasurment" component={Screens.EditMeasurmentScreen} />
      <Stack.Screen name="DeleteMeasurment" component={Screens.DeleteMeasurmentScreen} />
      <Stack.Screen name="Invoices" component={Screens.InvoicesScreen} />
      <Stack.Screen name="FabricSearch" component={Screens.FabricSearchScreen} />
      <Stack.Screen name="BookFitting" component={Screens.BookFittingScreen} />
      <Stack.Screen name="Styles" component={Screens.StylesScreen} />
      <Stack.Screen name="Catalog" component={Screens.CatalogScreen} />
      <Stack.Screen name="Settings" component={Screens.SettingsScreen} />
      <Stack.Screen name="Analytics" component={Screens.AnalyticsScreen} />
      <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />
      <Stack.Screen name="VerifyOtp" component={Screens.VerifyOtpScreen} />
      <Stack.Screen name="VerifyEmail" component={Screens.VerifyEmailScreen} />
      <Stack.Screen name="ClientNotifications" component={Screens.ClientNotificationsScreen} />
      <Stack.Screen name="TailorNotifications" component={Screens.TailorNotificationsScreen} />
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
})

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const { themeScheme, navigationTheme, setThemeContextOverride, ThemeProvider } =
    useThemeProvider()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
        <Screens.ErrorBoundary catchErrors={Config.catchErrors}>
          <AppStack />
        </Screens.ErrorBoundary>
      </NavigationContainer>
    </ThemeProvider>
  )
})
