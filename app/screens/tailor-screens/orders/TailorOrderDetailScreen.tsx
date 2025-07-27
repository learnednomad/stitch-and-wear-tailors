/**
 * Tailor Order Detail Screen
 * Comprehensive order detail and stage management interface for tailors
 */

import React, { FC, useState, useEffect } from "react"
import {
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
} from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Icon, Button, Card, TextField } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { OrderStatus, OrderStage, OrderPriority } from "@/types/orders"

interface TailorOrderDetailScreenProps extends AppStackScreenProps<"TailorOrderDetail"> {
  route: { params: { orderId: string } }
}

export const TailorOrderDetailScreen: FC<TailorOrderDetailScreenProps> = observer(({ route, navigation }) => {
  const { orderId } = route.params
  const { orderStore } = useStores()
  const [refreshing, setRefreshing] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [progressNotes, setProgressNotes] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null)
  const [selectedStage, setSelectedStage] = useState<OrderStage | null>(null)
  
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      await orderStore.loadNigerianOrder(orderId)
    } catch (error) {
      console.error("Failed to load order details:", error)
      Alert.alert("Error", "Failed to load order details")
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadOrderDetails()
    } finally {
      setRefreshing(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !orderStore.currentOrder) return

    try {
      orderStore.updateNigerianOrderStatus(orderStore.currentOrder.id, selectedStatus, progressNotes)
      setShowStatusModal(false)
      setProgressNotes("")
      setSelectedStatus(null)
      Alert.alert("Success", "Order status updated successfully")
    } catch (error) {
      console.error("Failed to update status:", error)
      Alert.alert("Error", "Failed to update order status")
    }
  }

  const handleStageUpdate = async () => {
    if (!selectedStage || !orderStore.currentOrder) return

    try {
      orderStore.updateNigerianOrderStage(
        orderStore.currentOrder.id, 
        selectedStage, 
        "current-tailor-id", // This should come from auth
        progressNotes
      )
      setShowStageModal(false)
      setProgressNotes("")
      setSelectedStage(null)
      Alert.alert("Success", "Order stage updated successfully")
    } catch (error) {
      console.error("Failed to update stage:", error)
      Alert.alert("Error", "Failed to update order stage")
    }
  }

  const handleAssignToSelf = async () => {
    if (!orderStore.currentOrder) return

    Alert.alert(
      "Assign Order",
      "Assign this order to yourself?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            try {
              orderStore.assignNigerianTailor(orderStore.currentOrder!.id, "current-tailor-id")
              Alert.alert("Success", "Order assigned to you successfully")
            } catch (error) {
              Alert.alert("Error", "Failed to assign order")
            }
          }
        }
      ]
    )
  }

  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Cancellation Reason",
              "Please provide a reason for cancellation:",
              async (reason) => {
                if (reason && orderStore.currentOrder) {
                  try {
                    await orderStore.cancelNigerianOrder(orderStore.currentOrder.id, reason)
                    Alert.alert("Success", "Order cancelled successfully")
                    navigation.goBack()
                  } catch (error) {
                    Alert.alert("Error", "Failed to cancel order")
                  }
                }
              }
            )
          }
        }
      ]
    )
  }

  const order = orderStore.currentOrder
  if (!order) {
    return (
      <Screen backgroundColor={colors.palette.warmIvory} safeAreaEdges={["top"]} preset="fixed">
        <View style={$loadingContainer}>
          <Text style={$loadingText}>Loading order details...</Text>
        </View>
      </Screen>
    )
  }

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "pending": return colors.palette.threadBlue
      case "confirmed": return colors.palette.sageGreen
      case "in_progress": return colors.palette.tailorGold
      case "ready": return colors.palette.deepCharcoal
      case "delivered": return colors.palette.sageGreen
      case "cancelled": return colors.error
      default: return colors.palette.threadBlue
    }
  }

  const getPriorityColor = (priority: OrderPriority): string => {
    switch (priority) {
      case "urgent": return colors.error
      case "high": return colors.palette.orange500
      case "normal": return colors.palette.threadBlue
      case "low": return colors.palette.neutral500
      default: return colors.palette.threadBlue
    }
  }

  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const stages: Array<{
    stage: OrderStage
    title: string
    description: string
    icon: string
  }> = [
    {
      stage: "received",
      title: "Order Received",
      description: "Order has been received and is being reviewed",
      icon: "checkmark",
    },
    {
      stage: "measured",
      title: "Measurements Confirmed",
      description: "Customer measurements have been verified",
      icon: "settings",
    },
    {
      stage: "cutting",
      title: "Fabric Cutting",
      description: "Fabric is being carefully cut to pattern",
      icon: "build",
    },
    {
      stage: "sewing",
      title: "Sewing in Progress",
      description: "Garment is being skillfully sewn together",
      icon: "construct",
    },
    {
      stage: "finishing",
      title: "Finishing Touches",
      description: "Final details and finishing touches being applied",
      icon: "sparkles",
    },
    {
      stage: "quality_check",
      title: "Quality Inspection",
      description: "Final quality check and approval",
      icon: "star",
    },
    {
      stage: "completed",
      title: "Ready for Delivery",
      description: "Garment is complete and ready for customer",
      icon: "gift",
    },
  ]

  const getStageStatus = (stage: OrderStage): "completed" | "current" | "pending" => {
    const currentStageIndex = stages.findIndex(s => s.stage === order.progress.currentStage)
    const stageIndex = stages.findIndex(s => s.stage === stage)
    
    if (stageIndex < currentStageIndex) return "completed"
    if (stageIndex === currentStageIndex) return "current"
    return "pending"
  }

  const orderStatuses: Array<{ label: string; value: OrderStatus }> = [
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "In Progress", value: "in_progress" },
    { label: "Ready", value: "ready" },
    { label: "Delivered", value: "delivered" },
  ]

  const orderStages: Array<{ label: string; value: OrderStage }> = [
    { label: "Received", value: "received" },
    { label: "Measured", value: "measured" },
    { label: "Cutting", value: "cutting" },
    { label: "Sewing", value: "sewing" },
    { label: "Finishing", value: "finishing" },
    { label: "Quality Check", value: "quality_check" },
    { label: "Completed", value: "completed" },
  ]

  return (
    <Screen
      backgroundColor={colors.palette.warmIvory}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }}
    >
      {/* Header */}
      <View style={$header}>
        <Button
          style={$backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Icon icon="back" size={24} color={colors.palette.deepCharcoal} />
        </Button>
        
        <View style={$headerCenter}>
          <Text style={$headerTitle}>Order Details</Text>
          <Text style={$headerSubtitle}>#{order.orderNumber}</Text>
        </View>
        
        <TouchableOpacity style={$moreButton}>
          <Icon icon="menu" size={24} color={colors.palette.deepCharcoal} />
        </TouchableOpacity>
      </View>

      {/* Order Summary */}
      <Card style={$summaryCard} preset="default">
        <View style={$summaryHeader}>
          <View>
            <Text style={$orderNumber}>#{order.orderNumber}</Text>
            <Text style={$customerName}>
              {order.customerInfo.firstName} {order.customerInfo.lastName}
            </Text>
            <Text style={$garmentType}>
              {orderStore.getTranslation("garments", order.garmentType)}
            </Text>
          </View>
          <View style={$summaryBadges}>
            <View style={[$priorityBadge, { backgroundColor: getPriorityColor(order.priority) + "20" }]}>
              <Text style={[$priorityText, { color: getPriorityColor(order.priority) }]}>
                {order.priority.toUpperCase()}
              </Text>
            </View>
            <View style={[$statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
              <Text style={[$statusText, { color: getStatusColor(order.status) }]}>
                {order.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={$progressSection}>
          <Text style={$progressLabel}>Overall Progress: {order.progress.percentage}%</Text>
          <View style={$progressBarContainer}>
            <View 
              style={[
                $progressBar,
                { width: `${order.progress.percentage}%` }
              ]} 
            />
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Card style={$actionsCard} preset="default">
        <Text style={$sectionTitle}>Quick Actions</Text>
        <View style={$actionButtons}>
          <Button
            text="Update Status"
            style={$actionButton}
            textStyle={$actionButtonText}
            onPress={() => setShowStatusModal(true)}
          />
          <Button
            text="Update Stage"
            style={$actionButton}
            textStyle={$actionButtonText}
            onPress={() => setShowStageModal(true)}
          />
          {!order.tailorId && (
            <Button
              text="Assign to Me"
              style={[$actionButton, $primaryActionButton]}
              textStyle={$primaryActionButtonText}
              onPress={handleAssignToSelf}
            />
          )}
        </View>
      </Card>

      {/* Stage Timeline */}
      <Card style={$timelineCard} preset="default">
        <Text style={$sectionTitle}>Production Timeline</Text>
        
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.stage)
          const stageProgress = order.progress.stageProgress.find(
            sp => sp.stage === stage.stage
          )
          
          return (
            <View key={stage.stage} style={$stageItem}>
              <View style={$stageIndicator}>
                <View style={[
                  $stageIcon,
                  status === "completed" && $completedStage,
                  status === "current" && $currentStage,
                  status === "pending" && $pendingStage,
                ]}>
                  <Icon
                    icon={status === "completed" ? "checkmark" : stage.icon as any}
                    size={16}
                    color={
                      status === "completed" ? colors.palette.warmIvory :
                      status === "current" ? colors.palette.tailorGold :
                      colors.palette.neutral400
                    }
                  />
                </View>
                {index < stages.length - 1 && (
                  <View style={[
                    $stageLine,
                    status === "completed" && $completedLine,
                  ]} />
                )}
              </View>
              
              <View style={$stageContent}>
                <Text style={[
                  $stageTitle,
                  status === "current" && $currentStageTitle,
                ]}>
                  {stage.title}
                </Text>
                <Text style={$stageDescription}>{stage.description}</Text>
                
                {stageProgress?.completedAt && (
                  <Text style={$stageTime}>
                    Completed: {formatDate(stageProgress.completedAt)}
                  </Text>
                )}
                
                {stageProgress?.notes && (
                  <Text style={$stageNotes}>Notes: {stageProgress.notes}</Text>
                )}
              </View>
            </View>
          )
        })}
      </Card>

      {/* Customer Information */}
      <Card style={$customerCard} preset="default">
        <Text style={$sectionTitle}>Customer Information</Text>
        
        <View style={$customerDetails}>
          <View style={$detailRow}>
            <Icon icon="person" size={16} color={colors.palette.threadBlue} />
            <Text style={$detailText}>
              {order.customerInfo.firstName} {order.customerInfo.lastName}
            </Text>
          </View>
          <View style={$detailRow}>
            <Icon icon="mail" size={16} color={colors.palette.threadBlue} />
            <Text style={$detailText}>{order.customerInfo.email}</Text>
          </View>
          <View style={$detailRow}>
            <Icon icon="call" size={16} color={colors.palette.threadBlue} />
            <Text style={$detailText}>{order.customerInfo.phone}</Text>
          </View>
          <View style={$detailRow}>
            <Icon icon="location" size={16} color={colors.palette.threadBlue} />
            <Text style={$detailText}>{order.customerInfo.address}</Text>
          </View>
          <View style={$detailRow}>
            <Icon icon="business" size={16} color={colors.palette.threadBlue} />
            <Text style={$detailText}>
              {orderStore.getTranslation("cities", order.city)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Order Details */}
      <Card style={$orderDetailsCard} preset="default">
        <Text style={$sectionTitle}>Order Details</Text>
        
        <View style={$orderDetailsContent}>
          <View style={$detailRow}>
            <Text style={$detailLabel}>Garment Type:</Text>
            <Text style={$detailValue}>
              {orderStore.getTranslation("garments", order.garmentType)}
            </Text>
          </View>
          <View style={$detailRow}>
            <Text style={$detailLabel}>Fabric:</Text>
            <Text style={$detailValue}>
              {order.fabricSelection.color} {order.fabricSelection.type}
            </Text>
          </View>
          <View style={$detailRow}>
            <Text style={$detailLabel}>Fit Preference:</Text>
            <Text style={$detailValue}>{order.styleConfig.fitPreference}</Text>
          </View>
          <View style={$detailRow}>
            <Text style={$detailLabel}>Order Date:</Text>
            <Text style={$detailValue}>{formatDate(order.orderDate)}</Text>
          </View>
          <View style={$detailRow}>
            <Text style={$detailLabel}>Due Date:</Text>
            <Text style={$detailValue}>{formatDate(order.estimatedDeliveryDate)}</Text>
          </View>
        </View>
      </Card>

      {/* Pricing Information */}
      <Card style={$pricingCard} preset="default">
        <Text style={$sectionTitle}>Pricing Details</Text>
        
        <View style={$pricingDetails}>
          <View style={$pricingRow}>
            <Text style={$pricingLabel}>Base Price:</Text>
            <Text style={$pricingValue}>{formatCurrency(order.pricing.basePrice)}</Text>
          </View>
          <View style={$pricingRow}>
            <Text style={$pricingLabel}>Fabric Cost:</Text>
            <Text style={$pricingValue}>{formatCurrency(order.pricing.fabricCost)}</Text>
          </View>
          {order.pricing.urgencyFee > 0 && (
            <View style={$pricingRow}>
              <Text style={$pricingLabel}>Urgency Fee:</Text>
              <Text style={$pricingValue}>{formatCurrency(order.pricing.urgencyFee)}</Text>
            </View>
          )}
          <View style={[$pricingRow, $totalRow]}>
            <Text style={$totalLabel}>Total Price:</Text>
            <Text style={$totalValue}>{formatCurrency(order.pricing.totalPrice)}</Text>
          </View>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={[$bottomActions, $bottomContainerInsets]}>
        <Button
          text="Contact Customer"
          style={$secondaryButton}
          textStyle={$secondaryButtonText}
          onPress={() => {
            // Navigate to contact customer
            console.log("Contact customer")
          }}
        />
        
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <Button
            text="Cancel Order"
            style={$dangerButton}
            textStyle={$dangerButtonText}
            onPress={handleCancelOrder}
          />
        )}
      </View>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <Text style={$modalTitle}>Update Order Status</Text>
            
            <View style={$modalOptions}>
              {orderStatuses.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    $modalOption,
                    selectedStatus === status.value && $selectedModalOption
                  ]}
                  onPress={() => setSelectedStatus(status.value)}
                >
                  <Text style={[
                    $modalOptionText,
                    selectedStatus === status.value && $selectedModalOptionText
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextField
              label="Notes (Optional)"
              placeholder="Add notes about this status update..."
              value={progressNotes}
              onChangeText={setProgressNotes}
              multiline
              numberOfLines={3}
              style={$modalTextArea}
            />

            <View style={$modalActions}>
              <Button
                text="Cancel"
                style={$modalCancelButton}
                textStyle={$modalCancelButtonText}
                onPress={() => {
                  setShowStatusModal(false)
                  setSelectedStatus(null)
                  setProgressNotes("")
                }}
              />
              <Button
                text="Update"
                style={$modalConfirmButton}
                textStyle={$modalConfirmButtonText}
                onPress={handleStatusUpdate}
                disabled={!selectedStatus}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Stage Update Modal */}
      <Modal
        visible={showStageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStageModal(false)}
      >
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <Text style={$modalTitle}>Update Production Stage</Text>
            
            <View style={$modalOptions}>
              {orderStages.map((stage) => (
                <TouchableOpacity
                  key={stage.value}
                  style={[
                    $modalOption,
                    selectedStage === stage.value && $selectedModalOption
                  ]}
                  onPress={() => setSelectedStage(stage.value)}
                >
                  <Text style={[
                    $modalOptionText,
                    selectedStage === stage.value && $selectedModalOptionText
                  ]}>
                    {stage.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextField
              label="Progress Notes"
              placeholder="Add details about this stage progress..."
              value={progressNotes}
              onChangeText={setProgressNotes}
              multiline
              numberOfLines={3}
              style={$modalTextArea}
            />

            <View style={$modalActions}>
              <Button
                text="Cancel"
                style={$modalCancelButton}
                textStyle={$modalCancelButtonText}
                onPress={() => {
                  setShowStageModal(false)
                  setSelectedStage(null)
                  setProgressNotes("")
                }}
              />
              <Button
                text="Update"
                style={$modalConfirmButton}
                textStyle={$modalConfirmButtonText}
                onPress={handleStageUpdate}
                disabled={!selectedStage}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
})

// Styles
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.blushPink,
}

const $backButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $headerCenter: ViewStyle = {
  flex: 1,
  alignItems: "center",
  marginHorizontal: spacing.md,
}

const $headerTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $headerSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  textAlign: "center",
  marginTop: spacing.xxs,
}

const $moreButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.threadBlue,
}

