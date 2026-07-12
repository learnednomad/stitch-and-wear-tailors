/**
 * Order Tracking Screen (ORD-006)
 *
 * Vertical timeline of an order's stage history (server-hook-created
 * order_stages records) with live updates: subscribes to the order record
 * via the RealtimeManager while mounted and falls back to polling when SSE
 * is unavailable.
 */

import { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  Image,
  RefreshControl,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import { orderApi, PBOrderStageRecord } from "@/services/api/order-api"
import { COLLECTIONS } from "@/services/pocketbase/pocketbase-client"
import { fileUrl } from "@/services/pocketbase/pocketbase-client"
import { realtimeManager } from "@/services/realtime"
import { useRealtimeStatus } from "@/services/realtime"
import { formatRelativeTime } from "@/utils/formatRelativeTime"

/** Ordered PB pipeline statuses with display copy for the timeline */
const PIPELINE_STAGES: { status: string; title: string; description: string }[] = [
  { status: "pending", title: "Order Placed", description: "Waiting for a tailor to accept" },
  { status: "accepted", title: "Accepted", description: "A tailor has taken your order" },
  { status: "measuring", title: "Measuring", description: "Measurements being confirmed" },
  { status: "cutting", title: "Cutting", description: "Fabric cut to pattern" },
  { status: "sewing", title: "Sewing", description: "Garment construction" },
  { status: "finishing", title: "Finishing", description: "Final details and touches" },
  { status: "ready", title: "Ready", description: "Ready for pickup or delivery" },
  { status: "delivered", title: "Delivered", description: "Order completed" },
]

/** Terminal statuses rendered as a single red row instead of the pipeline */
const TERMINAL_STATUSES: Record<string, string> = {
  cancelled: "Order Cancelled",
  rejected: "Order Rejected",
}

interface OrderTrackingScreenProps extends AppStackScreenProps<"OrderTracking"> {}

export const OrderTrackingScreen: FC<OrderTrackingScreenProps> = observer(
  function OrderTrackingScreen({ route }) {
    const navigation = useNavigation()
    const { orderId } = route.params

    const [order, setOrder] = useState<Record<string, any> | null>(null)
    const [stages, setStages] = useState<PBOrderStageRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const realtimeStatus = useRealtimeStatus()

    // Fetch the order (domain snapshot) and its raw stage history
    const loadOrder = useCallback(async () => {
      const [orderResult, stagesResult] = await Promise.all([
        orderApi.fetchOrder(orderId),
        orderApi.fetchOrderStages(orderId),
      ])
      if (orderResult.success) setOrder(orderResult.data)
      if (stagesResult.success) setStages(stagesResult.data)
    }, [orderId])

    useEffect(() => {
      let cancelled = false
      setIsLoading(true)
      loadOrder().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
      return () => {
        cancelled = true
      }
    }, [loadOrder])

    // Live updates for this single order while the screen is mounted
    useEffect(() => {
      const unsubscribe = realtimeManager.subscribe(
        `order:${orderId}`,
        COLLECTIONS.ORDERS,
        () => {
          loadOrder()
        },
        { recordId: orderId, fallbackPoll: loadOrder },
      )
      return unsubscribe
    }, [orderId, loadOrder])

    const handleRefresh = async () => {
      setIsRefreshing(true)
      await loadOrder()
      setIsRefreshing(false)
    }

    // Latest stage record per PB status (stages arrive oldest-first)
    const latestByStatus: Record<string, PBOrderStageRecord> = {}
    for (const stage of stages) {
      latestByStatus[stage.status] = stage
    }

    const pbStatus = stages.length > 0 ? stages[stages.length - 1].status : "pending"
    const terminalTitle = TERMINAL_STATUSES[pbStatus]
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.status === pbStatus)

    const renderStage = (
      stageDef: (typeof PIPELINE_STAGES)[number],
      index: number,
      state: "completed" | "current" | "future",
    ) => {
      const record = latestByStatus[stageDef.status]
      const dotColor =
        state === "completed"
          ? colors.palette.success500
          : state === "current"
            ? colors.palette.primary500
            : colors.palette.neutral400
      const photoUri = record?.photo ? fileUrl(record as any, record.photo, "200x200") : ""

      return (
        <View key={stageDef.status} style={$stageRow}>
          {/* timeline rail: dot + connector */}
          <View style={$railColumn}>
            <View style={[$stageDot, { backgroundColor: dotColor + "20", borderColor: dotColor }]}>
              <Icon
                icon={state === "completed" ? "check" : state === "current" ? "settings" : "more"}
                size={16}
                color={dotColor}
              />
            </View>
            {index < PIPELINE_STAGES.length - 1 && (
              <View
                style={[
                  $railLine,
                  {
                    backgroundColor:
                      state === "completed" ? colors.palette.success500 : colors.palette.neutral300,
                  },
                ]}
              />
            )}
          </View>

          {/* stage content */}
          <View style={[$stageContent, state === "future" && $stageContentFuture]}>
            <View style={$stageTitleRow}>
              <Text style={[$stageTitle, state === "current" && $stageTitleCurrent]}>
                {stageDef.title}
              </Text>
              {record && <Text style={$stageTime}>{formatRelativeTime(record.created)}</Text>}
            </View>
            <Text style={$stageDescription}>
              {record?.note ? record.note : stageDef.description}
            </Text>
            {photoUri !== "" && <Image source={{ uri: photoUri }} style={$stagePhoto} />}
          </View>
        </View>
      )
    }

    return (
      <Screen
        backgroundColor={colors.palette.neutral100}
        safeAreaEdges={["top"]}
        preset="scroll"
        statusBarStyle="dark"
        ScrollViewProps={{
          refreshControl: (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.palette.tailorGold}
            />
          ),
        }}
      >
        {/* Header */}
        <View style={$header}>
          <TouchableOpacity
            style={$backButton}
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text style={$headerTitle}>Track Order</Text>
          {/* realtime connection indicator */}
          <View style={$connectionIndicator}>
            <View
              style={[
                $connectionDot,
                {
                  backgroundColor:
                    realtimeStatus === "live"
                      ? colors.palette.success500
                      : colors.palette.warning500,
                },
              ]}
            />
            <Text style={$connectionText}>{realtimeStatus === "live" ? "Live" : "Auto"}</Text>
          </View>
        </View>

        {isLoading || !order ? (
          <View style={$loadingContainer}>
            <Text style={$loadingText}>{isLoading ? "Loading order..." : "Order not found"}</Text>
          </View>
        ) : (
          <>
            {/* Order summary */}
            <View style={$summaryCard}>
              <View style={$summaryHeader}>
                <Text style={$orderNumber}>#{order.orderNumber}</Text>
                <Text style={$orderAmount}>₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}</Text>
              </View>
              <Text style={$orderGarment}>
                {String(order.garmentType ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </Text>
              {order.estimatedDeliveryDate && (
                <Text style={$orderDelivery}>
                  Est. delivery:{" "}
                  {new Date(order.estimatedDeliveryDate).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              )}
            </View>

            {/* Timeline */}
            <View style={$timelineContainer}>
              {terminalTitle ? (
                <View style={$terminalCard}>
                  <Icon icon="x" size={20} color={colors.palette.error500} />
                  <View style={$terminalTextContainer}>
                    <Text style={$terminalTitle}>{terminalTitle}</Text>
                    {latestByStatus[pbStatus]?.note ? (
                      <Text style={$terminalNote}>{latestByStatus[pbStatus].note}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {PIPELINE_STAGES.map((stageDef, index) => {
                const state: "completed" | "current" | "future" = terminalTitle
                  ? latestByStatus[stageDef.status]
                    ? "completed"
                    : "future"
                  : index < currentIndex
                    ? "completed"
                    : index === currentIndex
                      ? "current"
                      : "future"
                return renderStage(stageDef, index, state)
              })}
            </View>
          </>
        )}
      </Screen>
    )
  },
)

// Styles
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  flex: 1,
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $connectionIndicator: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  width: 40,
  justifyContent: "flex-end",
  gap: spacing.xxs,
}

const $connectionDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}

const $connectionText: TextStyle = {
  fontSize: 10,
  color: colors.palette.neutral600,
}

const $loadingContainer: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
}

const $summaryCard: ViewStyle = {
  margin: spacing.lg,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
}

const $summaryHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $orderNumber: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral600,
}

const $orderAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $orderGarment: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $orderDelivery: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
}

