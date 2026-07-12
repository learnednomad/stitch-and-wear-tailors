/**
 * Tailor Analytics Dashboard (ORD-014)
 *
 * Client-side analytics computed from PocketBase data for the logged-in
 * tailor: period selector (This week / This month / 3 months / Year), stat
 * tiles, a revenue bar chart (react-native-svg), popular garment types and a
 * ratings summary.
 *
 * Metric definitions:
 * - Revenue = sum of CONFIRMED payments (excluding refunds) recorded against
 *   the tailor's orders within the period, bucketed by confirmation date.
 * - Orders received = orders created in the period assigned to the tailor.
 * - Avg order value = mean order totalAmount across orders received.
 * - Avg completion = mean acceptedAt→completedAt days where both exist.
 * - Ratings summary is all-time (reviews are sparse enough to not period-cut).
 */

import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native"
import { observer } from "mobx-react-lite"
import Svg, { G, Rect, Text as SvgText } from "react-native-svg"
import { Screen, Text } from "@/components"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import {
  getPocketBaseAdapter,
  filters,
  COLLECTIONS,
} from "@/services/api/pocketbase-api-adapter"
import { PBOrderRecord, PBOrderItemRecord } from "@/services/api/order-api"
import { ServiceResult } from "@/services/api/base-api-service"

// ---------------------------------------------------------------------------
// Periods and date helpers
// ---------------------------------------------------------------------------

type PeriodKey = "week" | "month" | "3months" | "year"

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "3months", label: "3 months" },
  { key: "year", label: "Year" },
]

function periodStart(period: PeriodKey, now: Date = new Date()): Date {
  switch (period) {
    case "week": {
      const start = new Date(now)
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7)) // Monday
      start.setHours(0, 0, 0, 0)
      return start
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1)
    case "year":
      return new Date(now.getFullYear(), 0, 1)
  }
}

/** Format a Date as a PocketBase-comparable UTC date string */
function toPBDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19)
}

