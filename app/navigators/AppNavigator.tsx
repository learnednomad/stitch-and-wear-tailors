/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import {
  NavigationContainer,
  NavigatorScreenParams,
  LinkingOptions,
} from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import * as Screens from "@/screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { registerSentryNavigationContainer } from "@/utils/sentry"
import { useAppTheme, useThemeProvider } from "@/utils/useAppTheme"
import { Component, ComponentProps } from "react"
import { TabNavigator, TabParamList } from "@/navigators/ClientTabsNavigator"
import { TailorTabNavigator, TailorTabParamList } from "@/navigators/TailorTabsNavigator"
import { useAuth } from "@/contexts/AuthContext"
import { Text, View } from "react-native"
import * as Linking from "expo-linking"
import * as storage from "@/utils/storage"

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
  TailorTab: NavigatorScreenParams<TailorTabParamList>
  ClientTab: NavigatorScreenParams<TabParamList>

  // 🔥 Your screens go here
  SignIn: undefined
  SignUp: undefined
  Home: undefined
  Orders: undefined
  OrderDetail: { orderId: string }
  NewOrder: { reorderStyleId?: string; reorderFabricId?: string } | undefined
  Measurement: { styleId?: string; fabricId?: string; amount?: number }
  OrderHistory: undefined
  OrderTracking: { orderId: string }
  OrderChat: { orderId: string }
  Payment: {
    orderId: string
    amount: number
    orderDetails: { measurementName: string; status: string; dueDate: string }
  }
  Tailor: undefined
  TailorOrder: undefined
  TailorMeasurement: undefined
  AddMeasurement: undefined
  EditMeasurement: { measurementId?: string; mode?: "view" | "edit" } | undefined
  DeleteMeasurement: { measurementId?: string } | undefined
  Invoices: undefined
  InvoiceDetail: { invoiceId: string }
  CreateInvoice: undefined
  FabricSearch: undefined
  BookFitting: undefined
  Marketplace: undefined
  ProductDetail: { productId: string }
  Cart: undefined
  Checkout: undefined
  MyPurchases: undefined
  ManageProducts: undefined
  Styles: undefined
  Catalog: undefined
  Settings: undefined
  Analytics: undefined
  Onboarding: undefined
  VerifyOtp: undefined
  VerifyEmail: undefined
  ClientNotifications: undefined
  TailorNotifications: undefined
  // Enhanced Authentication Screens
  TwoFactorSetup: undefined
  BiometricSetup: undefined
  SocialLinking: undefined
  SecuritySettings: undefined
  ForgotPassword: undefined
  ResetPassword: { userId: string; secret: string }
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