const $timelineContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
}

const $terminalCard: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  backgroundColor: colors.palette.error100,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.lg,
  gap: spacing.sm,
}

const $terminalTextContainer: ViewStyle = {
  flex: 1,
}

const $terminalTitle: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.palette.error500,
}

const $terminalNote: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral700,
  marginTop: spacing.xxs,
}

const $stageRow: ViewStyle = {
  flexDirection: "row",
}

const $railColumn: ViewStyle = {
  alignItems: "center",
  width: 40,
}

const $stageDot: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 1.5,
  justifyContent: "center",
  alignItems: "center",
}

const $railLine: ViewStyle = {
  width: 2,
  flex: 1,
  minHeight: 24,
}

const $stageContent: ViewStyle = {
  flex: 1,
  paddingLeft: spacing.md,
  paddingBottom: spacing.lg,
}

const $stageContentFuture: ViewStyle = {
  opacity: 0.5,
}

const $stageTitleRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $stageTitle: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $stageTitleCurrent: TextStyle = {
  color: colors.palette.primary600,
}

const $stageTime: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
}

const $stageDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginTop: spacing.xxs,
}

const $stagePhoto: ImageStyle = {
  width: 96,
  height: 96,
  borderRadius: 8,
  marginTop: spacing.sm,
  backgroundColor: colors.palette.neutral200,
}
