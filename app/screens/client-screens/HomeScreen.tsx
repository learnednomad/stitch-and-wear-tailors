import React, { FC } from "react"
import { View, FlatList, TouchableOpacity, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, AutoImage, Text, ThemeToggle, IconTypes } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "app/utils/useAppTheme"
import { colors, spacing } from "app/theme"

interface Measurement {
  id: string
  name: string
  chest: number
  waist: number
  length: number
  style: string
  dateCollected: string
  category: string
}

interface Order {
  id: string
  measurementName: string
  status:
    | "Measuring"
    | "Fabric Selection"
    | "Cutting"
    | "Sewing"
    | "Finishing"
    | "Ready"
    | "Delivered"
  dueDate: string
  paymentStatus: "Pending" | "Partial" | "Paid"
}

interface ClientPortalScreenProps extends AppStackScreenProps<"Home"> {}

const getGreeting = () => {
  const currentHour = new Date().getHours()
  return currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"
}

export const HomeScreen: FC<ClientPortalScreenProps> = observer(() => {
  const { theme } = useAppTheme()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [greeting] = React.useState(getGreeting())

  // Dummy data
  const measurements: Measurement[] = [
    {
      id: "1",
      name: "Summer Kaftan",
      chest: 100,
      waist: 80,
      length: 120,
      style: "plain_kaftan",
      dateCollected: "June 1, 2025",
      category: "Casual Wear",
    },
    {
      id: "2",
      name: "Wedding Agbada",
      chest: 110,
      waist: 90,
      length: 130,
      style: "agbada",
      dateCollected: "June 5, 2025",
      category: "Formal Wear",
    },
  ]

  const orders: Order[] = [
    {
      id: "TLR-2025-001",
      measurementName: "Summer Kaftan",
      status: "Sewing",
      dueDate: "June 10, 2025",
      paymentStatus: "Pending",
    },
    {
      id: "TLR-2025-002",
      measurementName: "Wedding Agbada",
      status: "Ready",
      dueDate: "June 15, 2025",
      paymentStatus: "Paid",
    },
  ]

  const unreadNotifications = 2

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
      case "Delivered":
        return theme.colors.palette.success500
      case "Sewing":
      case "Cutting":
      case "Finishing":
        return theme.colors.palette.primary500
      case "Measuring":
      case "Fabric Selection":
        return theme.colors.palette.warning500
      default:
        return theme.colors.palette.neutral600
    }
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
        <Icon icon={item.icon} size={24} color={theme.colors.palette.primary600} />
      </View>
      <Text style={$quickActionTitle} text={item.title} />
      <Text style={$quickActionSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  )

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={$orderCard}
      onPress={() => console.log(`Navigate to Order Tracking: ${item.id}`)}
      accessible
      accessibilityLabel={`Order: ${item.id}`}
      accessibilityRole="button"
    >
      <View style={$orderHeader}>
        <Text style={$orderId}>#{item.id}</Text>
        <View style={[$statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[$statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={$orderTitle}>{item.measurementName}</Text>
      <Text style={$orderText}>Due: {item.dueDate}</Text>
      <Text style={$orderText}>Payment: {item.paymentStatus}</Text>
    </TouchableOpacity>
  )

  const quickActions = [
    {
      title: "Add Measurement",
      subtitle: "Submit new sizes",
      icon: "check" as const,
      onPress: () => console.log("Navigate to Add Measurement"),
    },
    {
      title: "Browse Fabrics",
      subtitle: "Choose materials",
      icon: "view" as const,
      onPress: () => console.log("Navigate to FabricSearch"),
    },
    {
      title: "Track Orders",
      subtitle: "View progress",
      icon: "sew" as const,
      onPress: () => console.log("Navigate to OrderTracking"),
    },
    {
      title: "Give Feedback",
      subtitle: "Share thoughts",
      icon: "bell" as const,
      onPress: () => console.log("Navigate to Feedback"),
    },
  ]

  return (
    <Screen
      backgroundColor={theme.colors.background}
      safeAreaEdges={["top"]}
      preset="auto"
      statusBarStyle={theme.isDark ? "light" : "dark"}
    >
      <View style={$container}>
        {/* Header */}
        <View style={$header}>
          <View style={$profileContainer}>
            <TouchableOpacity
              style={$profileImage}
              onPress={() => console.log("Navigate to Profile")}
              accessible
              accessibilityLabel="Profile"
            >
              <AutoImage
                source={require("../../../assets/images/stock/camera-1846696_1280.jpg")}
                style={$image}
              />
            </TouchableOpacity>
            <View style={$stats}>
              <Text style={$greetingText} accessibilityLabel={greeting}>
                {greeting},
              </Text>
              <Text style={$nameText} accessibilityLabel="Client Name">
                Client Name
              </Text>
            </View>
            <View style={$headerActions}>
              <ThemeToggle size={25} style={$themeToggle} />
              <TouchableOpacity
                style={$notificationIcon}
                onPress={() => console.log("Navigate to Notifications")}
                accessible
                accessibilityLabel="Notifications"
              >
                <Icon icon="bell" size={25} color={theme.colors.palette.neutral800} />
                {unreadNotifications > 0 && (
                  <View style={$notificationBadge}>
                    <Text style={$notificationBadgeText}>
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Welcome Card */}
        <View style={$welcomeCard}>
          <Text style={$welcomeTitle}>Welcome Back!</Text>
          <Text style={$welcomeSubtitle}>{orders.length} active orders in progress</Text>
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
            snapToInterval={120}
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
              onPress={() => console.log("Navigate to OrderTracking")}
              accessible
              accessibilityLabel="View all orders"
            >
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={orders}
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
              onPress={() => console.log("Navigate to Measurement List")}
              accessible
              accessibilityLabel="View all measurements"
            >
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {measurements.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={$measurementCard}
              onPress={() => console.log(`Navigate to Measurement Details: ${item.id}`)}
              accessible
              accessibilityLabel={`Measurement: ${item.name}`}
              accessibilityRole="button"
            >
              <View style={$measurementHeader}>
                <View style={$measurementInfo}>
                  <Text style={$measurementTitle}>{item.name}</Text>
                  <Text style={$measurementCategory}>
                    {item.category} • {item.style}
                  </Text>
                </View>
                <Icon icon="caretRight" size={20} color={theme.colors.palette.neutral500} />
              </View>
              <View style={$measurementDetails}>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Chest</Text>
                  <Text style={$measurementValue}>{item.chest} cm</Text>
                </View>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Waist</Text>
                  <Text style={$measurementValue}>{item.waist} cm</Text>
                </View>
                <View style={$measurementItem}>
                  <Text style={$measurementLabel}>Length</Text>
                  <Text style={$measurementValue}>{item.length} cm</Text>
                </View>
              </View>
              <Text style={$measurementDate}>Measured on {item.dateCollected}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Button */}
        <View style={[$bottomContainer, $bottomContainerInsets]}>
          <Button
            text="Add Measurement"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={() => console.log("Navigate to Add Measurement")}
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
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
}

const $profileContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral100,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
}

const $profileImage: ViewStyle = {
  width: 56,
  height: 56,
  borderRadius: 28,
  overflow: "hidden",
  borderWidth: 3,
  borderColor: colors.palette.primary200,
}

const $image: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $stats: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.sm,
}

const $greetingText: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  color: colors.palette.neutral600,
}

const $nameText: TextStyle = {
  fontSize: 22,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $headerActions: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $themeToggle: ViewStyle = {
  marginRight: spacing.xs,
}

const $notificationIcon: ViewStyle = {
  padding: spacing.sm,
  marginRight: spacing.sm,
}

const $notificationBadge: ViewStyle = {
  position: "absolute",
  top: -5,
  right: -5,
  backgroundColor: colors.error,
  borderRadius: 10,
  width: 18,
  height: 18,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
}

const $notificationBadgeText: TextStyle = {
  color: colors.palette.neutral100,
  fontSize: 10,
  fontWeight: "600",
}

const $welcomeCard: ViewStyle = {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  backgroundColor: colors.palette.primary600,
  marginHorizontal: spacing.lg,
  marginVertical: spacing.md,
  padding: spacing.xl,
  borderRadius: 20,
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 8,
}

const $welcomeTitle: TextStyle = {
  fontSize: 22,
  fontWeight: "700",
  color: colors.palette.neutral100,
  marginBottom: spacing.sm,
  letterSpacing: 0.5,
}

const $welcomeSubtitle: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  color: colors.palette.neutral100,
  opacity: 0.95,
  lineHeight: 22,
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
  width: 110,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.md,
  alignItems: "center",
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 4,
}

const $quickActionIconContainer: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.palette.primary100,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.sm,
  shadowColor: colors.palette.primary500,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 2,
}

const $quickActionTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $quickActionSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  textAlign: "center",
}

const $orderListContent: ViewStyle = {
  paddingHorizontal: spacing.lg,
}

const $orderCard: ViewStyle = {
  width: 200,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 6,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $orderId: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral600,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $statusText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
}

const $orderTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $orderText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral700,
  marginBottom: spacing.xs,
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
  backgroundColor: colors.palette.primary600,
  borderRadius: 16,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  shadowColor: colors.palette.primary900,
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