/** Parse PB-style date strings ("YYYY-MM-DD HH:mm:ss[.SSSZ]") safely */
function parseDate(value: string): number {
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const time = Date.parse(normalized)
  return Number.isNaN(time) ? Date.parse(value) : time
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface RevenueBucket {
  label: string
  amount: number
}

/** Empty revenue buckets for a period (daily / weekly / monthly granularity) */
function makeBuckets(period: PeriodKey, now: Date = new Date()): RevenueBucket[] {
  switch (period) {
    case "week":
      return DAY_LABELS.map((label) => ({ label, amount: 0 }))
    case "month": {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const weeks = Math.ceil(daysInMonth / 7)
      return Array.from({ length: weeks }, (_, i) => ({ label: `W${i + 1}`, amount: 0 }))
    }
    case "3months":
      return Array.from({ length: 3 }, (_, i) => {
        const month = (now.getMonth() - 2 + i + 12) % 12
        return { label: MONTH_LABELS[month], amount: 0 }
      })
    case "year":
      return MONTH_LABELS.map((label) => ({ label, amount: 0 }))
  }
}

/** Bucket index for a timestamp within the period (-1 = out of range) */
function bucketIndex(period: PeriodKey, time: number, start: Date, bucketCount: number): number {
  const date = new Date(time)
  let index: number
  switch (period) {
    case "week":
      index = Math.floor((time - start.getTime()) / 86400000)
      break
    case "month":
      index = Math.floor((date.getDate() - 1) / 7)
      break
    case "3months":
    case "year":
      index =
        (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth()
      break
  }
  return index >= 0 && index < bucketCount ? index : -1
}

function formatNaira(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₦${Math.round(amount / 1_000)}k`
  return `₦${Math.round(amount)}`
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

interface PBPaymentRecord {
  id: string
  order: string
  amount: number
  status: string
  paymentType: string
  confirmedAt?: string
  created: string
}

interface PBReviewRecord {
  id: string
  order: string
  tailor: string
  rating: number
  comment?: string
  created: string
}

/** Raw order record incl. the server-managed timestamps we need */
type PBOrderWithStamps = PBOrderRecord & { acceptedAt?: string; completedAt?: string }

interface AnalyticsData {
  ordersReceived: number
  ordersCompleted: number
  revenue: number
  avgOrderValue: number
  avgCompletionDays: number | null
  revenueBuckets: RevenueBucket[]
  garmentCounts: { type: string; count: number }[]
  ratingAvg: number | null
  ratingCount: number
}

function parseItemGarmentType(item: PBOrderItemRecord): string {
  const raw = item.specifications
  let specs: Record<string, any> = {}
  if (typeof raw === "string") {
    try {
      specs = JSON.parse(raw) ?? {}
    } catch {
      specs = {}
    }
  } else if (raw && typeof raw === "object") {
    specs = raw
  }
  return (specs.garmentType as string) || item.itemType || "custom"
}

async function loadAnalytics(tailorId: string, period: PeriodKey): Promise<AnalyticsData> {
  const adapter = getPocketBaseAdapter()
  const now = new Date()
  const start = periodStart(period, now)
  const from = toPBDate(start)

  const ordersResult = await adapter.list<PBOrderWithStamps>(COLLECTIONS.ORDERS, {
    filter: filters.and(filters.eq("tailor", tailorId), filters.gte("created", from)),
    sort: "-created",
    perPage: 500,
  })
  const orders = ordersResult.success ? ordersResult.data.items : []
  const orderIds = orders.map((o) => o.id)

  const itemsPromise: Promise<ServiceResult<PBOrderItemRecord[]>> =
    orderIds.length > 0
      ? adapter.fullList<PBOrderItemRecord>(COLLECTIONS.ORDER_ITEMS, {
          filter: filters.in("order", orderIds),
        })
      : Promise.resolve({ success: true, data: [] })

  const [paymentsResult, itemsResult, reviewsResult] = await Promise.all([
    adapter.fullList<PBPaymentRecord>(COLLECTIONS.PAYMENTS, {
      filter: filters.and(
        filters.eq("order.tailor", tailorId),
        filters.eq("status", "confirmed"),
        filters.neq("paymentType", "refund"),
        filters.gte("created", from),
      ),
    }),
    itemsPromise,
    adapter.fullList<PBReviewRecord>(COLLECTIONS.REVIEWS, {
      filter: filters.eq("tailor", tailorId),
    }),
  ])

  // Stat tiles
  const ordersReceived = orders.length
  const completedOrders = orders.filter((o) => o.status === "delivered")
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)
  const avgOrderValue = ordersReceived > 0 ? totalOrderValue / ordersReceived : 0

  const completionDays = orders
    .filter((o) => o.acceptedAt && o.completedAt)
    .map((o) => (parseDate(o.completedAt!) - parseDate(o.acceptedAt!)) / 86400000)
    .filter((days) => Number.isFinite(days) && days >= 0)
  const avgCompletionDays =
    completionDays.length > 0
      ? completionDays.reduce((sum, d) => sum + d, 0) / completionDays.length
      : null

  // Revenue: confirmed payments bucketed by confirmation date
  const payments = paymentsResult.success ? paymentsResult.data : []
  const revenue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const revenueBuckets = makeBuckets(period, now)
  for (const payment of payments) {
    const time = parseDate(payment.confirmedAt || payment.created)
    if (Number.isNaN(time)) continue
    const index = bucketIndex(period, time, start, revenueBuckets.length)
    if (index >= 0) revenueBuckets[index].amount += payment.amount ?? 0
  }

  // Popular garment types from order_items specifications
  const items = itemsResult.success ? itemsResult.data : []
  const garmentTally: Record<string, number> = {}
  for (const item of items) {
    const type = parseItemGarmentType(item)
    garmentTally[type] = (garmentTally[type] ?? 0) + (item.quantity ?? 1)
  }
  const garmentCounts = Object.entries(garmentTally)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Ratings (all-time)
  const reviews = reviewsResult.success ? reviewsResult.data : []
  const ratingCount = reviews.length
  const ratingAvg =
    ratingCount > 0 ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingCount : null

  return {
    ordersReceived,
    ordersCompleted: completedOrders.length,
    revenue,
    avgOrderValue,
    avgCompletionDays,
    revenueBuckets,
    garmentCounts,
    ratingAvg,
    ratingCount,
  }
}

// ---------------------------------------------------------------------------
// Revenue bar chart (react-native-svg, no chart deps)
// ---------------------------------------------------------------------------

const CHART_HEIGHT = 160
const CHART_TOP_PAD = 18
const CHART_BOTTOM_PAD = 22

const RevenueBarChart: FC<{ buckets: RevenueBucket[]; width: number }> = ({ buckets, width }) => {
  const max = Math.max(...buckets.map((b) => b.amount), 0)
  if (max <= 0) {
    return (
      <View style={$chartEmpty}>
        <Text style={$emptyText}>No revenue recorded in this period</Text>
      </View>
    )
  }

  const count = buckets.length
  const gap = count > 8 ? 4 : 8
  const barWidth = Math.max((width - gap * (count + 1)) / count, 4)
  const plotHeight = CHART_HEIGHT - CHART_TOP_PAD - CHART_BOTTOM_PAD
  const showEveryLabel = count <= 8

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {buckets.map((bucket, i) => {
        const barHeight = max > 0 ? (bucket.amount / max) * plotHeight : 0
        const x = gap + i * (barWidth + gap)
        const y = CHART_TOP_PAD + plotHeight - barHeight
        const showLabel = showEveryLabel || i % 2 === 0
        return (
          <G key={bucket.label + i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, bucket.amount > 0 ? 2 : 0)}
              rx={3}
              fill={bucket.amount > 0 ? colors.palette.tailorGold : colors.palette.neutral300}
            />
            {bucket.amount > 0 && barWidth >= 18 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                fontSize={9}
                fill={colors.palette.neutral600}
                textAnchor="middle"
              >
                {formatNaira(bucket.amount)}
              </SvgText>
            )}
            {showLabel && (
              <SvgText
                x={x + barWidth / 2}
                y={CHART_HEIGHT - 6}
                fontSize={10}
                fill={colors.palette.neutral500}
                textAnchor="middle"
              >
                {bucket.label}
              </SvgText>
            )}
          </G>
        )
      })}
    </Svg>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const AnalyticsScreen: FC = observer(function AnalyticsScreen() {
  const { authStore } = useStores()
  const { width } = useWindowDimensions()

  const [period, setPeriod] = useState<PeriodKey>("month")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const tailorId = authStore.user?.id

  const load = useCallback(async () => {
    if (!tailorId) return
    try {
      setErrorMessage(null)
      const result = await loadAnalytics(tailorId, period)
      setData(result)
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Failed to load analytics")
    }
  }, [tailorId, period])

  useEffect(() => {
    setIsLoading(true)
    load().finally(() => setIsLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await load()
    setIsRefreshing(false)
  }, [load])

  const chartWidth = width - spacing.lg * 2 - spacing.md * 2

  const titleCase = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

  const statTiles = useMemo(() => {
    if (!data) return []
    return [
      { label: "Orders Received", value: String(data.ordersReceived) },
      { label: "Completed", value: String(data.ordersCompleted) },
      { label: "Revenue", value: formatNaira(data.revenue) },
      { label: "Avg Order Value", value: formatNaira(data.avgOrderValue) },
      {
        label: "Avg Completion",
        value: data.avgCompletionDays !== null ? `${data.avgCompletionDays.toFixed(1)} days` : "—",
      },
      {
        label: "Rating",
        value: data.ratingAvg !== null ? `${data.ratingAvg.toFixed(1)} ★` : "—",
        sub: data.ratingCount > 0 ? `${data.ratingCount} review${data.ratingCount === 1 ? "" : "s"}` : "No reviews yet",
      },
    ]
  }, [data])

  const maxGarmentCount = data ? Math.max(...data.garmentCounts.map((g) => g.count), 1) : 1

  return (
    <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} statusBarStyle="dark">
      <View style={$header}>
        <Text style={$title}>Analytics</Text>
      </View>

      <ScrollView
        style={$scroll}
        contentContainerStyle={$scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.palette.tailorGold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <View style={$periodRow}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[$periodChip, period === option.key && $periodChipActive]}
              onPress={() => setPeriod(option.key)}
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: period === option.key }}
            >
              <Text style={[$periodChipText, period === option.key && $periodChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={$centerState}>
            <Text style={$emptyText}>Loading analytics...</Text>
          </View>
        ) : errorMessage ? (
          <View style={$centerState}>
            <Text style={$emptyText}>{errorMessage}</Text>
          </View>
        ) : !data || data.ordersReceived === 0 ? (
          <View style={$centerState}>
            <Text style={$emptyTitle}>No orders in this period</Text>
            <Text style={$emptyText}>
              Stats will appear here once you receive orders. Try a longer period.
            </Text>
          </View>
        ) : (
          <>
            {/* Stat tiles */}
            <View style={$tileGrid}>
              {statTiles.map((tile) => (
                <View key={tile.label} style={$tile}>
                  <Text style={$tileValue}>{tile.value}</Text>
                  <Text style={$tileLabel}>{tile.label}</Text>
                  {"sub" in tile && tile.sub ? <Text style={$tileSub}>{tile.sub}</Text> : null}
                </View>
              ))}
            </View>

            {/* Revenue chart */}
            <View style={$card}>
              <Text style={$cardTitle}>Revenue</Text>
              <RevenueBarChart buckets={data.revenueBuckets} width={chartWidth} />
            </View>

            {/* Popular garment types */}
            <View style={$card}>
              <Text style={$cardTitle}>Popular Garments</Text>
              {data.garmentCounts.length === 0 ? (
                <Text style={$emptyText}>No garment data yet</Text>
              ) : (
                data.garmentCounts.map((garment) => (
                  <View key={garment.type} style={$garmentRow}>
                    <Text style={$garmentLabel} numberOfLines={1}>
                      {titleCase(garment.type)}
                    </Text>
                    <View style={$garmentBarTrack}>
                      <View
                        style={[
                          $garmentBarFill,
                          { width: `${(garment.count / maxGarmentCount) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={$garmentCount}>{garment.count}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
})

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral100,
}

const $header: ViewStyle = {
  padding: spacing.lg,
  backgroundColor: colors.palette.warmIvory,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $scroll: ViewStyle = {
  flex: 1,
}

const $scrollContent: ViewStyle = {
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
}

const $periodRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
}

const $periodChip: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral200,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  alignItems: "center",
}

