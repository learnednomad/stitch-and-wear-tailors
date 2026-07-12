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
import {
  Screen,
  Icon,
  Text,
  IconTypes,
  StatTile,
  SectionHeader,
  Chip,
  statusTone,
  statusLabel,
} from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import { orderApi } from "@/services/api/order-api"

/** Mapped domain order snapshot (loosely typed — mapper guarantees shape) */
type DomainOrder = Record<string, any>

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
    currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"

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

  // Quick action card (matches the client home grid anatomy)
  const renderQuickAction = ({
    item,
  }: {
    item: { title: string; icon: IconTypes; onPress: () => void }
  }) => (
    <TouchableOpacity
      key={item.title}
      style={$quickActionCard}
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
      activeOpacity={0.7}
    >
      <View style={$quickActionIconContainer}>
        <Icon icon={item.icon} size={18} color={colors.accent} />
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
          <Text style={$orderTitle} numberOfLines={1}>
            #{item.orderNumber}
          </Text>
          <View style={$orderChips}>
            {["high", "urgent"].includes(item.priority) && (
              <Chip
                text={item.priority === "urgent" ? "Urgent" : "Express"}
                tone={item.priority === "urgent" ? "error" : "warning"}
              />
            )}
            <Chip text={statusLabel(item.status)} tone={statusTone(item.status)} />
          </View>
        </View>

        <Text style={$orderMeasurement} numberOfLines={1}>
          {customerName} · {titleCase(item.garmentType ?? "custom")}
        </Text>

        {item.status !== "cancelled" && (
          <View style={$progressContainer}>
            <View style={$progressBar}>
              <View style={[$progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={$progressText}>{progressPercentage}%</Text>
          </View>
        )}

        <View style={$orderFooter}>
          <Text style={$orderAmount}>₦{(item.pricing?.totalPrice ?? 0).toLocaleString()}</Text>
          <Text style={$orderDueDate}>
            Due {new Date(item.estimatedDeliveryDate).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Quick links into the tailor tabs
  const quickActions: { title: string; icon: IconTypes; onPress: () => void }[] = [
    {
      title: "Orders",
      icon: "sew",
      onPress: () => (navigation as any).navigate("TailorOrders", {}),
    },
    {
      title: "Measurements",
      icon: "profile",
      onPress: () => (navigation as any).navigate("Measurements"),
    },
    {
      title: "Invoices",
      icon: "money",
      onPress: () => (navigation as any).navigate("Invoices"),
    },
    {
      title: "Analytics",
      icon: "view",
      onPress: () => (navigation as any).navigate("Analytics"),
    },
    {
      title: "Settings",
      icon: "settings",
      onPress: () => (navigation as any).navigate("Settings"),
    },
  ]

  const statsData: {
    title: string
    value: string
    icon: IconTypes
    color: string
    backgroundColor: string
  }[] = [
    {
      title: "New Requests",
      value: String(newRequestsCount),
      icon: "bell",
      color: colors.palette.warning600,
      backgroundColor: colors.palette.warning100,
    },
    {
      title: "In Progress",
      value: String(inProgressCount),
      icon: "sew",
      color: colors.palette.secondary400,
      backgroundColor: colors.palette.secondary100,
    },
    {
      title: "Ready",
      value: String(readyCount),
      icon: "check",
      color: colors.palette.success600,
      backgroundColor: colors.palette.success100,
    },
    {
      title: "Revenue (Month)",
      value: `₦${revenueThisMonth.toLocaleString()}`,
      icon: "money",
      color: colors.accent,
      backgroundColor: colors.accentSoft,
    },
  ]

  return (
    <Screen
      backgroundColor={colors.background}
      contentContainerStyle={$root}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      {/* Header */}
        <View style={$header}>
          <View style={$greetingContainer}>
            <Text style={$greetingText} accessibilityLabel={greeting}>
              {greeting},
            </Text>
            <Text style={$nameText} numberOfLines={1}>
              {tailorName}
            </Text>
            <Text style={$welcomeText}>Welcome back to your atelier</Text>
          </View>
          <TouchableOpacity
            style={$notificationIcon}
            onPress={() => (navigation as any).navigate("TailorNotifications")}
            accessible
            accessibilityLabel="Notifications"
          >
            <Icon icon="bell" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Stats */}
        <View style={$statsContainer}>
          <SectionHeader title="Overview" style={$sectionHeaderSpacing} />
          <View style={$statsGrid}>
            {statsData.map((stat, index) => (
              <View key={index} style={$statsCardWrapper}>
                <StatTile
                  value={stat.value}
                  label={stat.title}
                  icon={stat.icon}
                  iconColor={stat.color}
                  iconBackgroundColor={stat.backgroundColor}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={$quickActionsContainer}>
          <SectionHeader title="Quick Actions" style={$sectionHeaderSpacing} />
          <View style={$quickActionGrid} accessibilityLabel="Quick Actions List">
            {quickActions.map((item) => renderQuickAction({ item }))}
          </View>
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
            <Icon icon="caretRight" size={16} color={colors.accent} />
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
  alignItems: "center",
  paddingVertical: spacing.md,
}

const $greetingContainer: ViewStyle = {
  flex: 1,
  marginRight: spacing.sm,
}

const $greetingText: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  color: colors.textDim,
}

const $nameText: TextStyle = {
  fontSize: 24,
  lineHeight: 32,
  fontWeight: "700",
  color: colors.text,
}

const $welcomeText: TextStyle = {
  fontSize: 13,
  lineHeight: 18,
  color: colors.palette.gray500,
  marginTop: 2,
}

const $notificationIcon: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: "center",
  alignItems: "center",
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
  width: "48.5%",
  marginBottom: spacing.xs,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
}

const $sectionHeaderSpacing: ViewStyle = {
  marginBottom: spacing.sm,
}

// Quick actions styles
const $quickActionsContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $quickActionGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
}

const $quickActionCard: ViewStyle = {
  flexBasis: "31%",
  flexGrow: 1,
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.sm,
}

const $quickActionIconContainer: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: colors.accentSoft,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $quickActionText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
  color: colors.text,
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
  width: 260,
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginRight: spacing.sm,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.xs,
}

const $orderChips: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xxs,
}

const $orderTitle: TextStyle = {
  flexShrink: 1,
  fontSize: 15,
  fontWeight: "600",
  color: colors.text,
}

const $orderMeasurement: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginBottom: spacing.sm,
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
  backgroundColor: colors.accent,
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
  color: colors.palette.gray500,
}

const $orderAmount: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.accent,
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
  color: colors.accent,
  fontWeight: "600",
}
