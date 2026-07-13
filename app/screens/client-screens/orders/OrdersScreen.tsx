/**
 * Orders Screen
 * Main orders listing and management screen with Nigerian business context
 */

import { FC, useState, useMemo } from "react"
import { View, RefreshControl, ViewStyle, TextStyle, TouchableOpacity, FlatList } from "react-native"
import { TabScreenProps } from "@/navigators/ClientTabsNavigator"
import { Screen, Text, Button, Icon, Chip, statusTone } from "@/components"
import {
  OrderFilterBar,
  OrderFilterValue,
  EMPTY_ORDER_FILTER,
  matchesOrderFilter,
  countActiveOrderFilters,
} from "@/components/OrderFilterBar"
import { colors, spacing } from "@/theme"
import { useNavigation } from "@react-navigation/native"
import { useClientOrders, useOrderRealtime } from "@/api/orders"
import { useOrderDraftStore } from "@/state/orderDraftStore"
import { useAuthStore } from "@/state/authStore"
import { NigerianGarmentType, OrderStatus } from "@/types/orders"

interface OrdersScreenProps extends TabScreenProps<"Orders"> {}

export const OrdersScreen: FC<OrdersScreenProps> = function OrdersScreen() {
  const authStore = useAuthStore()
  const navigation = useNavigation()
  const getTranslation = useOrderDraftStore((s) => s.getTranslation)

  // Server list via React Query; realtime keeps it fresh (customer filter + poll)
  const { data: orders = [], isLoading, refetch, isRefetching } = useClientOrders(authStore.user?.id)
  useOrderRealtime(authStore.user?.id)

  // Filters persist in component state for the session (v1)
  const [filter, setFilter] = useState<OrderFilterValue>(EMPTY_ORDER_FILTER)

  const statusOptions = [
    { value: "pending" as OrderStatus, label: "Pending", color: colors.palette.tailorGold },
    { value: "confirmed" as OrderStatus, label: "Confirmed", color: colors.palette.threadBlue },
    { value: "in_progress" as OrderStatus, label: "In Progress", color: colors.palette.sageGreen },
    { value: "ready" as OrderStatus, label: "Ready", color: colors.palette.success500 },
    { value: "delivered" as OrderStatus, label: "Delivered", color: colors.palette.success500 },
    { value: "cancelled" as OrderStatus, label: "Cancelled", color: colors.palette.alertRed },
  ]

  const handleRefresh = () => {
    refetch()
  }

  // Client-side predicate handles multi-status selection and name/garment search
  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, filter)),
    [orders, filter],
  )

  const getGarmentDisplayName = (garmentType: NigerianGarmentType) => {
    return getTranslation("garments", garmentType) || garmentType
  }

  const formatOrderDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const renderOrderCard = ({ item: order }: { item: any }) => {
    const garmentSummary =
      order.items.length === 0
        ? "Custom Order"
        : `${getGarmentDisplayName(order.items[0].garmentType as NigerianGarmentType)}${
            order.items.length > 1 ? `  ·  +${order.items.length - 1} more` : ""
          }`
    const dateLine = order.estimatedDeliveryDate
      ? `Due ${formatOrderDate(order.estimatedDeliveryDate)}`
      : `Placed ${formatOrderDate(order.createdAt)}`

    return (
      <TouchableOpacity
        className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface p-4"
        activeOpacity={0.7}
        onPress={() => {
          // Navigate to order detail screen
          ;(navigation as any).navigate("OrderDetail", { orderId: order.id })
        }}
      >
        <View className="flex-1">
          <View className="mb-2 flex-row items-center justify-between gap-2">
            <Text
              className="shrink text-[15px] font-semibold"
              style={$orderNumberColor}
              numberOfLines={1}
            >
              #{order.orderNumber}
            </Text>
            <Chip
              text={statusOptions.find((s) => s.value === order.status)?.label ?? order.status}
              tone={statusTone(order.status)}
            />
          </View>

          <Text className="mb-3 text-[13px]" style={$garmentTextColor} numberOfLines={1}>
            {garmentSummary}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-bold" style={$totalAmountColor}>
              ₦{order.pricing.totalPrice.toLocaleString()}
            </Text>
            <Text className="text-[12px]" style={$orderDateColor}>
              {dateLine}
            </Text>
          </View>
        </View>
        <Icon icon="caretRight" size={18} color={colors.palette.gray500} />
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => {
    if (countActiveOrderFilters(filter) > 0) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Icon icon="view" size={64} color={colors.palette.gray500} />
          <Text className="mb-2 mt-6 text-[20px] font-semibold" style={$emptyTitleColor}>
            No Matching Orders
          </Text>
          <Text className="mb-8 text-center text-[14px] leading-5" style={$emptyDescriptionColor}>
            Try adjusting your search or clearing some filters
          </Text>
        </View>
      )
    }
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Icon icon="sew" size={64} color={colors.palette.gray500} />
        <Text className="mb-2 mt-6 text-[20px] font-semibold" style={$emptyTitleColor}>
          No Orders Yet
        </Text>
        <Text className="mb-8 text-center text-[14px] leading-5" style={$emptyDescriptionColor}>
          Start your tailoring journey by creating your first order
        </Text>
        <Button
          text="Create New Order"
          style={$createOrderButton}
          textStyle={$createOrderButtonText}
          onPress={() => navigation.navigate("NewOrder" as never)}
        />
      </View>
    )
  }

  return (
    <Screen style={$root} contentContainerStyle={$screenContent} preset="fixed" safeAreaEdges={["top"]}>
      <View className="flex-row items-center justify-between px-4 pb-4 pt-3">
        <Text className="text-[24px] font-bold" style={$titleColor}>
          My Orders
        </Text>
        <TouchableOpacity
          className="h-[42px] w-[42px] items-center justify-center rounded-full bg-accent"
          onPress={() => navigation.navigate("NewOrder" as never)}
        >
          <Icon icon="sew" size={22} color={colors.palette.neutral100} />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View className="px-4 pb-4">
        <OrderFilterBar value={filter} onChange={setFilter} statusOptions={statusOptions} />
      </View>

      {/* Orders List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-[16px]" style={$loadingTextColor}>
              Loading orders...
            </Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={colors.palette.tailorGold}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={$listContainer}
          />
        )}
      </View>
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities.
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

// Screen's fixed preset does not give its inner container a height; without
// flex the content area (and the orders list inside it) collapses to zero.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $listContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xs,
  paddingBottom: spacing.lg,
  gap: spacing.sm,
}

// Text color overrides (static, light-only).
const $titleColor: TextStyle = { color: colors.text }
const $orderNumberColor: TextStyle = { color: colors.text }
const $garmentTextColor: TextStyle = { color: colors.textDim }
const $totalAmountColor: TextStyle = { color: colors.accent }
const $orderDateColor: TextStyle = { color: colors.palette.gray500 }
const $emptyTitleColor: TextStyle = { color: colors.text }
const $emptyDescriptionColor: TextStyle = { color: colors.textDim }
const $loadingTextColor: TextStyle = { color: colors.textDim }

// Button style overrides stay inline (Button owns its className; callers never
// pass one in).
const $createOrderButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderWidth: 0,
  borderRadius: 14,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.md,
}

const $createOrderButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