const $summaryCard: ViewStyle = {
  margin: spacing.lg,
  marginBottom: spacing.md,
}

const $summaryHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.md,
}

const $orderNumber: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $customerName: TextStyle = {
  fontSize: 16,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $garmentType: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginTop: spacing.xxs,
}

const $summaryBadges: ViewStyle = {
  gap: spacing.xs,
}

const $priorityBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  alignSelf: "flex-end",
}

const $priorityText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  alignSelf: "flex-end",
}

const $statusText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

const $progressSection: ViewStyle = {
  marginTop: spacing.md,
}

const $progressLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $progressBarContainer: ViewStyle = {
  height: 8,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 4,
  overflow: "hidden",
}

const $progressBar: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 4,
}

const $actionsCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
  flexWrap: "wrap",
}

const $actionButton: ViewStyle = {
  flex: 1,
  minWidth: 100,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingVertical: spacing.sm,
}

const $actionButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $primaryActionButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
}

const $primaryActionButtonText: TextStyle = {
  color: colors.palette.warmIvory,
}

const $timelineCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $stageItem: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.md,
}

const $stageIndicator: ViewStyle = {
  alignItems: "center",
  marginRight: spacing.md,
}

const $stageIcon: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.neutral200,
}

const $completedStage: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
}

