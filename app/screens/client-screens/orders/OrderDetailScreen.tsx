import React, { FC } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text, AutoImage } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"

interface ProgressStep {
  id: string
  title: string
  description: string
  status: "completed" | "current" | "pending"
  date?: string
}

interface OrderDetail {
  id: string
  measurementName: string
  status: string
  progress: string
  dueDate: string
  paymentStatus: "Pending" | "Partial" | "Paid"
  amount: number
  style: string
  fabric: string
  specialInstructions?: string
  estimatedHours: number
  actualHours?: number
  createdAt: string
}

interface OrderDetailScreenProps extends AppStackScreenProps<"OrderDetail"> {}

export const OrderDetailScreen: FC<OrderDetailScreenProps> = ({ route }) => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()

  // Extract order ID from route params
  const { orderId } = route?.params || { orderId: "TLR-2025-001" }

  // Mock order data - would come from API/store in real implementation
  const orderDetail: OrderDetail = {
    id: orderId,
    measurementName: "Summer Kaftan",
    status: "Sewing",
    progress: "sewing",
    dueDate: "June 10, 2025",
    paymentStatus: "Pending",
    amount: 45000,
    style: "Traditional Kaftan",
    fabric: "Ankara Cotton Blend",
    specialInstructions: "Extra long sleeves, traditional embroidery on neckline",
    estimatedHours: 12,
    actualHours: 8,
    createdAt: "May 25, 2025",
  }

  const progressSteps: ProgressStep[] = [
    {
      id: "consultation",
      title: "Consultation",
      description: "Initial design discussion",
      status: "completed",
      date: "May 25, 2025",
    },
    {
      id: "measuring",
      title: "Measurement",
      description: "Body measurements collected",
      status: "completed",
      date: "May 26, 2025",
    },
    {
      id: "cutting",
      title: "Cutting",
      description: "Fabric cut to pattern",
      status: "completed",
      date: "May 28, 2025",
    },
    {
      id: "sewing",
      title: "Sewing",
      description: "Garment construction",
      status: "current",
    },
    {
      id: "finishing",
      title: "Finishing",
      description: "Final details and quality check",
      status: "pending",
    },
    {
      id: "completed",
      title: "Completed",
      description: "Ready for pickup/delivery",
      status: "pending",
    },
  ]

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "check"
      case "current":
        return "settings"
      default:
        return "more"
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.palette.success500
      case "current":
        return colors.palette.primary500
      default:
        return colors.palette.neutral400
    }
  }

  const renderProgressStep = (step: ProgressStep, index: number) => (
    <View key={step.id} style={$progressStepContainer}>
      <View style={$progressStepContent}>
        <View style={[$progressIcon, { backgroundColor: getStepColor(step.status) + "20" }]}>
          <Icon icon={getStepIcon(step.status)} size={20} color={getStepColor(step.status)} />
        </View>
        <View style={$progressStepInfo}>
          <Text style={$progressStepTitle}>{step.title}</Text>
          <Text style={$progressStepDescription}>{step.description}</Text>
          {step.date && <Text style={$progressStepDate}>{step.date}</Text>}
        </View>
      </View>
      {index < progressSteps.length - 1 && (
        <View
          style={[
            $progressLine,
            {
              backgroundColor:
                step.status === "completed" ? colors.palette.success500 : colors.palette.neutral300,
            },
          ]}
        />
      )}
    </View>
  )

  const handlePayNow = () => {
    navigation.navigate("Payment" as never, {
      orderId: orderDetail.id,
      amount: orderDetail.amount,
      orderDetails: {
        measurementName: orderDetail.measurementName,
        status: orderDetail.status,
        dueDate: orderDetail.dueDate,
      },
    })
  }

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      <ScrollView style={$container} showsVerticalScrollIndicator={false}>
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
          <Text style={$headerTitle}>Order Details</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Order Summary Card */}
        <View style={$section}>
          <View style={$orderSummaryCard}>
            <View style={$orderHeader}>
              <Text style={$orderIdText}>#{orderDetail.id}</Text>
              <View style={[$statusBadge, { backgroundColor: colors.palette.primary500 + "20" }]}>
                <Text style={[$statusText, { color: colors.palette.primary500 }]}>
                  {orderDetail.status}
                </Text>
              </View>
            </View>
            <Text style={$orderTitle}>{orderDetail.measurementName}</Text>
            <View style={$orderDetailsGrid}>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Style</Text>
                <Text style={$orderDetailValue}>{orderDetail.style}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Fabric</Text>
                <Text style={$orderDetailValue}>{orderDetail.fabric}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Due Date</Text>
                <Text style={$orderDetailValue}>{orderDetail.dueDate}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Amount</Text>
                <Text style={$orderDetailValue}>₦{orderDetail.amount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Tracking */}
        <View style={$section}>
          <Text style={$sectionTitle}>Order Progress</Text>
          <View style={$progressContainer}>
            {progressSteps.map((step, index) => renderProgressStep(step, index))}
          </View>
        </View>

        {/* Special Instructions */}
        {orderDetail.specialInstructions && (
          <View style={$section}>
            <Text style={$sectionTitle}>Special Instructions</Text>
            <View style={$instructionsCard}>
              <Icon icon="view" size={20} color={colors.palette.primary500} />
              <Text style={$instructionsText}>{orderDetail.specialInstructions}</Text>
            </View>
          </View>
        )}

        {/* Order Timeline */}
        <View style={$section}>
          <Text style={$sectionTitle}>Timeline</Text>
          <View style={$timelineCard}>
            <View style={$timelineItem}>
              <Text style={$timelineLabel}>Estimated Hours</Text>
              <Text style={$timelineValue}>{orderDetail.estimatedHours}h</Text>
            </View>
            {orderDetail.actualHours && (
              <View style={$timelineItem}>
                <Text style={$timelineLabel}>Hours Completed</Text>
                <Text style={$timelineValue}>{orderDetail.actualHours}h</Text>
              </View>
            )}
            <View style={$timelineItem}>
              <Text style={$timelineLabel}>Order Created</Text>
              <Text style={$timelineValue}>{orderDetail.createdAt}</Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={$section}>
          <Text style={$sectionTitle}>Need Help?</Text>
          <View style={$contactActions}>
            <TouchableOpacity style={$contactButton}>
              <Icon icon="menu" size={20} color={colors.palette.primary500} />
              <Text style={$contactButtonText}>Message Tailor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={$contactButton}>
              <Icon icon="bell" size={20} color={colors.palette.primary500} />
              <Text style={$contactButtonText}>Call Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        {orderDetail.paymentStatus === "Pending" && (
          <Button
            text="Pay Now"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handlePayNow}
          />
        )}
        {orderDetail.status === "Ready" && (
          <Button
            text="Schedule Pickup"
            style={$secondaryButton}
            textStyle={$secondaryButtonText}
            onPress={() => console.log("Schedule pickup")}
          />
        )}
      </View>
    </Screen>
  )
}

