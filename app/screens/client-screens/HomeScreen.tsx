import React, { FC, useEffect, useState, useCallback } from "react"
import {
  View,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
} from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "@/navigators"
import {
  Button,
  Screen,
  Icon,
  Text,
  ThemeToggle,
  IconTypes,
  StatTile,
  SectionHeader,
  Chip,
  statusTone,
  statusLabel,
} from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import type { ThemedStyle } from "@/theme"
import { useStores } from "@/models"
import { useNavigation } from "@react-navigation/native"
import { appointmentApi, PBAppointment } from "@/services/api/appointment-api"

interface ClientPortalScreenProps extends AppStackScreenProps<"Home"> {}

const getGreeting = () => {
  const currentHour = new Date().getHours()
  return currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"
}

export const HomeScreen: FC<ClientPortalScreenProps> = observer(() => {
  const { theme, themed } = useAppTheme()
  const navigation = useNavigation()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [greeting] = React.useState(getGreeting())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nextAppointment, setNextAppointment] = useState<PBAppointment | null>(null)

  // Get stores
  const { authStore, orderStore, measurementStore, notificationStore } = useStores()

  // Get user data from stores
  const currentUser = authStore.user
  const userProfile = currentUser?.profile
  const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Welcome User"

  const unreadNotifications = notificationStore.unreadCount || 0

  // Real order data (loaded from PocketBase on mount)
  const myOrders = orderStore?.orders?.items || []
  const activeOrdersCount = myOrders.filter((order: any) =>
    ["pending", "confirmed", "in_progress", "ready"].includes(order.status),
  ).length
  const outstandingBalance = myOrders
    .filter((order: any) => order.status !== "cancelled")
    .reduce((sum: number, order: any) => sum + (order.pricing?.balanceAmount ?? 0), 0)

  // Get recent data with safe access
  const recentOrders = myOrders.slice(0, 3) // Get first 3 orders
  const recentMeasurements = (measurementStore?.measurements?.items || []).slice(0, 3) // Get first 3 measurements

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!currentUser?.id) return

    try {
      await Promise.all([
        // Own orders drive the stat tiles and the recent-orders rail
        orderStore
          .loadNigerianOrders({ customerId: currentUser.id, perPage: 50 }, true)
          .catch((error: unknown) => console.warn("Failed to load orders:", error)),
        // Next upcoming appointment
        appointmentApi.listUpcoming().then((result) => {
          if (result.success) {
            const upcoming = result.data.filter((a) => a.status !== "cancelled")
            setNextAppointment(upcoming[0] ?? null)
          }
        }),
        // Refresh notifications from PocketBase so the bell badge is live
        notificationStore.loadServerNotifications(),
      ])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }, [currentUser?.id])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }, [loadDashboardData])

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

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={themed($orderCard)}
      onPress={() => (navigation as any).navigate("OrderDetail", { orderId: item.id })}
      accessible
      accessibilityLabel={`Order: ${item.orderNumber}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={themed($orderHeader)}>
        <Text style={themed($orderId)} numberOfLines={1}>
          #{item.orderNumber}
        </Text>
        <Chip text={statusLabel(item.status)} tone={statusTone(item.status)} />
      </View>
      <Text weight="semiBold" style={themed($orderTitle)} numberOfLines={1}>
        {item.items?.[0]?.garmentType
          ? (orderStore.getTranslation
              ? orderStore.getTranslation("garments", item.items[0].garmentType)
              : item.items[0].garmentType) || item.items[0].garmentType
          : "Custom Order"}
      </Text>
      <Text style={themed($orderText)}>
        Due {item.estimatedDeliveryDate ? formatDate(item.estimatedDeliveryDate) : "TBD"}
      </Text>
      <Text weight="semiBold" style={themed($orderAmount)}>
        {formatCurrency(item.pricing?.totalPrice || 0)}
      </Text>
    </TouchableOpacity>
  )

  const quickActions = [
    {
      title: "Add Measurement",
      subtitle: "Submit new sizes",
      icon: "profile" as const,
      onPress: () => navigation.navigate("Measurement" as never),
    },
    {
      title: "Browse Fabrics",
      subtitle: "Choose materials",
      icon: "view" as const,
      onPress: () => navigation.navigate("FabricSearch" as never),
    },
    {
      title: "Track Orders",
      subtitle: "View progress",
      icon: "sew" as const,
      onPress: () => navigation.navigate("Orders" as never),
    },
    {
      title: "Book Fitting",
      subtitle: "Schedule a visit",
      icon: "appointment" as const,
      onPress: () => navigation.navigate("BookFitting" as never),
    },
    {
      title: "Style Catalog",
      subtitle: "Browse designs",
      icon: "menu" as const,
      onPress: () => navigation.navigate("Catalog" as never),
    },
  ]

  const renderQuickAction = (item: {
    title: string
    subtitle: string
    icon: IconTypes
    onPress: () => void
  }) => (
    <TouchableOpacity
      key={item.title}
      style={themed($quickActionCard)}
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={themed($quickActionIconWell)}>
        <Icon icon={item.icon} size={18} color={theme.colors.accent} />
      </View>
      <Text weight="semiBold" style={themed($quickActionTitle)} text={item.title} />
      <Text style={themed($quickActionSubtitle)}>{item.subtitle}</Text>
    </TouchableOpacity>
  )

  const nextFittingLabel = nextAppointment
    ? new Date(nextAppointment.scheduledAt).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      })
    : "—"

  return (
    <Screen
      backgroundColor={theme.colors.background}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle={theme.isDark ? "light" : "dark"}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        ),
      }}
    >
      <View style={$container}>
        {/* Greeting header */}
        <View style={themed($header)}>
          <View style={$headerTextGroup}>
            <Text style={themed($greetingText)} accessibilityLabel={greeting}>
              {greeting},
            </Text>
            <Text
              weight="bold"
              style={themed($nameText)}
              numberOfLines={1}
              accessibilityLabel="Client Name"
            >
              {userName}
            </Text>
          </View>
          <View style={themed($headerActions)}>
            <View style={themed($iconButton)}>
              <ThemeToggle size={20} />
            </View>
            <TouchableOpacity
              style={themed($iconButton)}
              onPress={() => navigation.navigate("ClientNotifications" as never)}
              accessible
              accessibilityLabel="Notifications"
            >
              <Icon icon="bell" size={20} color={theme.colors.text} />
              {unreadNotifications > 0 && (
                <View style={themed($notificationBadge)}>
                  <Text style={themed($notificationBadgeText)}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={themed($statRow)}>
          <StatTile icon="sew" value={String(activeOrdersCount)} label="Active Orders" />
          <StatTile icon="money" value={formatCurrency(outstandingBalance)} label="Outstanding" />
          <StatTile icon="appointment" value={nextFittingLabel} label="Next Fitting" />
        </View>

        {/* Quick Actions */}
        <View style={themed($section)}>
          <SectionHeader title="Quick Actions" style={themed($sectionHeader)} />
          <View style={themed($quickActionGrid)} accessibilityLabel="Quick Actions List">
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={themed($section)}>
          <SectionHeader
            title="Recent Orders"
            actionText="View All"
            onActionPress={() => navigation.navigate("Orders" as never)}
            style={themed($sectionHeader)}
          />
          <FlatList
            data={recentOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={252}
            decelerationRate="fast"
            contentContainerStyle={themed($orderListContent)}
            accessibilityLabel="Recent Orders List"
          />
        </View>

        {/* Recent Measurements */}
        <View style={themed($section)}>
          <SectionHeader
            title="Recent Measurements"
            actionText="View All"
            onActionPress={() => navigation.navigate("Measurement" as never)}
            style={themed($sectionHeader)}
          />
          {recentMeasurements.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={themed($measurementCard)}
              onPress={() => console.log(`Navigate to Measurement Details: ${item.id}`)}
              accessible
              accessibilityLabel={`Measurement: ${item.type || "Custom"}`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={themed($measurementHeader)}>
                <View style={$measurementInfo}>
                  <Text weight="semiBold" style={themed($measurementTitle)}>
                    {item.type || "Custom Measurement"}
                  </Text>
                  <Text style={themed($measurementCategory)}>
                    {item.garmentType || "General"} · {item.status || "Active"}
                  </Text>
                </View>
                <Icon icon="caretRight" size={18} color={theme.colors.palette.gray500} />
              </View>
              <View style={themed($measurementDetails)}>
                {[
                  { label: "Chest", value: item.measurements?.chest },
                  { label: "Waist", value: item.measurements?.waist },
                  { label: "Length", value: item.measurements?.length },
                ].map(({ label, value }) => (
                  <View key={label} style={$measurementItem}>
                    <Text style={themed($measurementLabel)}>{label}</Text>
                    <Text weight="semiBold" style={themed($measurementValue)}>
                      {value || 0} cm
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={themed($measurementDate)}>
                Measured on {item.createdAt ? formatDate(item.createdAt) : "Unknown"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Button */}
        <View style={[themed($bottomContainer), $bottomContainerInsets]}>
          <Button
            text="Add Measurement"
            style={themed($primaryButton)}
            pressedStyle={themed($primaryButtonPressed)}
            textStyle={themed($primaryButtonText)}
            onPress={() => navigation.navigate("Measurement" as never)}
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

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  marginBottom: spacing.lg,
})

const $headerTextGroup: ViewStyle = {
  flex: 1,
  marginRight: 12,
}

const $greetingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  lineHeight: 20,
  color: colors.textDim,
})

const $nameText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  lineHeight: 32,
  color: colors.text,
})

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $iconButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: "center",
  alignItems: "center",
})

const $notificationBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  paddingHorizontal: 4,
  backgroundColor: colors.error,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderColor: colors.background,
})

const $notificationBadgeText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.palette.neutral100,
  fontSize: 10,
  lineHeight: 12,
  fontFamily: typography.primary.semiBold,
})

const $statRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.xl,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginBottom: spacing.sm,
})

const $quickActionGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  paddingHorizontal: spacing.md,
  gap: spacing.xs,
})

const $quickActionCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexBasis: "31%",
  flexGrow: 1,
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.sm,
})

const $quickActionIconWell: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: colors.accentSoft,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.xs,
})

const $quickActionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  lineHeight: 18,
  color: colors.text,
})

const $quickActionSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  lineHeight: 15,
  color: colors.textDim,
})

const $orderListContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
})

const $orderCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 240,
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
})

const $orderHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
  gap: spacing.xs,
})

const $orderId: ThemedStyle<TextStyle> = ({ colors }) => ({
  flexShrink: 1,
  fontSize: 12,
  lineHeight: 16,
  color: colors.palette.gray500,
  letterSpacing: 0.4,
})

const $orderTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  lineHeight: 22,
  color: colors.text,
  marginBottom: spacing.xxs,
})

const $orderText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 13,
  lineHeight: 18,
  color: colors.textDim,
  marginBottom: spacing.xs,
})

const $orderAmount: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  lineHeight: 22,
  color: colors.accent,
})

const $measurementCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
})

const $measurementHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
})

const $measurementInfo: ViewStyle = {
  flex: 1,
}

const $measurementTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  lineHeight: 21,
  color: colors.text,
})

const $measurementCategory: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  lineHeight: 17,
  color: colors.textDim,
})

const $measurementDetails: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.sm,
  borderTopWidth: 1,
  borderColor: colors.separator,
})

const $measurementItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $measurementLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  lineHeight: 17,
  color: colors.textDim,
  marginBottom: spacing.xxs,
})

const $measurementValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  lineHeight: 20,
  color: colors.text,
})

const $measurementDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  lineHeight: 17,
  color: colors.palette.gray500,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
})

const $primaryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.accent,
  borderWidth: 0,
  borderRadius: 14,
  paddingVertical: spacing.sm,
  minHeight: 52,
})

const $primaryButtonPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.emerald600,
})

const $primaryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.palette.neutral100,
})
