/**
 * Order Tracking Screen (ORD-006)
 *
 * Vertical timeline of an order's stage history (server-hook-created
 * order_stages records) with live updates: subscribes to the order record
 * via the RealtimeManager while mounted and falls back to polling when SSE
 * is unavailable.
 */

import { useRouter, useLocalSearchParams } from "expo-router"
import { FC, useCallback, useEffect, useState } from "react"
import { View, Image, RefreshControl, TouchableOpacity, ViewStyle, TextStyle } from "react-native"
import { Screen, Text, Icon } from "@/components"
import { colors } from "@/theme"
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


export const OrderTrackingScreen: FC = 
  function OrderTrackingScreen() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id: string }>()
    const orderId = id ?? ""

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
            ? colors.accent
            : colors.palette.neutral400
      const photoUri = record?.photo ? fileUrl(record as any, record.photo, "200x200") : ""

      return (
        <View key={stageDef.status} className="flex-row">
          {/* timeline rail: dot + connector */}
          <View className="items-center w-[40px]">
            <View
              className="w-[32px] h-[32px] rounded-[16px] border-[1.5px] justify-center items-center"
              style={{ backgroundColor: dotColor + "20", borderColor: dotColor }}
            >
              <Icon
                icon={state === "completed" ? "check" : state === "current" ? "settings" : "more"}
                size={16}
                color={dotColor}
              />
            </View>
            {index < PIPELINE_STAGES.length - 1 && (
              <View
                className="w-[2px] flex-1 min-h-[24px]"
                style={{
                  backgroundColor:
                    state === "completed" ? colors.palette.success500 : colors.palette.neutral300,
                }}
              />
            )}
          </View>

          {/* stage content */}
          <View className={`flex-1 pl-md pb-lg ${state === "future" ? "opacity-50" : ""}`}>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-[15px] font-semibold"
                style={{
                  color: state === "current" ? colors.accent : colors.palette.neutral900,
                }}
              >
                {stageDef.title}
              </Text>
              {record && (
                <Text className="text-[11px]" style={$stageTimeColor}>
                  {formatRelativeTime(record.created)}
                </Text>
              )}
            </View>
            <Text className="text-[13px] mt-xxs" style={$stageDescriptionColor}>
              {record?.note ? record.note : stageDef.description}
            </Text>
            {photoUri !== "" && (
              <Image
                source={{ uri: photoUri }}
                className="w-[96px] h-[96px] rounded-[8px] mt-sm bg-neutral200"
              />
            )}
          </View>
        </View>
      )
    }

    return (
      <Screen
        backgroundColor={colors.background}
        safeAreaEdges={["top"]}
        preset="scroll"
        statusBarStyle="dark"
        ScrollViewProps={{
          refreshControl: (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          ),
        }}
      >
        {/* Header */}
        <View className="flex-row items-center px-lg py-md border-b border-b-border">
          <TouchableOpacity
            className="w-[40px] h-[40px] justify-center items-center"
            onPress={() =>router.back()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-semibold text-center" style={$headerTitleColor}>
            Track Order
          </Text>
          {/* realtime connection indicator */}
          <View className="flex-row items-center w-[40px] justify-end gap-xxs">
            <View
              className="w-[8px] h-[8px] rounded-[4px]"
              style={{
                backgroundColor:
                  realtimeStatus === "live"
                    ? colors.palette.success500
                    : colors.palette.warning500,
              }}
            />
            <Text className="text-[10px]" style={$connectionTextColor}>
              {realtimeStatus === "live" ? "Live" : "Auto"}
            </Text>
          </View>
        </View>

        {isLoading || !order ? (
          <View className="p-xl items-center">
            <Text className="text-[16px]" style={$loadingTextColor}>
              {isLoading ? "Loading order..." : "Order not found"}
            </Text>
          </View>
        ) : (
          <>
            {/* Order summary */}
            <View
              className="m-lg bg-neutral100 rounded-[12px] p-lg border border-border"
              style={$summaryCardShadow}
            >
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[14px] font-semibold" style={$orderNumberColor}>
                  #{order.orderNumber}
                </Text>
                <Text className="text-[16px] font-bold" style={$orderAmountColor}>
                  ₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}
                </Text>
              </View>
              <Text className="text-[20px] font-bold mb-xs" style={$orderGarmentColor}>
                {String(order.garmentType ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </Text>
              {order.estimatedDeliveryDate && (
                <Text className="text-[13px]" style={$orderDeliveryColor}>
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
            <View className="px-lg pb-xl">
              {terminalTitle ? (
                <View className="flex-row items-start bg-error100 rounded-[8px] p-md mb-lg gap-sm">
                  <Icon icon="x" size={20} color={colors.palette.error500} />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold" style={$terminalTitleColor}>
                      {terminalTitle}
                    </Text>
                    {latestByStatus[pbStatus]?.note ? (
                      <Text className="text-[13px] mt-xxs" style={$terminalNoteColor}>
                        {latestByStatus[pbStatus].note}
                      </Text>
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
  }

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors and
// data-driven stage/dot colors stay inline (no `dark:` twins). Layout, spacing,
// and solid container backgrounds/borders are className token utilities.
const $summaryCardShadow: ViewStyle = {
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $connectionTextColor: TextStyle = { color: colors.palette.neutral600 }
const $loadingTextColor: TextStyle = { color: colors.palette.neutral600 }
const $orderNumberColor: TextStyle = { color: colors.palette.neutral600 }
const $orderAmountColor: TextStyle = { color: colors.palette.neutral900 }
const $orderGarmentColor: TextStyle = { color: colors.palette.neutral900 }
const $orderDeliveryColor: TextStyle = { color: colors.textDim }
const $terminalTitleColor: TextStyle = { color: colors.palette.error500 }
const $terminalNoteColor: TextStyle = { color: colors.palette.neutral700 }
const $stageTimeColor: TextStyle = { color: colors.palette.neutral500 }
const $stageDescriptionColor: TextStyle = { color: colors.palette.neutral600 }
