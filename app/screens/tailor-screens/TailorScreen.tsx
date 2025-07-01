import React, { FC, useState, useEffect } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  Dimensions,
} from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"

const { width } = Dimensions.get("window")

// Enhanced interfaces with better typing
interface Measurement {
  id: string
  name: string
  chest: number
  waist: number
  length: number
  style: string
  dateCollected: string
  status: "completed" | "pending" | "in-progress"
  imageUrl?: string
}

interface Order {
  id: string
  measurementName: string
  status: "pending" | "cutting" | "sewing" | "finishing" | "ready" | "delivered"
  dueDate: string
  paymentStatus: "pending" | "partial" | "paid"
  priority: "low" | "medium" | "high"
  estimatedProgress: number // 0-100
}

interface DashboardStats {
  totalOrders: number
  completedOrders: number
  pendingPayments: number
  upcomingDeadlines: number
}

interface TailorScreenProps extends AppStackScreenProps<"Tailor"> {}

const getGreeting = () => {
  const currentHour = new Date().getHours()
  const name = "John" // This would come from user context
  if (currentHour < 12) return `Good Morning, ${name}`
  if (currentHour < 18) return `Good Afternoon, ${name}`
  return `Good Evening, ${name}`
}

const getStatusColor = (status: Order["status"]) => {
  const statusColors = {
    pending: colors.palette.orange300,
    cutting: colors.palette.blue300,
    sewing: colors.palette.purple300,
    finishing: colors.palette.yellow300,
    ready: colors.palette.green300,
    delivered: colors.palette.green500,
  }
  return statusColors[status] || colors.palette.neutral400
}

const getPriorityColor = (priority: Order["priority"]) => {
  const priorityColors = {
    low: colors.palette.green500,
    medium: colors.palette.orange500,
    high: colors.palette.red500,
  }
  return priorityColors[priority]
}

