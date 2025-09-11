import React, { FC, useEffect, useState, useCallback } from "react"
import {
  View,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
  RefreshControl,
} from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, AutoImage, Text, ThemeToggle, IconTypes } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "app/utils/useAppTheme"
import { colors, spacing } from "app/theme"
import { useStores } from "app/models"
import { useNavigation } from "@react-navigation/native"

interface ClientPortalScreenProps extends AppStackScreenProps<"Home"> {}

const getGreeting = () => {
  const currentHour = new Date().getHours()
  return currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"
}

export const HomeScreen: FC<ClientPortalScreenProps> = observer(() => {
  const { theme } = useAppTheme()
  const navigation = useNavigation()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [greeting] = React.useState(getGreeting())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get stores
  const {
    authStore,
    userStore,
    orderStore,
    measurementStore,
    appointmentStore,
    notificationStore,
  } = useStores()

  // Get user data from stores
  const currentUser = authStore.user
  const userProfile = currentUser?.profile
  const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Welcome User"
  const userAvatar = userProfile?.avatar

  // Default empty states if no user is logged in
  const defaultStats = {
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    revenue: 0,
    averageOrderValue: 0,
    lastUpdated: null,
  }

  // Get statistics from stores with fallbacks
  const orderStats = orderStore.statistics || defaultStats
  const notificationStats = notificationStore.statistics || {}
  const unreadNotifications = notificationStore.unreadCount || 0

  // Get recent data with safe access
  const recentOrders = (orderStore?.orders?.items || []).slice(0, 3) // Get first 3 orders
  const recentMeasurements = (measurementStore?.measurements?.items || []).slice(0, 3) // Get first 3 measurements
  const upcomingAppointments = (appointmentStore?.upcomingAppointments || []).slice(0, 2) // Get next 2 appointments

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!currentUser?.id) return

    try {
      // Load data from all relevant stores - for now just log, actual API calls will be implemented later
      console.log("Loading dashboard data for user:", currentUser.id)
      // TODO: Implement actual API calls when backend is ready
      // await Promise.all([
      //   orderStore.loadNigerianOrders(currentUser.id),
      //   measurementStore.loadUserMeasurements(currentUser.id),
      //   appointmentStore.loadUserAppointments(currentUser.id),
      //   notificationStore.loadUnreadNotifications(currentUser.id),
      // ])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }, [currentUser?.id])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }, [loadDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
      case "ready":
        return theme.colors.palette.success600 || colors.palette.sageGreen
      case "in_progress":
      case "confirmed":
        return theme.colors.palette.primary500 || colors.palette.threadBlue
      case "pending":
        return theme.colors.palette.warning600 || colors.palette.tailorGold
      case "cancelled":
        return theme.colors.palette.alertRed
      default:
        return theme.colors.palette.neutral600
    }
  }

  // Helper function to format Nigerian currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const renderQuickAction = ({
    item,
  }: {
    item: { title: string; subtitle: string; icon: IconTypes; onPress: () => void }
  }) => (
    <TouchableOpacity
      style={$quickActionCard}
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
      accessibilityRole="button"
    >
      <View style={$quickActionIconContainer}>
        <Icon icon={item.icon} size={20} color={theme.colors.palette.primary600} />
      </View>
      <Text style={$quickActionTitle} text={item.title} />
      <Text style={$quickActionSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  )

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={$orderCard}
      onPress={() => console.log(`Navigate to Order Tracking: ${item.id}`)}
      accessible
      accessibilityLabel={`Order: ${item.orderNumber}`}
      accessibilityRole="button"
    >
      <View style={$orderHeader}>
        <Text style={$orderId}>#{item.orderNumber}</Text>
        <View style={[$statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[$statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={$orderTitle}>
        {item.items?.[0]?.garmentType
          ? (orderStore.getTranslation
              ? orderStore.getTranslation("garments", item.items[0].garmentType)
              : item.items[0].garmentType) || item.items[0].garmentType
          : "Custom Order"}
      </Text>
      <Text style={$orderText}>
        Due: {item.estimatedDeliveryDate ? formatDate(item.estimatedDeliveryDate) : "TBD"}
      </Text>
      <Text style={$orderText}>Total: {formatCurrency(item.pricing?.totalPrice || 0)}</Text>
    </TouchableOpacity>
  )

  const quickActions = [
    {
      title: "Add Measurement",
      subtitle: "Submit new sizes",
      icon: "profile" as const,
      onPress: () => navigation.navigate("MeasurementCapture" as never),
    },
    {
      title: "Browse Fabrics",
      subtitle: "Choose materials",
      icon: "view" as const,
      onPress: () => navigation.navigate("FabricCatalog" as never),
    },
    {
      title: "Track Orders",
      subtitle: "View progress",
      icon: "sew" as const,
      onPress: () => navigation.navigate("Orders" as never),
    },
    {
      title: "Give Feedback",
      subtitle: "Share thoughts",
      icon: "feedback" as const,
      onPress: () => navigation.navigate("Feedback" as never),
    },
  ]

  return (
    <Screen
      backgroundColor={theme.colors.background}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle={theme.isDark ? "light" : "dark"}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.palette.primary500 || colors.palette.threadBlue}
        />
      }
    >
      <View style={$container}>
        {/* Modern Header with Gradient Background */}
        <View style={$header}>
          <View style={$headerGradient}>
            <View style={$profileContainer}>
              <TouchableOpacity
                style={$profileImage}
                onPress={() => navigation.navigate("Profile" as never)}
                accessible
                accessibilityLabel="Profile"
              >
                <AutoImage
                  source={require("../../../assets/images/stock/camera-1846696_1280.jpg")}
                  style={$image}
                />
                <View style={$profileImageOverlay} />
              </TouchableOpacity>
              <View style={$stats}>
                <Text style={$greetingText} accessibilityLabel={greeting}>
                  {greeting},
                </Text>
                <Text style={$nameText} accessibilityLabel="Client Name">
                  {userName}
                </Text>
                <View style={$statusIndicator}>
                  <View style={$onlineStatusDot} />
                  <Text style={$statusText}>Online</Text>
                </View>
              </View>
              <View style={$headerActions}>
                <TouchableOpacity style={$modernButton}>
                  <ThemeToggle size={22} style={$themeToggle} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={$modernNotificationButton}
                  onPress={() => navigation.navigate("Notifications" as never)}
                  accessible
                  accessibilityLabel="Notifications"
                >
                  <Icon icon="bell" size={22} color={theme.colors.palette.neutral100} />
                  {unreadNotifications > 0 && (
                    <View style={$modernNotificationBadge}>
                      <Text style={$notificationBadgeText}>
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Glass Morphism Welcome Card */}
        <View style={$welcomeCard}>
          <View style={$welcomeCardGradient}>
            <Text style={$welcomeTitle}>Kaabo! Welcome Back!</Text>
            <Text style={$welcomeSubtitle}>
              Your luxury garments are being crafted with excellence
            </Text>
            <View style={$welcomeMetrics}>
              <View style={$metricItem}>
                <Text style={$metricNumber}>{orderStats?.inProgressOrders || 0}</Text>
                <Text style={$metricLabel}>Active Orders</Text>
              </View>
              <View style={$metricDivider} />
              <View style={$metricItem}>
                <Text style={$metricNumber}>{orderStats?.completedOrders || 0}</Text>
                <Text style={$metricLabel}>Completed</Text>
              </View>
              <View style={$metricDivider} />
              <View style={$metricItem}>
                <Text style={$metricNumber}>{orderStats?.totalOrders || 0}</Text>
                <Text style={$metricLabel}>Total Orders</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Offline Indicator (Placeholder) */}
        <View style={$offlineBanner}>
          <Text style={$offlineText} accessibilityLabel="Offline mode">
            Offline Mode: Actions will sync when online
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={$section}>
          <View style={$sectionHeader}>
            <Text style={$sectionTitle}>Quick Actions</Text>
          </View>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.title}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={110}
            decelerationRate="fast"
            contentContainerStyle={$quickActionListContent}
            accessibilityLabel="Quick Actions List"
          />
        </View>

        {/* Recent Orders */}
        <View style={$section}>
          <View style={$sectionHeader}>
            <Text style={$sectionTitle}>Recent Orders</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Orders" as never)}
              accessible
              accessibilityLabel="View all orders"
            >
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={200}
            decelerationRate="fast"
            contentContainerStyle={$orderListContent}
            accessibilityLabel="Recent Orders List"
          />
        </View>

        {/* Recent Measurements */}
        <View style={$section}>
          <View style={$sectionHeader}>
            <Text style={$sectionTitle}>Recent Measurements</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("MeasurementList" as never)}
              accessible
              accessibilityLabel="View all measurements"
            >
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentMeasurements.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={$measurementCard}
              onPress={() => console.log(`Navigate to Measurement Details: ${item.id}`)}
              accessible
              accessibilityLabel={`Measurement: ${item.type || "Custom"}`}
              accessibilityRole="button"
            >
              <View style={$measurementHeader}>
                <View style={$measurementInfo}>
                  <Text style={$measurementTitle}>{item.type || "Custom Measurement"}</Text>
                  <Text style={$measurementCategory}>
                    {item.garmentType || "General"} • {item.status || "Active"}
                  </Text>
                </View>
                <Icon icon="caretRight" size={20} color={theme.colors.palette.neutral500} />
              </View>
              <View style={$measurementDetails}>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Chest</Text>
                  <Text style={$measurementValue}>{item.measurements?.chest || 0} cm</Text>
                </View>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Waist</Text>
                  <Text style={$measurementValue}>{item.measurements?.waist || 0} cm</Text>
                </View>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Length</Text>
                  <Text style={$measurementValue}>{item.measurements?.length || 0} cm</Text>
                </View>
              </View>
              <Text style={$measurementDate}>
                Measured on {item.createdAt ? formatDate(item.createdAt) : "Unknown"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Button */}
        <View style={[$bottomContainer, $bottomContainerInsets]}>
          <Button
            text="Add Measurement"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={() => navigation.navigate("MeasurementCapture" as never)}
            accessible
            accessibilityLabel="Add new measurement"
          />
        </View>
      </View>
    </Screen>
  )
})

