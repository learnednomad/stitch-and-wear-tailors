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
import { useStores } from "@/models"
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
  const { authStore } = useStores()
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
        style={$orderCard}
        onPress={() => (navigation as any).navigate("OrderDetail", { orderId: order.id })}
        accessible
        accessibilityLabel={`Order ${order.orderNumber}`}
      >
        <View style={$cardHeader}>
          <Text style={$orderNumber}>#{order.orderNumber}</Text>
          <View style={[$statusChip, { backgroundColor: columnColor + "20" }]}>
            <Text style={[$statusChipText, { color: columnColor }]}>{statusLabel(order)}</Text>
          </View>
        </View>

        <Text style={$customerName}>{customerName}</Text>
        <Text style={$garmentSummary}>
          {titleCase(order.garmentType ?? "custom")}
          {order.styleConfig?.designNotes ? ` • ${order.styleConfig.designNotes}` : ""}
        </Text>

        <View style={$cardFooter}>
          <Text style={$orderAmount}>₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}</Text>
          <Text style={$orderTime}>{formatRelativeTime(order.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyColumn = (label: string) => (
    <View style={$emptyColumn}>
      <Icon icon="sew" size={32} color={colors.palette.neutral400} />
      <Text style={$emptyColumnText}>No {label.toLowerCase()}</Text>
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
      <View style={$header}>
        <Text style={$title}>Orders</Text>
        <View style={$connectionIndicator}>
          <View
            style={[
              $connectionDot,
              {
                backgroundColor:
                  realtimeStatus === "live" ? colors.palette.success500 : colors.palette.warning500,
              },
            ]}
          />
          <Text style={$connectionText}>{realtimeStatus === "live" ? "Live" : "Auto"}</Text>
        </View>
      </View>

      {/* Search + lightweight filters (statuses are the board columns) */}
      <View style={$filterBarContainer}>
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
            <View key={column.key} style={$kanbanColumn}>
              <View style={$columnHeader}>
                <View style={[$columnDot, { backgroundColor: column.color }]} />
                <Text style={$columnTitle}>{column.label}</Text>
                <Text style={$columnCount}>{buckets[column.key].length}</Text>
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
          <View style={$segmentRow}>
            {COLUMNS.map((column) => (
              <TouchableOpacity
                key={column.key}
                style={[$segment, activeColumn === column.key && $segmentActive]}
                onPress={() => setActiveColumn(column.key)}
              >
                <Text
                  style={[$segmentText, activeColumn === column.key && $segmentTextActive]}
                  numberOfLines={1}
                >
                  {column.label}
                </Text>
                <View style={[$segmentBadge, { backgroundColor: column.color + "30" }]}>
                  <Text style={[$segmentBadgeText, { color: column.color }]}>
                    {buckets[column.key].length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View style={$loadingState}>
              <Text style={$loadingText}>Loading orders...</Text>
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
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

// Screen's fixed preset gives its inner container no height; without flex the
// order list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.md,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.text,
}

const $connectionIndicator: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
}

const $connectionDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}

const $connectionText: TextStyle = {
  fontSize: 11,
  color: colors.textDim,
}

const $filterBarContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
}

const $segmentRow: ViewStyle = {
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.xs,
}

const $segment: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xxs,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.xxs,
  borderRadius: 8,
  backgroundColor: colors.palette.sand200,
}

const $segmentActive: ViewStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.accent,
}

const $segmentText: TextStyle = {
  fontSize: 11,
  fontWeight: "500",
  color: colors.textDim,
  flexShrink: 1,
}

const $segmentTextActive: TextStyle = {
  color: colors.palette.neutral900,
  fontWeight: "600",
}

const $segmentBadge: ViewStyle = {
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 4,
}

const $segmentBadgeText: TextStyle = {
  fontSize: 10,
  fontWeight: "700",
}

const $listContainer: ViewStyle = {
  padding: spacing.lg,
  gap: spacing.md,
  flexGrow: 1,
}

const $kanbanContainer: ViewStyle = {
  padding: spacing.md,
  gap: spacing.md,
}

const $kanbanColumn: ViewStyle = {
  width: 300,
  backgroundColor: colors.palette.sand100,
  borderRadius: 16,
  padding: spacing.sm,
}

const $columnHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.xs,
  paddingBottom: spacing.sm,
}

const $columnDot: ViewStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
}

const $columnTitle: TextStyle = {
  flex: 1,
  fontSize: 14,
  fontWeight: "700",
  color: colors.text,
}

const $columnCount: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
}

const $orderCard: ViewStyle = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
}

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $orderNumber: TextStyle = {
  fontSize: 14,
  fontWeight: "700",
  color: colors.text,
}

const $statusChip: ViewStyle = {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 3,
}

const $statusChipText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
}

const $customerName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xxs,
}

const $garmentSummary: TextStyle = {
  fontSize: 12,
  color: colors.textDim,
  marginBottom: spacing.sm,
}

const $cardFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
}

const $orderAmount: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.accent,
}

const $orderTime: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
}

const $emptyColumn: ViewStyle = {
  alignItems: "center",
  padding: spacing.xl,
  gap: spacing.sm,
}

const $emptyColumnText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral500,
}

const $loadingState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.textDim,
}