// Styles
const $container: ViewStyle = {
  flex: 1,
}

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

const $headerSpacer: ViewStyle = {
  width: 40,
}

const $section: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

const $orderSummaryCard: ViewStyle = {
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

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $orderIdText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral600,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
}

const $statusText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}

const $orderTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

const $orderDetailsGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginHorizontal: -spacing.xs,
}

const $orderDetailItem: ViewStyle = {
  width: "50%",
  paddingHorizontal: spacing.xs,
  marginBottom: spacing.sm,
}

const $orderDetailLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $orderDetailValue: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $progressContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $progressStepContainer: ViewStyle = {
  position: "relative",
}

const $progressStepContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $progressIcon: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
}

const $progressStepInfo: ViewStyle = {
  flex: 1,
}

const $progressStepTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $progressStepDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $progressStepDate: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
  fontStyle: "italic",
}

const $progressLine: ViewStyle = {
  position: "absolute",
  left: 19,
  top: 40,
  width: 2,
  height: 20,
  zIndex: -1,
}

const $instructionsCard: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
  alignItems: "flex-start",
}

const $instructionsText: TextStyle = {
  flex: 1,
  fontSize: 14,
  color: colors.palette.primary700,
  marginLeft: spacing.sm,
  lineHeight: 20,
}

const $timelineCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $timelineItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
}

const $timelineLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
}

const $timelineValue: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral900,
}

const $contactActions: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const $contactButton: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
  marginHorizontal: spacing.xs,
}

const $contactButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.primary700,
  marginLeft: spacing.xs,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $primaryButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $primaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $secondaryButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
}