// Styles

const $container: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  paddingBottom: spacing.lg,
}

const $headerGradient: ViewStyle = {
  background: "linear-gradient(135deg, #2B5D2F 0%, #1A4A1E 100%)",
  backgroundColor: "#2B5D2F",
  borderRadius: 24,
  padding: spacing.lg,
  shadowColor: "#1A4A1E",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
  elevation: 12,
}

const $profileContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
}

const $profileImage: ViewStyle = {
  width: 64,
  height: 64,
  borderRadius: 32,
  overflow: "hidden",
  borderWidth: 3,
  borderColor: colors.palette.neutral100,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $profileImageOverlay: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 32,
}

const $image: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $stats: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.md,
}

const $greetingText: TextStyle = {
  fontSize: 14,
  fontWeight: "400",
  color: colors.palette.neutral100,
  opacity: 0.9,
}

const $nameText: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.neutral100,
  marginTop: spacing.xxs,
  letterSpacing: 0.5,
}

const $statusIndicator: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.xs,
}

const $onlineStatusDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#4ADE80",
  marginRight: spacing.xs,
}

const $statusText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.neutral100,
  opacity: 0.8,
}

const $headerActions: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $modernButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(10px)",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
}

const $modernNotificationButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(10px)",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
}

const $themeToggle: ViewStyle = {
  // Theme toggle styling handled by modernButton
}

