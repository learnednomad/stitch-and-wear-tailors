/**
 * Tailor Dashboard Screen
 *
 * Greeting, live stat tiles (new requests / in progress / ready / revenue
 * this month), quick links to the tailor tabs and the five most recent
 * orders — all backed by orderApi data for the logged-in tailor.
 */

import { FC, useCallback, useState } from "react"
import { View, FlatList, TouchableOpacity, ViewStyle, TextStyle } from "react-native"
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
import { useTailorBoardOrders } from "@/api/orders"

/** Mapped domain order snapshot (loosely typed — mapper guarantees shape) */
type DomainOrder = Record<string, any>

export const TailorScreen: FC = observer(function TailorScreen() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const { authStore } = useStores()

  const [activeTab, setActiveTab] = useState<"all" | "urgent">("all")

  // Time-of-day greeting with the tailor's real name
  const tailorName = authStore.user
    ? `${authStore.user.profile.firstName} ${authStore.user.profile.lastName}`.trim()
    : "Tailor"
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"

  // Own orders + unassigned pending requests, refreshed on focus
  const ordersQuery = useTailorBoardOrders(authStore.user?.id)
  const orders: DomainOrder[] = ordersQuery.data ?? []
  const { refetch } = ordersQuery

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
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
      className="basis-[31%] grow rounded-2xl border border-border bg-surface p-3"
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
      activeOpacity={0.7}
    >
      <View className="mb-2 h-[34px] w-[34px] items-center justify-center rounded-[17px] bg-accentSoft">
        <Icon icon={item.icon} size={18} color={colors.accent} />
      </View>
      <Text className="text-[13px]" weight="semiBold" style={$quickActionTextColor}>
        {item.title}
      </Text>
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
        className="w-[260px] rounded-2xl border border-border bg-surface p-4 mr-3"
        onPress={() => (navigation as any).navigate("OrderDetail", { orderId: item.id })}
        accessible
        accessibilityLabel={`Order: ${item.orderNumber}`}
      >
        <View className="flex-row items-center justify-between gap-2 mb-2">
          <Text className="shrink text-[15px]" weight="semiBold" style={$orderTitleColor} numberOfLines={1}>
            #{item.orderNumber}
          </Text>
          <View className="flex-row gap-1">
            {["high", "urgent"].includes(item.priority) && (
              <Chip
                text={item.priority === "urgent" ? "Urgent" : "Express"}
                tone={item.priority === "urgent" ? "error" : "warning"}
              />
            )}
            <Chip text={statusLabel(item.status)} tone={statusTone(item.status)} />
          </View>
        </View>

        <Text className="text-[13px] mb-3" style={$orderMeasurementColor} numberOfLines={1}>
          {customerName} · {titleCase(item.garmentType ?? "custom")}
        </Text>

        {item.status !== "cancelled" && (
          <View className="flex-row items-center mb-3">
            <View className="flex-1 h-1 rounded-[2px] bg-neutral300 mr-3">
              <View className="h-full rounded-[2px] bg-accent" style={{ width: `${progressPercentage}%` }} />
            </View>
            <Text className="text-[11px] min-w-[35px]" weight="semiBold" style={$progressTextColor}>
              {progressPercentage}%
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px]" weight="bold" style={$orderAmountColor}>
            ₦{(item.pricing?.totalPrice ?? 0).toLocaleString()}
          </Text>
          <Text className="text-[12px]" style={$orderDueDateColor}>
            Due{" "}
            {new Date(item.estimatedDeliveryDate).toLocaleDateString("en-NG", {
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
      <View className="flex-row items-center justify-between py-4">
        <View className="flex-1 mr-3">
          <Text className="text-[14px] leading-5" style={$greetingColor} accessibilityLabel={greeting}>
            {greeting},
          </Text>
          <Text className="text-[24px] leading-8" weight="bold" style={$nameColor} numberOfLines={1}>
            {tailorName}
          </Text>
          <Text className="text-[13px] leading-[18px] mt-0.5" style={$welcomeColor}>
            Welcome back to your atelier
          </Text>
        </View>
        <TouchableOpacity
          className="h-[42px] w-[42px] rounded-full border border-border bg-surface items-center justify-center"
          onPress={() => (navigation as any).navigate("TailorNotifications")}
          accessible
          accessibilityLabel="Notifications"
        >
          <Icon icon="bell" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Dashboard Stats */}
      <View className="mb-6">
        <SectionHeader title="Overview" style={$sectionHeaderSpacing} />
        <View className="flex-row flex-wrap justify-between">
          {statsData.map((stat, index) => (
            <View key={index} className="w-[48.5%] mb-2">
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
      <View className="mb-6">
        <SectionHeader title="Quick Actions" style={$sectionHeaderSpacing} />
        <View className="flex-row flex-wrap gap-2" accessibilityLabel="Quick Actions List">
          {quickActions.map((item) => renderQuickAction({ item }))}
        </View>
      </View>

      {/* Recent Orders with Tabs */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[18px]" weight="semiBold" style={$sectionTitleColor}>
            Recent Orders
          </Text>
          <View className="flex-row rounded-lg bg-neutral200 p-0.5">
            <TouchableOpacity
              className="px-4 py-2 rounded-md"
              style={activeTab === "all" ? $activeTab : undefined}
              onPress={() => setActiveTab("all")}
            >
              <Text
                className="text-[14px]"
                weight={activeTab === "all" ? "semiBold" : "medium"}
                style={activeTab === "all" ? $activeTabTextColor : $tabTextColor}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-2 rounded-md"
              style={activeTab === "urgent" ? $activeTab : undefined}
              onPress={() => setActiveTab("urgent")}
            >
              <Text
                className="text-[14px]"
                weight={activeTab === "urgent" ? "semiBold" : "medium"}
                style={activeTab === "urgent" ? $activeTabTextColor : $tabTextColor}
              >
                Urgent
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {recentOrders.length === 0 ? (
          <View className="items-center p-6 gap-3">
            <Icon icon="sew" size={32} color={colors.palette.neutral400} />
            <Text className="text-[13px]" style={$emptyOrdersColor}>
              No orders yet
            </Text>
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
          className="flex-row items-center justify-center gap-1 py-3"
          onPress={() => (navigation as any).navigate("TailorOrders", {})}
        >
          <Text className="text-[14px]" weight="semiBold" style={$viewAllColor}>
            View All Orders
          </Text>
          <Icon icon="caretRight" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={$bottomContainerInsets} />
    </Screen>
  )
})

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities.
//
// Screen preset="scroll" owns the scrolling: this is its contentContainerStyle,
// so no flex (a nested ScrollView here previously ate the scroll gesture and
// let the greeting slide under the status bar).
const $root: ViewStyle = {
  paddingHorizontal: spacing.md,
}

// SectionHeader.style takes a style object, so this stays inline.
const $sectionHeaderSpacing: ViewStyle = {
  marginBottom: spacing.sm,
}

// FlatList.contentContainerStyle takes a style object, so this stays inline.
const $orderListContent: ViewStyle = {
  paddingRight: spacing.lg,
}

// Selection-state background stays inline (conditional style).
const $activeTab: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

// Text color overrides (static, light-only).
const $greetingColor: TextStyle = { color: colors.textDim }
const $nameColor: TextStyle = { color: colors.text }
const $welcomeColor: TextStyle = { color: colors.palette.gray500 }
const $quickActionTextColor: TextStyle = { color: colors.text }
const $sectionTitleColor: TextStyle = { color: colors.text }
const $tabTextColor: TextStyle = { color: colors.palette.neutral600 }
const $activeTabTextColor: TextStyle = { color: colors.palette.neutral900 }
const $emptyOrdersColor: TextStyle = { color: colors.palette.neutral500 }
const $orderTitleColor: TextStyle = { color: colors.text }
const $orderMeasurementColor: TextStyle = { color: colors.textDim }
const $progressTextColor: TextStyle = { color: colors.palette.neutral600 }
const $orderAmountColor: TextStyle = { color: colors.accent }
const $orderDueDateColor: TextStyle = { color: colors.palette.gray500 }
const $viewAllColor: TextStyle = { color: colors.accent }