const $currentStage: ViewStyle = {
  backgroundColor: colors.palette.tailorGold + "20",
  borderWidth: 2,
  borderColor: colors.palette.tailorGold,
}

const $pendingStage: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
}

const $stageLine: ViewStyle = {
  width: 2,
  height: 40,
  backgroundColor: colors.palette.neutral300,
  marginTop: spacing.xs,
}

const $completedLine: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
}

const $stageContent: ViewStyle = {
  flex: 1,
  paddingTop: spacing.xs,
}

const $stageTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $currentStageTitle: TextStyle = {
  color: colors.palette.tailorGold,
}

const $stageDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $stageTime: TextStyle = {
  fontSize: 12,
  color: colors.palette.sageGreen,
  marginTop: spacing.xs,
  fontWeight: "500",
}

const $stageNotes: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginTop: spacing.xs,
  fontStyle: "italic",
}

const $customerCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $customerDetails: ViewStyle = {
  gap: spacing.sm,
}

const $detailRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $detailText: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  flex: 1,
}

const $orderDetailsCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $orderDetailsContent: ViewStyle = {
  gap: spacing.sm,
}

const $detailLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  fontWeight: "500",
  flex: 1,
}

const $detailValue: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  fontWeight: "600",
  flex: 1,
  textAlign: "right",
}