const $modernNotificationBadge: ViewStyle = {
  position: "absolute",
  top: -4,
  right: -4,
  backgroundColor: "#FF4757",
  borderRadius: 12,
  width: 20,
  height: 20,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
  borderWidth: 2,
  borderColor: colors.palette.neutral100,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4,
}

const $notificationBadgeText: TextStyle = {
  color: colors.palette.neutral100,
  fontSize: 10,
  fontWeight: "600",
}

const $welcomeCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginVertical: spacing.md,
  borderRadius: 24,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 12,
}

const $welcomeCardGradient: ViewStyle = {
  background: "linear-gradient(135deg, #2B5D2F 0%, #1A4A1E 100%)",
  backgroundColor: "#2B5D2F",
  padding: spacing.xl,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.1)",
}

const $welcomeTitle: TextStyle = {
  fontSize: 28,
  fontWeight: "800",
  color: colors.palette.neutral100,
  marginBottom: spacing.xs,
  letterSpacing: 0.8,
}

const $welcomeSubtitle: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  color: colors.palette.neutral100,
  opacity: 0.9,
  lineHeight: 22,
  marginBottom: spacing.lg,
}

const $welcomeMetrics: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 16,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  backdropFilter: "blur(10px)",
}

const $metricItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $metricNumber: TextStyle = {
  fontSize: 24,
  fontWeight: "800",
  color: colors.palette.neutral100,
  marginBottom: spacing.xxs,
}