const AppStack = function AppStack() {
  const {
    theme: { colors },
  } = useAppTheme()
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text>Loading...</Text>
      </View>
    )
  }

  // Determine initial route based on authentication status
  const getInitialRouteName = () => {
    if (!isAuthenticated) {
      // first launch: show the onboarding carousel once (the screen writes
      // the "onboarding.seen" flag when completed or skipped)
      if (!storage.loadString("onboarding.seen")) {
        return "Onboarding"
      }
      return "SignIn"
    }

    // Navigate based on user role
    if (user?.role === "tailor") {
      return "TailorTab"
    }

    return "ClientTab"
  }

  return (
    <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
          navigationBarColor: colors.background,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/* Authentication Screens - Always available */}
        <Stack.Screen name="SignIn" component={Screens.SignInScreen} />
        <Stack.Screen name="SignUp" component={Screens.SignUpScreen} />
        <Stack.Screen name="VerifyEmail" component={Screens.VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={Screens.ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={Screens.ResetPasswordScreen} />
        <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />

        {/* Protected Screens - Only available when authenticated */}
        {isAuthenticated && (
          <>
            <Stack.Screen name="ClientTab" component={TabNavigator} />
            <Stack.Screen name="TailorTab" component={TailorTabNavigator} />
          </>
        )}
        {/* Modal/Overlay Screens - Available when authenticated */}
        {isAuthenticated && (
          <>
            <Stack.Screen name="Home" component={Screens.HomeScreen} />
            <Stack.Screen name="Orders" component={Screens.OrdersScreen as any} />
            <Stack.Screen name="OrderDetail" component={Screens.OrderDetailScreen} />
            <Stack.Screen name="NewOrder" component={Screens.NewOrderScreen} />
            <Stack.Screen name="Measurement" component={Screens.MeasurementScreen} />
            <Stack.Screen name="OrderHistory" component={Screens.OrderHistoryScreen} />
            <Stack.Screen name="OrderTracking" component={Screens.OrderTrackingScreen} />
            <Stack.Screen name="OrderChat" component={Screens.OrderChatScreen} />
            <Stack.Screen name="Payment" component={Screens.PaymentScreen as any} />
            <Stack.Screen name="Tailor" component={Screens.TailorScreen} />
            <Stack.Screen name="TailorOrder" component={Screens.TailorOrderScreen} />
            <Stack.Screen name="TailorMeasurement" component={Screens.TailorMeasurementScreen} />
            <Stack.Screen name="AddMeasurement" component={Screens.AddMeasurementScreen} />
            <Stack.Screen name="EditMeasurement" component={Screens.EditMeasurementScreen} />
            <Stack.Screen name="DeleteMeasurement" component={Screens.DeleteMeasurementScreen} />
            <Stack.Screen name="Invoices" component={Screens.InvoicesScreen} />
            <Stack.Screen name="InvoiceDetail" component={Screens.InvoiceDetailScreen} />
            <Stack.Screen name="CreateInvoice" component={Screens.CreateInvoiceScreen} />
            <Stack.Screen name="FabricSearch" component={Screens.FabricSearchScreen} />
            <Stack.Screen name="Marketplace" component={Screens.MarketplaceScreen} />
            <Stack.Screen name="ProductDetail" component={Screens.ProductDetailScreen} />
            <Stack.Screen name="Cart" component={Screens.CartScreen} />
            <Stack.Screen name="Checkout" component={Screens.CheckoutScreen} />
            <Stack.Screen name="MyPurchases" component={Screens.MyPurchasesScreen} />
            <Stack.Screen name="ManageProducts" component={Screens.ManageProductsScreen} />
            <Stack.Screen name="BookFitting" component={Screens.BookFittingScreen} />
            <Stack.Screen name="Styles" component={Screens.StylesScreen} />
            <Stack.Screen name="Catalog" component={Screens.CatalogScreen} />
            <Stack.Screen name="Settings" component={Screens.SettingsScreen} />
            <Stack.Screen name="Analytics" component={Screens.AnalyticsScreen} />
            <Stack.Screen name="VerifyOtp" component={Screens.VerifyOtpScreen} />
            <Stack.Screen
              name="ClientNotifications"
              component={Screens.ClientNotificationsScreen}
            />
            <Stack.Screen
              name="TailorNotifications"
              component={Screens.TailorNotificationsScreen}
            />
          </>
        )}
        {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
      </Stack.Navigator>
  )
}

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

// Deep linking configuration
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [Linking.createURL("/"), "stitchandwear://", "https://stitchandwear.com"],
  config: {
    screens: {
      ResetPassword: {
        path: "reset-password",
        parse: {
          userId: (userId: string) => userId,
          secret: (secret: string) => secret,
        },
      },
      // Add other deep link configurations here
    },
  },
}

export const AppNavigator = function AppNavigator(props: NavigationProps) {
  const { themeScheme, navigationTheme, setThemeContextOverride, ThemeProvider } =
    useThemeProvider()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        linking={linking}
        onReady={() => registerSentryNavigationContainer(navigationRef)}
        {...props}
      >
        <Screens.ErrorBoundary catchErrors={Config.catchErrors}>
          <AppStack />
        </Screens.ErrorBoundary>
      </NavigationContainer>
    </ThemeProvider>
  )
}
