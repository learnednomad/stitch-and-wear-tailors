/**
 * Tailor Dashboard Screen
 *
 * Greeting, live stat tiles (new requests / in progress / ready / revenue
 * this month), quick links to the tailor tabs and the five most recent
 * orders — all backed by orderApi data for the logged-in tailor.
 */

import { FC, useCallback, useState } from "react"
import {
  View,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { Screen, Icon, Text, IconTypes } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { orderApi } from "@/services/api/order-api"
import { formatRelativeTime } from "@/utils/formatRelativeTime"

/** Mapped domain order snapshot (loosely typed — mapper guarantees shape) */
type DomainOrder = Record<string, any>

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    pending: colors.palette.warning500,
    confirmed: colors.palette.secondary400,
    in_progress: colors.palette.secondary500,
    ready: colors.palette.success500,
    delivered: colors.palette.success600,
    cancelled: colors.palette.error500,
  }
  return statusColors[status] || colors.palette.neutral400
}

const getPriorityColor = (priority: string) => {
  const priorityColors: Record<string, string> = {
    low: colors.palette.success500,
    normal: colors.palette.secondary400,
    high: colors.palette.warning500,
    urgent: colors.palette.error500,
  }
  return priorityColors[priority] || colors.palette.neutral500
}

export const TailorScreen: FC = observer(function TailorScreen() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const { authStore } = useStores()

  const [orders, setOrders] = useState<DomainOrder[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "urgent">("all")

  // Time-of-day greeting with the tailor's real name
  const tailorName = authStore.user
    ? `${authStore.user.profile.firstName} ${authStore.user.profile.lastName}`.trim()
    : "Tailor"
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? `Good Morning, ${tailorName}`
      : currentHour < 18
        ? `Good Afternoon, ${tailorName}`
        : `Good Evening, ${tailorName}`

  // Own orders + unassigned pending requests, refreshed on focus
  const loadDashboard = useCallback(async () => {
    const tailorId = authStore.user?.id
    if (!tailorId) return
    const [mine, unassigned] = await Promise.all([
      orderApi.fetchOrders({ tailorId, perPage: 100 }),
      orderApi.fetchOrders({ unassigned: true, status: "pending", perPage: 50 }),
    ])
    const merged = new Map<string, DomainOrder>()
    for (const order of mine.success ? mine.data.orders : []) merged.set(order.id, order)
    for (const order of unassigned.success ? unassigned.data.orders : []) {
      merged.set(order.id, order)
    }
    setOrders(
      [...merged.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    )
  }, [authStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      loadDashboard()
    }, [loadDashboard]),
  )

  // Dashboard stats derived from the loaded orders
  const newRequestsCount = orders.filter((o) => o.status === "pending").length
  const inProgressCount = orders.filter((o) =>
    ["confirmed", "in_progress"].includes(o.status),
  ).length
  const readyCount = orders.filter((o) => o.status === "ready").length
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const revenueThisMonth = orders
    .filter((o) => {
      if (o.status !== "delivered") return false
      const deliveredAt = new Date(o.actualDeliveryDate ?? o.updatedAt)
      return !Number.isNaN(deliveredAt.getTime()) && deliveredAt >= monthStart
    })
    .reduce((sum, o) => sum + (o.pricing?.totalPrice ?? 0), 0)

  // Recent orders: top 5, urgent tab narrows to high-priority or due soon
  const recentOrders = (
    activeTab === "urgent"
      ? orders.filter(
          (o) =>
            ["high", "urgent"].includes(o.priority) ||
            new Date(o.estimatedDeliveryDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        )
      : orders
  ).slice(0, 5)

  const titleCase = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

  // Dashboard stats cards
  const renderStatsCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string
    value: string
    icon: IconTypes
    color: string
  }) => (
    <View style={[$statsCard, { borderLeftColor: color }]}>
      <View style={$statsContent}>
        <View style={$statsIconContainer}>
          <Icon icon={icon} size={20} color={color} />
        </View>
        <View style={$statsTextContainer}>
          <Text style={$statsValue}>{value}</Text>
          <Text style={$statsTitle}>{title}</Text>
        </View>
      </View>
    </View>
  )

  // Enhanced quick action card
  const renderQuickAction = ({
    item,
  }: {
    item: { title: string; icon: IconTypes; color: string; onPress: () => void }
  }) => (
    <TouchableOpacity
      style={$quickActionCard}
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
    >
      <View style={[$quickActionIconContainer, { backgroundColor: item.color + "20" }]}>
        <Icon icon={item.icon} size={24} color={item.color} />
      </View>
      <Text style={$quickActionText}>{item.title}</Text>
    </TouchableOpacity>
  )

  // Order card with progress indicator (real order data)
  const renderOrder = ({ item }: { item: DomainOrder }) => {
    const customerName =
      `${item.customerInfo?.firstName ?? ""} ${item.customerInfo?.lastName ?? ""}`.trim() ||
      "Customer"
    const progressPercentage = item.progress?.percentage ?? 0
    return (
      <TouchableOpacity
        style={$orderCard}
        onPress={() => (navigation as any).navigate("OrderDetail", { orderId: item.id })}
        accessible
        accessibilityLabel={`Order: ${item.orderNumber}`}
      >
        <View style={$orderHeader}>
          <Text style={$orderTitle}>#{item.orderNumber}</Text>
          <View style={[$priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={$priorityText}>{String(item.priority).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={$orderMeasurement}>
          {customerName} • {titleCase(item.garmentType ?? "custom")}
        </Text>

        <View style={$orderStatusContainer}>
          <View style={[$statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={$orderStatus}>{titleCase(item.status)}</Text>
        </View>

        <View style={$progressContainer}>
          <View style={$progressBar}>
            <View style={[$progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={$progressText}>{progressPercentage}%</Text>
        </View>

        <View style={$orderFooter}>
          <Text style={$orderDueDate}>
            Due: {new Date(item.estimatedDeliveryDate).toLocaleDateString()}
          </Text>
          <Text style={$orderCreated}>{formatRelativeTime(item.createdAt)}</Text>
        </View>

        <View style={$orderAmountRow}>
          <Text style={$orderAmount}>₦{(item.pricing?.totalPrice ?? 0).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Quick links into the tailor tabs
  const quickActions: { title: string; icon: IconTypes; color: string; onPress: () => void }[] = [
    {
      title: "Orders",
      icon: "sew",
      color: colors.palette.primary500,
      onPress: () => (navigation as any).navigate("TailorOrders", {}),
    },
    {
      title: "Measurements",
      icon: "profile",
      color: colors.palette.secondary400,
      onPress: () => (navigation as any).navigate("Measurements"),
    },
    {
      title: "Invoices",
      icon: "money",
      color: colors.palette.tailorGold,
      onPress: () => (navigation as any).navigate("Invoices"),
    },
    {
      title: "Analytics",
      icon: "view",
      color: colors.palette.accent500,
      onPress: () => (navigation as any).navigate("Analytics"),
    },
    {
      title: "Settings",
      icon: "settings",
      color: colors.palette.warning500,
      onPress: () => (navigation as any).navigate("Settings"),
    },
  ]

  const statsData: { title: string; value: string; icon: IconTypes; color: string }[] = [
    {
      title: "New Requests",
      value: String(newRequestsCount),
      icon: "bell",
      color: colors.palette.warning500,
    },
    {
      title: "In Progress",
      value: String(inProgressCount),
      icon: "sew",
      color: colors.palette.secondary400,
    },
    {
      title: "Ready",
      value: String(readyCount),
      icon: "check",
      color: colors.palette.success500,
    },
    {
      title: "Revenue (Month)",
      value: `₦${revenueThisMonth.toLocaleString()}`,
      icon: "money",
      color: colors.palette.tailorGold,
    },
  ]

  return (
    <Screen
      backgroundColor="#f7fafc"
      contentContainerStyle={$root}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      {/* Enhanced Header */}
        <View style={$header}>
          <View style={$greetingContainer}>
            <Text style={$greetingText} accessibilityLabel={greeting}>
              {greeting}
            </Text>
            <Text style={$welcomeText}>
              Welcome back to your atelier - crafting Nigerian excellence
            </Text>
          </View>
          <TouchableOpacity
            style={$notificationIcon}
            onPress={() => (navigation as any).navigate("TailorNotifications")}
            accessible
            accessibilityLabel="Notifications"
          >
            <Icon icon="bell" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Dashboard Stats */}
        <View style={$statsContainer}>
          <Text style={$sectionTitle}>Dashboard Overview</Text>
          <View style={$statsGrid}>
            {statsData.map((stat, index) => (
              <View key={index} style={$statsCardWrapper}>
                {renderStatsCard(stat)}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={$quickActionsContainer}>
          <Text style={$sectionTitle}>Quick Actions</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.title}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$quickActionListContent}
            accessibilityLabel="Quick Actions List"
          />
        </View>

        {/* Recent Orders with Tabs */}
        <View style={$ordersContainer}>
          <View style={$ordersHeader}>
            <Text style={$sectionTitle}>Recent Orders</Text>
            <View style={$tabContainer}>
              <TouchableOpacity
                style={[$tab, activeTab === "all" && $activeTab]}
                onPress={() => setActiveTab("all")}
              >
                <Text style={[$tabText, activeTab === "all" && $activeTabText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[$tab, activeTab === "urgent" && $activeTab]}
                onPress={() => setActiveTab("urgent")}
              >
                <Text style={[$tabText, activeTab === "urgent" && $activeTabText]}>Urgent</Text>
              </TouchableOpacity>
            </View>
          </View>
          {recentOrders.length === 0 ? (
            <View style={$emptyOrders}>
              <Icon icon="sew" size={32} color={colors.palette.neutral400} />
              <Text style={$emptyOrdersText}>No orders yet</Text>
            </View>
          ) : (
            <FlatList
              data={recentOrders}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={$orderListContent}
              accessibilityLabel="Orders List"
            />
          )}
          <TouchableOpacity
            style={$viewAllOrders}
            onPress={() => (navigation as any).navigate("TailorOrders", {})}
          >
            <Text style={$viewAllText}>View All Orders</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.primary500} />
          </TouchableOpacity>
        </View>

      <View style={$bottomContainerInsets} />
    </Screen>
  )
})

// Enhanced Styles
// Screen preset="scroll" owns the scrolling: this is its contentContainerStyle,
// so no flex (a nested ScrollView here previously ate the scroll gesture and
// let the greeting slide under the status bar).
const $root: ViewStyle = {
  paddingHorizontal: spacing.md,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.sm,
}

const $greetingContainer: ViewStyle = {
  flex: 1,
}

const $greetingText: TextStyle = {
  fontSize: 28,
  // Space Grotesk clips ascenders without an explicit line height
  lineHeight: 36,
  fontWeight: "700",
  color: "#1a202c",
  marginBottom: spacing.xs,
  letterSpacing: 0.5,
}

const $welcomeText: TextStyle = {
  fontSize: 16,
  color: "#4a5568",
  fontWeight: "400",
}

const $notificationIcon: ViewStyle = {
  padding: spacing.sm,
  position: "relative",
  backgroundColor: "#2B5D2F",
  borderRadius: 12,
}

// Stats styles
const $statsContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $statsGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
}

const $statsCardWrapper: ViewStyle = {
  width: "48%",
  marginBottom: spacing.sm,
}

const $statsCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderLeftWidth: 4,
  padding: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $statsContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $statsIconContainer: ViewStyle = {
  marginRight: spacing.sm,
}

const $statsTextContainer: ViewStyle = {
  flex: 1,
}

const $statsValue: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.palette.neutral900,
}

const $statsTitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: 2,
}

const $sectionTitle: TextStyle = {
  fontSize: 22,
  fontWeight: "700",
  color: "#1a202c",
  marginBottom: spacing.md,
  letterSpacing: 0.3,
}

// Quick actions styles
const $quickActionsContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $quickActionListContent: ViewStyle = {
  paddingRight: spacing.lg,
}

const $quickActionCard: ViewStyle = {
  // wide enough that "Measurements" doesn't break mid-word
  width: 116,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.sm,
  marginRight: spacing.sm,
  alignItems: "center",
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $quickActionIconContainer: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $quickActionText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral800,
  textAlign: "center",
}

// Orders styles
const $ordersContainer: ViewStyle = {
  marginBottom: spacing.xl,
}

const $ordersHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $tabContainer: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  padding: 2,
}

const $tab: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 6,
}

const $activeTab: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

const $tabText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  fontWeight: "500",
}

const $activeTabText: TextStyle = {
  color: colors.palette.neutral900,
  fontWeight: "600",
}

const $orderListContent: ViewStyle = {
  paddingRight: spacing.lg,
}

const $orderCard: ViewStyle = {
  width: 280,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $orderTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.palette.neutral900,
}

const $priorityBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $priorityText: TextStyle = {
  fontSize: 10,
  fontWeight: "bold",
  color: colors.palette.neutral100,
}

const $orderMeasurement: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
  marginBottom: spacing.sm,
}

const $orderStatusContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $statusIndicator: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: spacing.xs,
}

const $orderStatus: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral700,
}

const $progressContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $progressBar: ViewStyle = {
  flex: 1,
  height: 4,
  backgroundColor: colors.palette.neutral300,
  borderRadius: 2,
  marginRight: spacing.sm,
}

const $progressFill: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.primary500,
  borderRadius: 2,
}

const $progressText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
  color: colors.palette.neutral600,
  minWidth: 35,
}

const $orderFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $orderDueDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
}

const $orderCreated: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
}

const $orderAmountRow: ViewStyle = {
  marginTop: spacing.xs,
  paddingTop: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
}

const $orderAmount: TextStyle = {
  fontSize: 14,
  fontWeight: "700",
  color: colors.palette.accent500,
}

const $emptyOrders: ViewStyle = {
  alignItems: "center",
  padding: spacing.lg,
  gap: spacing.sm,
}

const $emptyOrdersText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral500,
}

const $viewAllOrders: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xxs,
  paddingVertical: spacing.sm,
}

const $viewAllText: TextStyle = {
  fontSize: 14,
  color: colors.palette.primary500,
  fontWeight: "600",
}