const $pricingCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $pricingDetails: ViewStyle = {
  gap: spacing.sm,
}

const $pricingRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.xs,
}

const $pricingLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $pricingValue: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  fontWeight: "600",
}

const $totalRow: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  paddingTop: spacing.sm,
  marginTop: spacing.sm,
}

const $totalLabel: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $totalValue: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.tailorGold,
}

const $bottomActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.lg,
}

const $secondaryButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $dangerButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.error + "20",
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $dangerButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.error,
  textAlign: "center",
}

// Modal Styles
const $modalOverlay: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
}

const $modalContent: ViewStyle = {
  backgroundColor: colors.palette.warmIvory,
  borderRadius: 16,
  padding: spacing.lg,
  width: "100%",
  maxWidth: 400,
}

const $modalTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
  marginBottom: spacing.lg,
}

const $modalOptions: ViewStyle = {
  gap: spacing.sm,
  marginBottom: spacing.lg,
}

const $modalOption: ViewStyle = {
  padding: spacing.md,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral200,
}

const $selectedModalOption: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
}

const $modalOptionText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $selectedModalOptionText: TextStyle = {
  color: colors.palette.warmIvory,
  fontWeight: "600",
}

const $modalTextArea: ViewStyle = {
  marginBottom: spacing.lg,
}

const $modalActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
}

const $modalCancelButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingVertical: spacing.md,
}

const $modalCancelButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $modalConfirmButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 8,
  paddingVertical: spacing.md,
}

const $modalConfirmButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}