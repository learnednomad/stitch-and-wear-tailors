/**
 * Tailor Order Pipeline Screen (ORD-007)
 *
 * Status-pipeline board for the logged-in tailor: New Requests (unassigned
 * pending + own pending), In Progress (accepted..finishing), Ready and
 * Delivered. Renders side-by-side kanban columns on wide screens (>=768) and
 * a segmented single column otherwise. Refreshes on focus and subscribes to
 * order changes through the RealtimeManager.
 */

import { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  ViewStyle,
  TextStyle,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { Screen, Text, Icon } from "@/components"
import {
  OrderFilterBar,
  OrderFilterValue,
  EMPTY_ORDER_FILTER,
  matchesOrderFilter,
} from "@/components/OrderFilterBar"
import { colors, spacing } from "@/theme"
import { useAuthStore } from "@/state/authStore"
import { useTailorBoardOrders } from "@/api/orders"
import { COLLECTIONS } from "@/services/pocketbase/pocketbase-client"
import { realtimeManager, useRealtimeStatus } from "@/services/realtime"
import { formatRelativeTime } from "@/utils/formatRelativeTime"

/** Pipeline columns keyed by the domain statuses they collect */
const COLUMNS = [
  { key: "new", label: "New", color: colors.palette.warning600 },
  { key: "in_progress", label: "In Progress", color: colors.palette.secondary400 },
  { key: "ready", label: "Ready", color: colors.palette.success600 },
  { key: "delivered", label: "Delivered", color: colors.palette.gray500 },
] as const

type ColumnKey = (typeof COLUMNS)[number]["key"]

/** Bucket a mapped domain order into its pipeline column (null = hidden) */
function columnForOrder(order: Record<string, any>): ColumnKey | null {
  switch (order.status) {
    case "pending":
      return "new"
    case "confirmed":
    case "in_progress":
      return "in_progress"
    case "ready":
      return "ready"
    case "delivered":
      return "delivered"
    default:
      return null // cancelled/rejected are not part of the working board
  }
}

export const TailorOrderScreen: FC = observer(function TailorOrderScreen() {
  const navigation = useNavigation()
  const authStore = useAuthStore()
  const { width } = useWindowDimensions()
  const isWide = width >= 768
  const realtimeStatus = useRealtimeStatus()

  // Search/priority/date filter over the fetched set (client-side — statuses
  // are already the board columns). Persists in component state (v1).
  const [filter, setFilter] = useState<OrderFilterValue>(EMPTY_ORDER_FILTER)
  const [activeColumn, setActiveColumn] = useState<ColumnKey>("new")

  // Own orders + unassigned pending requests, merged and deduped
  const ordersQuery = useTailorBoardOrders(authStore.user?.id)
  const orders = ordersQuery.data ?? []
  const isLoading = ordersQuery.isLoading
  const isRefreshing = ordersQuery.isRefetching
  const { refetch } = ordersQuery

  // Refresh whenever the tab regains focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  // Realtime: any order change re-syncs the board (unassigned orders are not
  // covered by the store's per-user subscription, hence a screen-level key)
  useEffect(() => {
    const resync = async () => {
      await refetch()
    }
    const unsubscribe = realtimeManager.subscribe("tailor-orders", COLLECTIONS.ORDERS, resync, {
      fallbackPoll: resync,
    })
    return unsubscribe
  }, [refetch])

  const handleRefresh = () => {
    refetch()
  }

  const buckets: Record<ColumnKey, Record<string, any>[]> = {
    new: [],
    in_progress: [],
    ready: [],
    delivered: [],
  }
  for (const order of orders) {
    if (!matchesOrderFilter(order, filter)) continue
    const column = columnForOrder(order)
    if (column) buckets[column].push(order)
  }

  const titleCase = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

  /** Detailed status label (PB-stage granularity via progress.currentStage) */
  const statusLabel = (order: Record<string, any>) => {
    if (order.status === "in_progress") return titleCase(order.progress?.currentStage ?? "")
    if (order.status === "pending" && !order.tailorId) return "Unassigned"
    return titleCase(order.status)
  }

  const renderOrderCard = (order: Record<string, any>) => {
    const columnColor =
      COLUMNS.find((c) => c.key === columnForOrder(order))?.color ?? colors.palette.neutral500
    const customerName =
      `${order.customerInfo?.firstName ?? ""} ${order.customerInfo?.lastName ?? ""}`.trim() ||
      "Customer"
    return (
      <TouchableOpacity
        key={order.id}
        className="rounded-2xl border border-border bg-surface p-4 mb-3"
        onPress={() => (navigation as any).navigate("OrderDetail", { orderId: order.id })}
        accessible
        accessibilityLabel={`Order ${order.orderNumber}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[14px]" weight="bold" style={$orderNumberColor}>
            #{order.orderNumber}
          </Text>
          <View className="rounded-full px-2.5 py-[3px]" style={{ backgroundColor: columnColor + "20" }}>
            <Text className="text-[12px]" weight="medium" style={{ color: columnColor }}>
              {statusLabel(order)}
            </Text>
          </View>
        </View>

        <Text className="text-[14px] mb-1" weight="semiBold" style={$customerNameColor}>
          {customerName}
        </Text>
        <Text className="text-[12px] mb-3" style={$garmentSummaryColor}>
          {titleCase(order.garmentType ?? "custom")}
          {order.styleConfig?.designNotes ? ` • ${order.styleConfig.designNotes}` : ""}
        </Text>

        <View className="flex-row items-center justify-between pt-2 border-t border-separator">
          <Text className="text-[15px]" weight="bold" style={$orderAmountColor}>
            ₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}
          </Text>
          <Text className="text-[11px]" style={$orderTimeColor}>
            {formatRelativeTime(order.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyColumn = (label: string) => (
    <View className="items-center p-8 gap-3">
      <Icon icon="sew" size={32} color={colors.palette.neutral400} />
      <Text className="text-[13px]" style={$emptyColumnTextColor}>
        No {label.toLowerCase()}
      </Text>
    </View>
  )

  return (
    <Screen
      style={$root}
      preset="fixed"
      safeAreaEdges={["top"]}
      statusBarStyle="dark"
      contentContainerStyle={$screenContent}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-4">
        <Text className="text-[24px]" weight="bold" style={$titleColor}>
          Orders
        </Text>
        <View className="flex-row items-center gap-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                realtimeStatus === "live" ? colors.palette.success500 : colors.palette.warning500,
            }}
          />
          <Text className="text-[11px]" style={$connectionTextColor}>
            {realtimeStatus === "live" ? "Live" : "Auto"}
          </Text>
        </View>
      </View>

      {/* Search + lightweight filters (statuses are the board columns) */}
      <View className="px-4 pb-3">
        <OrderFilterBar
          value={filter}
          onChange={setFilter}
          searchPlaceholder="Search orders, customers..."
        />
      </View>

      {isWide ? (
        // Kanban: all columns side by side
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$kanbanContainer}
        >
          {COLUMNS.map((column) => (
            <View key={column.key} className="w-[300px] rounded-2xl bg-sand100 p-3">
              <View className="flex-row items-center gap-2 px-2 pb-3">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                <Text className="flex-1 text-[14px]" weight="bold" style={$columnTitleColor}>
                  {column.label}
                </Text>
                <Text className="text-[12px]" weight="semiBold" style={$columnCountColor}>
                  {buckets[column.key].length}
                </Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {buckets[column.key].length === 0
                  ? renderEmptyColumn(column.label)
                  : buckets[column.key].map(renderOrderCard)}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      ) : (
        // Segmented single column
        <>
          <View className="flex-row px-4 py-3 gap-2">
            {COLUMNS.map((column) => (
              <TouchableOpacity
                key={column.key}
                className="flex-1 flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg bg-sand200"
                style={activeColumn === column.key ? $segmentActive : undefined}
                onPress={() => setActiveColumn(column.key)}
              >
                <Text
                  className="text-[11px] shrink"
                  weight={activeColumn === column.key ? "semiBold" : "medium"}
                  style={activeColumn === column.key ? $segmentTextActiveColor : $segmentTextColor}
                  numberOfLines={1}
                >
                  {column.label}
                </Text>
                <View
                  className="min-w-[18px] h-[18px] rounded-full items-center justify-center px-1"
                  style={{ backgroundColor: column.color + "30" }}
                >
                  <Text className="text-[10px]" weight="bold" style={{ color: column.color }}>
                    {buckets[column.key].length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-[16px]" style={$loadingTextColor}>
                Loading orders...
              </Text>
            </View>
          ) : (
            <FlatList
              data={buckets[activeColumn]}
              renderItem={({ item }) => renderOrderCard(item)}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accent}
                />
              }
              ListEmptyComponent={renderEmptyColumn(
                COLUMNS.find((c) => c.key === activeColumn)?.label ?? "orders",
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={$listContainer}
            />
          )}
        </>
      )}
    </Screen>
  )
})

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities; data-driven
// column colors (dots, opacity-tinted chips/badges) and the selection-state
// segment background stay inline.
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

// Screen's fixed preset gives its inner container no height; without flex the
// order list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

// Selection-state background/border stays inline (conditional style).
const $segmentActive: ViewStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.accent,
}

// FlatList/ScrollView contentContainerStyle props take style objects.
const $listContainer: ViewStyle = {
  padding: spacing.lg,
  gap: spacing.md,
  flexGrow: 1,
}

const $kanbanContainer: ViewStyle = {
  padding: spacing.md,
  gap: spacing.md,
}

// Text color overrides (static, light-only).
const $titleColor: TextStyle = { color: colors.text }
const $connectionTextColor: TextStyle = { color: colors.textDim }
const $segmentTextColor: TextStyle = { color: colors.textDim }
const $segmentTextActiveColor: TextStyle = { color: colors.palette.neutral900 }
const $columnTitleColor: TextStyle = { color: colors.text }
const $columnCountColor: TextStyle = { color: colors.textDim }
const $orderNumberColor: TextStyle = { color: colors.text }
const $customerNameColor: TextStyle = { color: colors.text }
const $garmentSummaryColor: TextStyle = { color: colors.textDim }
const $orderAmountColor: TextStyle = { color: colors.accent }
const $orderTimeColor: TextStyle = { color: colors.palette.neutral500 }
const $emptyColumnTextColor: TextStyle = { color: colors.palette.neutral500 }
const $loadingTextColor: TextStyle = { color: colors.textDim }
