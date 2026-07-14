/**
 * Order History Screen
 *
 * Past (delivered or cancelled) orders for the current user, reusing the
 * order-card look from OrdersScreen in a lighter form.
 */

import { useRouter } from "expo-router"
import { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native"
import { Screen, Text, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import { useAuthStore } from "@/state/authStore"
import { orderApi } from "@/services/api/order-api"
import { formatRelativeTime } from "@/utils/formatRelativeTime"

type HistoryFilter = "all" | "delivered" | "cancelled"


export const OrderHistoryScreen: FC = 
  function OrderHistoryScreen() {
    const router = useRouter()
    const authStore = useAuthStore()

    const [orders, setOrders] = useState<Record<string, any>[]>([])
    const [filter, setFilter] = useState<HistoryFilter>("all")
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Fetch delivered + cancelled orders for the current user, newest first
    const loadHistory = useCallback(async () => {
      const userId = authStore.user?.id
      if (!userId) return
      const [delivered, cancelled] = await Promise.all([
        orderApi.fetchOrders({ customerId: userId, status: "delivered", perPage: 50 }),
        orderApi.fetchOrders({ customerId: userId, status: "cancelled", perPage: 50 }),
      ])
      const merged = [
        ...(delivered.success ? delivered.data.orders : []),
        ...(cancelled.success ? cancelled.data.orders : []),
      ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      setOrders(merged)
    }, [authStore.user?.id])

    useEffect(() => {
      let cancelled = false
      setIsLoading(true)
      loadHistory().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
      return () => {
        cancelled = true
      }
    }, [loadHistory])

    const handleRefresh = async () => {
      setIsRefreshing(true)
      await loadHistory()
      setIsRefreshing(false)
    }

    const filteredOrders =
      filter === "all" ? orders : orders.filter((order) => order.status === filter)

    const filterOptions: { value: HistoryFilter; label: string }[] = [
      { value: "all", label: "All" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
    ]

    const titleCase = (value: string) =>
      value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

    const renderOrderCard = ({ item: order }: { item: Record<string, any> }) => {
      const isDelivered = order.status === "delivered"
      const statusColor = isDelivered ? colors.palette.success500 : colors.palette.alertRed
      return (
        <TouchableOpacity
          className="rounded-[12px] border border-neutral200 bg-warmIvory p-lg"
          style={$orderCardShadow}
          onPress={() => router.push(`/orders/${order.id}`)}
        >
          <View className="mb-sm flex-row items-start justify-between">
            <View className="flex-row items-center gap-sm">
              <Text className="text-[16px] font-bold" style={$cOrderNumber}>
                #{order.orderNumber}
              </Text>
              <View
                className="rounded-[6px] px-sm py-xxs"
                style={{ backgroundColor: statusColor + "20" }}
              >
                <Text
                  className="text-[11px] font-semibold uppercase"
                  style={{ color: statusColor }}
                >
                  {titleCase(order.status)}
                </Text>
              </View>
            </View>
            <Text className="text-[12px]" style={$cOrderDate}>
              {formatRelativeTime(order.createdAt)}
            </Text>
          </View>

          <View className="flex-row items-center gap-sm">
            <Icon icon="sew" size={16} color={colors.palette.threadBlue} />
            <Text className="flex-1 text-[13px]" style={$cItemName}>
              {titleCase(order.garmentType ?? "custom")}
            </Text>
            <Text className="text-[13px] font-semibold" style={$cItemPrice}>
              ₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}
            </Text>
          </View>

          {isDelivered && order.actualDeliveryDate && (
            <Text className="mt-sm text-[12px]" style={$cDelivered}>
              Delivered{" "}
              {new Date(order.actualDeliveryDate).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          )}
        </TouchableOpacity>
      )
    }

    return (
      <Screen
        style={$root}
        preset="fixed"
        safeAreaEdges={["top"]}
        statusBarStyle="dark"
        contentContainerStyle={$screenContent}
      >
        {/* Header */}
        <View className="flex-row items-center border-b border-neutral200 px-lg py-md">
          <TouchableOpacity
            className="h-[40px] w-[40px] items-center justify-center"
            onPress={() =>router.back()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[18px] font-semibold" style={$cHeaderTitle}>
            Order History
          </Text>
          <View className="w-[40px]" />
        </View>

        {/* Filter chips */}
        <View className="flex-row gap-sm px-lg py-md">
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              className={`rounded-[16px] border px-md py-xs ${
                filter === option.value
                  ? "border-tailorGold bg-tailorGold"
                  : "border-neutral300 bg-neutral200"
              }`}
              onPress={() => setFilter(option.value)}
            >
              <Text
                className="text-[13px] font-medium"
                style={filter === option.value ? $cChipTextActive : $cChipText}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center p-xl">
            <Text className="text-center text-[14px] leading-[20px]" style={$cEmptyDescription}>
              Loading history...
            </Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="flex-1 items-center justify-center p-xl">
            <Icon icon="sew" size={64} color={colors.palette.neutral400} />
            <Text className="mb-xs mt-lg text-[20px] font-semibold" style={$cEmptyTitle}>
              No Past Orders
            </Text>
            <Text className="text-center text-[14px] leading-[20px]" style={$cEmptyDescription}>
              Delivered and cancelled orders will show up here
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.palette.tailorGold}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={$listContainer}
          />
        )}
      </Screen>
    )
  }

// Styles
// Static (light-only) `colors` screen: layout/spacing/container colors live in
// className token utilities; text colors and dynamic (status-driven) colors stay
// inline. These objects feed component style props or hold color/shadow only.
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral100,
}

// Screen's fixed preset gives its inner container no height; without flex the
// history list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $listContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
  gap: spacing.md,
}

const $orderCardShadow: ViewStyle = {
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
}

// Text color overrides (static, light-only).
const $cHeaderTitle: TextStyle = { color: colors.palette.neutral900 }
const $cOrderNumber: TextStyle = { color: colors.palette.deepCharcoal }
const $cOrderDate: TextStyle = { color: colors.palette.neutral500 }
const $cItemName: TextStyle = { color: colors.palette.deepCharcoal }
const $cItemPrice: TextStyle = { color: colors.palette.tailorGold }
const $cDelivered: TextStyle = { color: colors.palette.threadBlue }
const $cEmptyTitle: TextStyle = { color: colors.palette.deepCharcoal }
const $cEmptyDescription: TextStyle = { color: colors.palette.threadBlue }
const $cChipText: TextStyle = { color: colors.palette.deepCharcoal }
const $cChipTextActive: TextStyle = { color: colors.palette.warmIvory }