const $periodChipActive: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderColor: colors.palette.tailorGold,
}

const $periodChipText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $periodChipTextActive: TextStyle = {
  color: colors.palette.warmIvory,
  fontWeight: "600",
}

const $tileGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
}

const $tile: ViewStyle = {
  flexBasis: "47%",
  flexGrow: 1,
  backgroundColor: colors.palette.warmIvory,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $tileValue: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $tileLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $tileSub: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
  marginTop: 2,
}

const $card: ViewStyle = {
  backgroundColor: colors.palette.warmIvory,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  gap: spacing.sm,
}

const $cardTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $chartEmpty: ViewStyle = {
  height: CHART_HEIGHT,
  justifyContent: "center",
  alignItems: "center",
}

const $garmentRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $garmentLabel: TextStyle = {
  width: 110,
  fontSize: 13,
  color: colors.palette.deepCharcoal,
}

const $garmentBarTrack: ViewStyle = {
  flex: 1,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  overflow: "hidden",
}

const $garmentBarFill: ViewStyle = {
  height: "100%",
  borderRadius: 4,
  backgroundColor: colors.palette.threadBlue,
}

const $garmentCount: TextStyle = {
  width: 24,
  fontSize: 13,
  fontWeight: "600",
  color: colors.palette.neutral600,
  textAlign: "right",
}

const $centerState: ViewStyle = {
  paddingVertical: spacing.xxl,
  alignItems: "center",
  gap: spacing.xs,
}

const $emptyTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $emptyText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral500,
  textAlign: "center",
}