const $metricLabel: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.neutral100,
  opacity: 0.8,
  textAlign: "center",
}

const $metricDivider: ViewStyle = {
  width: 1,
  height: 32,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  marginHorizontal: spacing.sm,
}

const $offlineBanner: ViewStyle = {
  backgroundColor: colors.palette.warning100,
  padding: spacing.sm,
  marginHorizontal: spacing.lg,
  marginBottom: spacing.sm,
  borderRadius: 8,
}

const $offlineText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral300,
  textAlign: "center",
}

const $section: ViewStyle = {
  marginBottom: spacing.xl,
}

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.sm,
}

const $sectionTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.neutral900,
  letterSpacing: 0.3,
}

const $viewAllText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.primary500,
}

const $quickActionListContent: ViewStyle = {
  paddingHorizontal: spacing.lg,
}

const $quickActionCard: ViewStyle = {
  width: 100,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.sm,
  alignItems: "center",
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.8)",
  transform: [{ scale: 1 }],
}

const $quickActionIconContainer: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#2B5D2F",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.sm,
  shadowColor: "#2B5D2F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 3,
}

const $quickActionTitle: TextStyle = {
  fontSize: 12,
  fontWeight: "700",
  color: colors.palette.neutral900,
  textAlign: "center",
  marginBottom: spacing.xxs,
  letterSpacing: 0.2,
}

const $quickActionSubtitle: TextStyle = {
  fontSize: 10,
  fontWeight: "400",
  color: colors.palette.neutral600,
  textAlign: "center",
  lineHeight: 14,
}

const $orderListContent: ViewStyle = {
  paddingHorizontal: spacing.lg,
}

const $orderCard: ViewStyle = {
  width: 220,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 20,
  padding: spacing.lg,
  marginRight: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 10,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.9)",
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $orderId: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral500,
  letterSpacing: 0.5,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
}
//
// const $statusText: TextStyle = {
//   fontSize: 11,
//   fontWeight: "700",
//   letterSpacing: 0.3,
// }

const $orderTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
  letterSpacing: 0.3,
}

const $orderText: TextStyle = {
  fontSize: 13,
  fontWeight: "500",
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
  lineHeight: 18,
}

const $measurementCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.lg,
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
}

const $measurementHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $measurementInfo: ViewStyle = {
  flex: 1,
}

const $measurementTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $measurementCategory: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
}

const $measurementDetails: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.xs,
}

const $measurementItem: ViewStyle = {
  alignItems: "center",
}

const $measurementLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $measurementValue: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $measurementDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginTop: spacing.xs,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $primaryButton: ViewStyle = {
  backgroundColor: "#2B5D2F",
  borderRadius: 16,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  shadowColor: "#1A4A1E",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 6,
}

const $primaryButtonText: TextStyle = {
  fontSize: 17,
  fontWeight: "700",
  color: colors.palette.neutral100,
  textAlign: "center",
  letterSpacing: 0.5,
}
