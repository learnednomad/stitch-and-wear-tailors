import React, { FC, useEffect, useState, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, View, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Card, Icon, Button } from "@/components"
import { useStores } from "@/models"
import { useAppTheme } from "@/utils/useAppTheme"
import { spacing } from "@/theme"
import { translate } from "@/i18n"

interface AnalyticsScreenProps extends AppStackScreenProps<"Analytics"> {}

// Chart dimensions
const screenWidth = Dimensions.get('window').width
const chartWidth = screenWidth - (spacing.lg * 2)

export const AnalyticsScreen: FC<AnalyticsScreenProps> = observer(function AnalyticsScreen() {
  const { analyticsStore } = useStores()
  const {
    theme: { colors },
    themed,
  } = useAppTheme()

  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [refreshing, setRefreshing] = useState(false)

  // Load analytics on mount
  useEffect(() => {
    loadAnalyticsData()
  }, [selectedPeriod])

  const loadAnalyticsData = async () => {
    try {
      await analyticsStore.loadAnalytics(selectedPeriod)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await analyticsStore.refreshAnalytics()
    } catch (error) {
      console.error("Failed to refresh analytics:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handlePeriodChange = (period: "7d" | "30d" | "90d" | "1y") => {
    setSelectedPeriod(period)
    analyticsStore.setSelectedPeriod(period)
  }

  // Computed values
  const dashboardSummary = useMemo(() => analyticsStore.dashboardSummary, [analyticsStore])
  const revenueTrend = useMemo(() => analyticsStore.revenueTrend, [analyticsStore])
  const orderEfficiency = useMemo(() => analyticsStore.orderEfficiency, [analyticsStore])
  const customerInsights = useMemo(() => analyticsStore.customerInsights, [analyticsStore])
  const financialHealth = useMemo(() => analyticsStore.financialHealth, [analyticsStore])
  const topGarments = useMemo(() => analyticsStore.getTopGarments(3), [analyticsStore])
  const topCities = useMemo(() => analyticsStore.getTopCities(3), [analyticsStore])

  // Format currency in Naira
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`
  }

  // Get trend indicator
  const getTrendIcon = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up": return "caretUp"
      case "down": return "caretDown"
      default: return "minus"
    }
  }

  const getTrendColor = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up": return "#10B981" // Green
      case "down": return "#EF4444" // Red
      default: return "#6B7280" // Gray
    }
  }

  // Get financial health color
  const getHealthColor = (score: number) => {
    if (score >= 75) return "#10B981" // Green - Excellent
    if (score >= 50) return "#F59E0B" // Yellow - Good
    if (score >= 25) return "#EF4444" // Red - Poor
    return "#6B7280" // Gray - Critical
  }

  const getHealthLabel = (score: number) => {
    if (score >= 75) return "Excellent"
    if (score >= 50) return "Good"
    if (score >= 25) return "Poor"
    return "Critical"
  }

  const renderPeriodSelector = () => (
    <View style={themed($periodSelector)}>
      {["7d", "30d", "90d", "1y"].map((period) => (
        <TouchableOpacity
          key={period}
          style={themed([
            $periodButton,
            selectedPeriod === period && { backgroundColor: colors.palette.secondary300 }
          ])}
          onPress={() => handlePeriodChange(period as any)}
        >
          <Text
            style={themed([
              $periodButtonText,
              selectedPeriod === period && { color: colors.palette.secondary600 }
            ])}
            text={period.toUpperCase()}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderKPICard = (title: string, value: string, subtitle?: string, trend?: {
    direction: "up" | "down" | "stable"
    value: string
  }, icon?: string) => (
    <Card style={themed($kpiCard)} preset="default">
      <View style={themed($kpiHeader)}>
        <View style={themed($kpiTitleContainer)}>
          {icon && <Icon icon={icon} size={20} color={colors.palette.primary600} />}
          <Text style={themed($kpiTitle)} text={title} />
        </View>
        {trend && (
          <View style={themed($trendContainer)}>
            <Icon
              icon={getTrendIcon(trend.direction)}
              size={16}
              color={getTrendColor(trend.direction)}
            />
            <Text
              style={themed([$trendText, { color: getTrendColor(trend.direction) }])}
              text={trend.value}
            />
          </View>
        )}
      </View>
      <Text style={themed($kpiValue)} text={value} />
      {subtitle && <Text style={themed($kpiSubtitle)} text={subtitle} />}
    </Card>
  )

  const renderTopGarmentsCard = () => (
    <Card style={themed($sectionCard)} preset="default">
      <View style={themed($sectionHeader)}>
        <Icon icon="star" size={20} color={colors.palette.primary600} />
        <Text style={themed($sectionTitle)} text="Top Performing Garments" />
      </View>
      {topGarments.length > 0 ? (
        topGarments.map((garment, index) => (
          <View key={garment.garmentType} style={themed($listItem)}>
            <View style={themed($rankContainer)}>
              <Text style={themed($rankText)} text={`${index + 1}`} />
            </View>
            <View style={themed($itemContent)}>
              <Text style={themed($itemTitle)} text={garment.garmentType.toUpperCase()} />
              <Text style={themed($itemSubtitle)} text={`${garment.orderCount} orders`} />
            </View>
            <View style={themed($itemValue)}>
              <Text style={themed($valueText)} text={formatCurrency(garment.revenue)} />
              <Text style={themed($valueSubtext)} text={formatPercentage(garment.profitMargin)} />
            </View>
          </View>
        ))
      ) : (
        <Text style={themed($emptyText)} text="No garment data available" />
      )}
    </Card>
  )

  const renderTopCitiesCard = () => (
    <Card style={themed($sectionCard)} preset="default">
      <View style={themed($sectionHeader)}>
        <Icon icon="location" size={20} color={colors.palette.primary600} />
        <Text style={themed($sectionTitle)} text="Top Markets" />
      </View>
      {topCities.length > 0 ? (
        topCities.map((city, index) => (
          <View key={city.city} style={themed($listItem)}>
            <View style={themed($rankContainer)}>
              <Text style={themed($rankText)} text={`${index + 1}`} />
            </View>
            <View style={themed($itemContent)}>
              <Text style={themed($itemTitle)} text={city.city.toUpperCase()} />
              <Text style={themed($itemSubtitle)} text={`${city.customerCount} customers`} />
            </View>
            <View style={themed($itemValue)}>
              <Text style={themed($valueText)} text={formatCurrency(city.revenue)} />
              <Text style={themed($valueSubtext)} text={formatCurrency(city.avgOrderValue)} />
            </View>
          </View>
        ))
      ) : (
        <Text style={themed($emptyText)} text="No city data available" />
      )}
    </Card>
  )

  const renderPerformanceCard = () => (
    <Card style={themed($sectionCard)} preset="default">
      <View style={themed($sectionHeader)}>
        <Icon icon="check" size={20} color={colors.palette.primary600} />
        <Text style={themed($sectionTitle)} text="Performance Metrics" />
      </View>
      <View style={themed($performanceGrid)}>
        <View style={themed($performanceItem)}>
          <Text style={themed($performanceLabel)} text="Quality Score" />
          <Text style={themed($performanceValue)} text={`${dashboardSummary.performance?.quality || 0}/100`} />
        </View>
        <View style={themed($performanceItem)}>
          <Text style={themed($performanceLabel)} text="Productivity" />
          <Text style={themed($performanceValue)} text={`${dashboardSummary.performance?.productivity || 0}/100`} />
        </View>
        <View style={themed($performanceItem)}>
          <Text style={themed($performanceLabel)} text="Efficiency" />
          <Text style={themed($performanceValue)} text={formatPercentage(dashboardSummary.performance?.efficiency || 0)} />
        </View>
        <View style={themed($performanceItem)}>
          <Text style={themed($performanceLabel)} text="On-Time Delivery" />
          <Text style={themed($performanceValue)} text={formatPercentage(orderEfficiency.onTimeRate)} />
        </View>
      </View>
    </Card>
  )

  const renderFinancialHealthCard = () => (
    <Card style={themed($sectionCard)} preset="default">
      <View style={themed($sectionHeader)}>
        <Icon icon="heart" size={20} color={getHealthColor(financialHealth.score)} />
        <Text style={themed($sectionTitle)} text="Financial Health" />
        <View style={themed([$healthBadge, { backgroundColor: getHealthColor(financialHealth.score) + "20" }])}>
          <Text style={themed([$healthText, { color: getHealthColor(financialHealth.score) }])}>
            {getHealthLabel(financialHealth.score)}
          </Text>
        </View>
      </View>
      <View style={themed($healthGrid)}>
        <View style={themed($healthItem)}>
          <Text style={themed($healthLabel)} text="Profit Margin" />
          <Text style={themed($healthValue)} text={formatPercentage(financialHealth.profitMargin)} />
        </View>
        <View style={themed($healthItem)}>
          <Text style={themed($healthLabel)} text="Cash Flow" />
          <Text style={themed($healthValue)} text={formatCurrency(financialHealth.cashFlow)} />
        </View>
        <View style={themed($healthItem)}>
          <Text style={themed($healthLabel)} text="ROI" />
          <Text style={themed($healthValue)} text={formatPercentage(financialHealth.roi)} />
        </View>
        <View style={themed($healthItem)}>
          <Text style={themed($healthLabel)} text="Health Score" />
          <Text style={themed($healthValue)} text={`${financialHealth.score}/100`} />
        </View>
      </View>
    </Card>
  )

  return (
    <Screen style={themed($root)} preset="fixed">
      {/* Header */}
      <View style={themed($header)}>
        <View style={themed($headerContent)}>
          <Text style={themed($headerTitle)} text="Business Analytics" />
          <Text style={themed($headerSubtitle)} text="Performance insights and metrics" />
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={analyticsStore.isLoading}>
          <Icon
            icon="refresh"
            size={24}
            color={analyticsStore.isLoading ? colors.palette.neutral400 : colors.palette.primary600}
          />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.palette.primary600}
          />
        }
      >
        {/* KPI Cards */}
        <View style={themed($kpiGrid)}>
          {renderKPICard(
            "Total Revenue",
            formatCurrency(dashboardSummary.totalRevenue || 0),
            `Avg: ${formatCurrency(dashboardSummary.avgOrderValue || 0)}`,
            {
              direction: revenueTrend.direction,
              value: formatPercentage(revenueTrend.growth)
            },
            "dollar"
          )}
          {renderKPICard(
            "Total Orders",
            (dashboardSummary.totalOrders || 0).toString(),
            `Active: ${orderEfficiency.totalActive}`,
            {
              direction: dashboardSummary.trends?.direction || "stable",
              value: formatPercentage(dashboardSummary.trends?.growthRate || 0)
            },
            "bag"
          )}
          {renderKPICard(
            "Customers",
            (dashboardSummary.totalCustomers || 0).toString(),
            `Retention: ${formatPercentage(customerInsights.retention)}`,
            undefined,
            "profile"
          )}
          {renderKPICard(
            "Satisfaction",
            `${(dashboardSummary.customerSatisfaction || 0).toFixed(1)}/5`,
            "Customer rating",
            undefined,
            "heart"
          )}
        </View>

        {/* Performance Metrics */}
        {renderPerformanceCard()}

        {/* Financial Health */}
        {renderFinancialHealthCard()}

        {/* Top Performing Sections */}
        <View style={themed($twoColumnGrid)}>
          {renderTopGarmentsCard()}
          {renderTopCitiesCard()}
        </View>

        {/* Export Options */}
        <Card style={themed($exportCard)} preset="default">
          <View style={themed($sectionHeader)}>
            <Icon icon="download" size={20} color={colors.palette.primary600} />
            <Text style={themed($sectionTitle)} text="Export Reports" />
          </View>
          <View style={themed($exportButtons)}>
            <Button
              text="Export Summary"
              preset="default"
              style={themed($exportButton)}
              onPress={() => analyticsStore.exportReport({ type: "summary" })}
            />
            <Button
              text="Financial Report"
              preset="default"
              style={themed($exportButton)}
              onPress={() => analyticsStore.exportReport({ type: "financial" })}
            />
          </View>
        </Card>

        {/* Loading/Error States */}
        {analyticsStore.isLoading && (
          <Card style={themed($statusCard)} preset="default">
            <Text style={themed($statusText)} text="Loading analytics..." />
          </Card>
        )}

        {analyticsStore.error && (
          <Card style={themed($statusCard)} preset="default">
            <Text style={themed([$statusText, { color: colors.palette.angry500 }])}>
              {analyticsStore.error}
            </Text>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  )
})

// Styles
const $root: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $headerContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 24,
  fontFamily: typography.primary.bold,
  color: colors.text,
  marginBottom: 4,
})

const $headerSubtitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
})

const $periodSelector: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  justifyContent: "space-between",
})

const $periodButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral100,
  minWidth: 60,
  alignItems: "center",
})

const $periodButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  color: colors.textDim,
})

const $scrollContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
})

const $kpiGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  marginVertical: spacing.md,
  marginHorizontal: -spacing.xs,
})

const $kpiCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: (chartWidth / 2) - spacing.xs,
  marginHorizontal: spacing.xs,
  marginBottom: spacing.sm,
  padding: spacing.md,
})

const $kpiHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.xs,
})

const $kpiTitleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.xs,
})

const $kpiTitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  color: colors.textDim,
  flex: 1,
})

const $trendContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $trendText: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 10,
  fontFamily: typography.primary.medium,
})

const $kpiValue: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 20,
  fontFamily: typography.primary.bold,
  color: colors.text,
  marginBottom: 2,
})

const $kpiSubtitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 11,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
})

const $sectionCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
  padding: spacing.md,
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
  gap: spacing.xs,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 16,
  fontFamily: typography.primary.semiBold,
  color: colors.text,
  flex: 1,
})

const $listItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $rankContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: colors.palette.primary100,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.sm,
})

const $rankText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.bold,
  color: colors.palette.primary600,
})

const $itemContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $itemTitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.medium,
  color: colors.text,
})

const $itemSubtitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
})

const $itemValue: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-end",
})

const $valueText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.semiBold,
  color: colors.text,
})

const $valueSubtext: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 11,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
})

const $emptyText: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  fontSize: 14,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
  textAlign: "center",
  paddingVertical: spacing.lg,
})

const $performanceGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  marginHorizontal: -spacing.xs,
})

const $performanceItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "50%",
  paddingHorizontal: spacing.xs,
  marginBottom: spacing.sm,
})

const $performanceLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
  marginBottom: 2,
})

const $performanceValue: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 16,
  fontFamily: typography.primary.semiBold,
  color: colors.text,
})

const $healthBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 12,
})

const $healthText: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 11,
  fontFamily: typography.primary.medium,
})

const $healthGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  marginHorizontal: -spacing.xs,
})

const $healthItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "50%",
  paddingHorizontal: spacing.xs,
  marginBottom: spacing.sm,
})

const $healthLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
  marginBottom: 2,
})

const $healthValue: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 16,
  fontFamily: typography.primary.semiBold,
  color: colors.text,
})

const $twoColumnGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginHorizontal: -spacing.xs,
})

const $exportCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
  padding: spacing.md,
})

const $exportButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $exportButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $statusCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
  padding: spacing.lg,
  alignItems: "center",
})

const $statusText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.normal,
  color: colors.textDim,
  textAlign: "center",
})

// Missing ThemedStyle import
import type { ThemedStyle } from "@/theme"