export const TailorScreen: FC<TailorScreenProps> = () => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [greeting, setGreeting] = useState(getGreeting())
  const [activeTab, setActiveTab] = useState<"all" | "urgent">("all")

  // Enhanced dummy data with more realistic information
  const dashboardStats: DashboardStats = {
    totalOrders: 12,
    completedOrders: 8,
    pendingPayments: 3,
    upcomingDeadlines: 2,
  }

  const measurements: Measurement[] = [
    {
      id: "1",
      name: "Summer Kaftan",
      chest: 100,
      waist: 80,
      length: 120,
      style: "Plain Kaftan",
      dateCollected: "2025-06-01",
      status: "completed",
    },
    {
      id: "2",
      name: "Wedding Agbada",
      chest: 110,
      waist: 90,
      length: 130,
      style: "Traditional Agbada",
      dateCollected: "2025-06-05",
      status: "completed",
    },
    {
      id: "3",
      name: "Business Suit",
      chest: 105,
      waist: 85,
      length: 125,
      style: "Two-piece Suit",
      dateCollected: "2025-06-12",
      status: "in-progress",
    },
  ]

  const orders: Order[] = [
    {
      id: "ORD001",
      measurementName: "Summer Kaftan",
      status: "ready",
      dueDate: "2025-06-20",
      paymentStatus: "paid",
      priority: "medium",
      estimatedProgress: 100,
    },
    {
      id: "ORD002",
      measurementName: "Wedding Agbada",
      status: "sewing",
      dueDate: "2025-06-22",
      paymentStatus: "partial",
      priority: "high",
      estimatedProgress: 65,
    },
    {
      id: "ORD003",
      measurementName: "Business Suit",
      status: "cutting",
      dueDate: "2025-06-25",
      paymentStatus: "pending",
      priority: "low",
      estimatedProgress: 25,
    },
    {
      id: "ORD004",
      measurementName: "Casual Shirt",
      status: "finishing",
      dueDate: "2025-06-19",
      paymentStatus: "paid",
      priority: "high",
      estimatedProgress: 90,
    },
  ]

  const unreadNotifications = 5

  // Filter orders based on active tab
  const filteredOrders =
    activeTab === "urgent"
      ? orders.filter(
          (order) =>
            order.priority === "high" ||
            new Date(order.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        )
      : orders

  // Dashboard stats cards
  const renderStatsCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string
    value: number
    icon: string
    color: string
  }) => (
    <View style={[$statsCard, { borderLeftColor: color }]}>
      <View style={$statsContent}>
        <View style={$statsIconContainer}>
          <Icon icon={icon} size={20} color={color} />
        </View>
        <View style={$statsTextContainer}>
          <Text style={$statsValue}>{value}</Text>
          <Text style={$statsTitle}>{title}</Text>
        </View>
      </View>
    </View>
  )

  // Enhanced quick action card
  const renderQuickAction = ({
    item,
  }: {
    item: { title: string; icon: string; color: string; onPress: () => void }
  }) => (
    <TouchableOpacity
      style={$quickActionCard}
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
    >
      <View style={[$quickActionIconContainer, { backgroundColor: item.color + "20" }]}>
        <Icon icon={item.icon} size={24} color={item.color} />
      </View>
      <Text style={$quickActionText}>{item.title}</Text>
    </TouchableOpacity>
  )

  // Enhanced order card with progress indicator
  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={$orderCard}
      onPress={() => console.log(`Navigate to Order Details: ${item.id}`)}
      accessible
      accessibilityLabel={`Order: ${item.id}`}
    >
      <View style={$orderHeader}>
        <Text style={$orderTitle}>#{item.id}</Text>
        <View style={[$priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={$priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={$orderMeasurement}>{item.measurementName}</Text>

      <View style={$orderStatusContainer}>
        <View style={[$statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={$orderStatus}>{item.status.replace("-", " ").toUpperCase()}</Text>
      </View>

      <View style={$progressContainer}>
        <View style={$progressBar}>
          <View style={[$progressFill, { width: `${item.estimatedProgress}%` }]} />
        </View>
        <Text style={$progressText}>{item.estimatedProgress}%</Text>
      </View>

      <View style={$orderFooter}>
        <Text style={$orderDueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
        <View
          style={[
            $paymentStatus,
            {
              backgroundColor:
                item.paymentStatus === "paid"
                  ? colors.palette.green100
                  : item.paymentStatus === "partial"
                    ? colors.palette.orange100
                    : colors.palette.red100,
            },
          ]}
        >
          <Text
            style={[
              $paymentStatusText,
              {
                color:
                  item.paymentStatus === "paid"
                    ? colors.palette.green700
                    : item.paymentStatus === "partial"
                      ? colors.palette.orange700
                      : colors.palette.red700,
              },
            ]}
          >
            {item.paymentStatus.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  // Enhanced measurement card
  const renderMeasurement = (item: Measurement) => (
    <TouchableOpacity
      key={item.id}
      style={$measurementCard}
      onPress={() => console.log(`Navigate to Measurement Details: ${item.id}`)}
      accessible
      accessibilityLabel={`Measurement: ${item.name}`}
    >
      <View style={$measurementHeader}>
        <Text style={$measurementTitle}>{item.name}</Text>
        <View
          style={[
            $measurementStatusBadge,
            {
              backgroundColor:
                item.status === "completed"
                  ? colors.palette.green100
                  : item.status === "in-progress"
                    ? colors.palette.blue100
                    : colors.palette.orange100,
            },
          ]}
        >
          <Text
            style={[
              $measurementStatusText,
              {
                color:
                  item.status === "completed"
                    ? colors.palette.green700
                    : item.status === "in-progress"
                      ? colors.palette.blue700
                      : colors.palette.orange700,
              },
            ]}
          >
            {item.status.replace("-", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={$measurementStyle}>{item.style}</Text>

      <View style={$measurementDetails}>
        <View style={$measurementDetailItem}>
          <Icon icon="ruler" size={16} color={colors.palette.neutral600} />
          <Text style={$measurementText}>C: {item.chest}cm</Text>
        </View>
        <View style={$measurementDetailItem}>
          <Icon icon="ruler" size={16} color={colors.palette.neutral600} />
          <Text style={$measurementText}>W: {item.waist}cm</Text>
        </View>
        <View style={$measurementDetailItem}>
          <Icon icon="ruler" size={16} color={colors.palette.neutral600} />
          <Text style={$measurementText}>L: {item.length}cm</Text>
        </View>
      </View>

      <Text style={$measurementDate}>
        Collected: {new Date(item.dateCollected).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  // Enhanced quick actions with colors
  const quickActions = [
    {
      title: "New Order",
      icon: "plus",
      color: colors.palette.primary500,
      onPress: () => console.log("Navigate to New Order"),
    },
    {
      title: "Measurements",
      icon: "ruler",
      color: colors.palette.blue500,
      onPress: () => console.log("Navigate to Measurements"),
    },
    {
      title: "Fabrics",
      icon: "palette",
      color: colors.palette.purple500,
      onPress: () => console.log("Navigate to Fabric Catalog"),
    },
    {
      title: "Calendar",
      icon: "calendar",
      color: colors.palette.orange500,
      onPress: () => console.log("Navigate to Calendar"),
    },
  ]

  const statsData = [
    {
      title: "Total Orders",
      value: dashboardStats.totalOrders,
      icon: "list",
      color: colors.palette.blue500,
    },
    {
      title: "Completed",
      value: dashboardStats.completedOrders,
      icon: "check",
      color: colors.palette.green500,
    },
    {
      title: "Pending Payment",
      value: dashboardStats.pendingPayments,
      icon: "credit-card",
      color: colors.palette.orange500,
    },
    {
      title: "Due Soon",
      value: dashboardStats.upcomingDeadlines,
      icon: "clock",
      color: colors.palette.red500,
    },
  ]

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      contentContainerStyle={$root}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      <ScrollView style={$container} showsVerticalScrollIndicator={false}>
        {/* Enhanced Header */}
        <View style={$header}>
          <View style={$greetingContainer}>
            <Text style={$greetingText} accessibilityLabel={greeting}>
              {greeting}
            </Text>
            <Text style={$welcomeText}>Welcome back to your workshop</Text>
          </View>
          <TouchableOpacity
            style={$notificationIcon}
            onPress={() => console.log("Navigate to Notifications")}
            accessible
            accessibilityLabel="Notifications"
          >
            <Icon icon="bell" size={24} color={colors.palette.neutral700} />
            {unreadNotifications > 0 && (
              <View style={$notificationBadge}>
                <Text style={$notificationBadgeText}>
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Dashboard Stats */}
        <View style={$statsContainer}>
          <Text style={$sectionTitle}>Dashboard Overview</Text>
          <View style={$statsGrid}>
            {statsData.map((stat, index) => (
              <View key={index} style={$statsCardWrapper}>
                {renderStatsCard(stat)}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={$quickActionsContainer}>
          <Text style={$sectionTitle}>Quick Actions</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.title}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$quickActionListContent}
            accessibilityLabel="Quick Actions List"
          />
        </View>

        {/* Orders Section with Tabs */}
        <View style={$ordersContainer}>
          <View style={$ordersHeader}>
            <Text style={$sectionTitle}>Orders</Text>
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
          <FlatList
            data={filteredOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$orderListContent}
            accessibilityLabel="Orders List"
          />
        </View>

        {/* Recent Measurements */}
        <View style={$measurementsContainer}>
          <View style={$measurementsHeader}>
            <Text style={$sectionTitle}>Recent Measurements</Text>
            <TouchableOpacity onPress={() => console.log("View all measurements")}>
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {measurements.slice(0, 3).map(renderMeasurement)}
        </View>

        <View style={$bottomContainerInsets} />
      </ScrollView>
    </Screen>
  )
}

// Enhanced Styles
const $root: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.md,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.sm,
}

const $greetingContainer: ViewStyle = {
  flex: 1,
}

const $greetingText: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $welcomeText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
}

const $notificationIcon: ViewStyle = {
  padding: spacing.sm,
  position: "relative",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
}

const $notificationBadge: ViewStyle = {
  position: "absolute",
  top: -2,
  right: -2,
  backgroundColor: colors.error,
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xs,
}

const $notificationBadgeText: TextStyle = {
  color: colors.palette.neutral100,
  fontSize: 11,
  fontWeight: "bold",
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
  width: "48%",
  marginBottom: spacing.sm,
}

const $statsCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderLeftWidth: 4,
  padding: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $statsContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $statsIconContainer: ViewStyle = {
  marginRight: spacing.sm,
}

const $statsTextContainer: ViewStyle = {
  flex: 1,
}

const $statsValue: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  color: colors.palette.neutral900,
}

const $statsTitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: 2,
}

const $sectionTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

// Quick actions styles
const $quickActionsContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $quickActionListContent: ViewStyle = {
  paddingRight: spacing.lg,
}

const $quickActionCard: ViewStyle = {
  width: 100,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.sm,
  alignItems: "center",
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $quickActionIconContainer: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $quickActionText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral800,
  textAlign: "center",
}

// Orders styles
const $ordersContainer: ViewStyle = {
  marginBottom: spacing.lg,
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
  width: 280,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginRight: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $orderTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.palette.neutral900,
}

const $priorityBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $priorityText: TextStyle = {
  fontSize: 10,
  fontWeight: "bold",
  color: colors.palette.neutral100,
}

const $orderMeasurement: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
  marginBottom: spacing.sm,
}

const $orderStatusContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $statusIndicator: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: spacing.xs,
}

const $orderStatus: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral700,
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
  backgroundColor: colors.palette.primary500,
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
  color: colors.palette.neutral600,
}

const $paymentStatus: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $paymentStatusText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

// Measurements styles
const $measurementsContainer: ViewStyle = {
  marginBottom: spacing.xl,
}

const $measurementsHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $viewAllText: TextStyle = {
  fontSize: 14,
  color: colors.palette.primary500,
  fontWeight: "600",
}

const $measurementCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginBottom: spacing.sm,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const $measurementHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $measurementTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.palette.neutral900,
  flex: 1,
}

const $measurementStatusBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $measurementStatusText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

const $measurementStyle: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: spacing.sm,
}

const $measurementDetails: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-around",
  marginBottom: spacing.sm,
}

const $measurementDetailItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $measurementText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral700,
  marginLeft: spacing.xs,
  fontWeight: "500",
}

const $measurementDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}
