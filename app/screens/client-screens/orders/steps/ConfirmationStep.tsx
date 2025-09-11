/**
 * Confirmation Step
 * Final step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, Button, Icon } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useNavigation } from "@react-navigation/native"

export const ConfirmationStep: FC = observer(() => {
  const { orderStore, authStore } = useStores()
  const navigation = useNavigation()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const orderData = orderStore.orderCreationData

  useEffect(() => {
    // Validate that all required data is present
    if (!orderData?.customerInfo || !orderData?.fabricSelection || !orderData?.styleConfig) {
      Alert.alert(
        "Incomplete Order",
        "Some order information is missing. Please go back and complete all steps.",
        [{ text: "OK", onPress: () => (orderStore.orderCreationStep = 0) }],
      )
    }
  }, [])

  const handleSubmitOrder = async () => {
    if (!termsAccepted) {
      Alert.alert("Terms Required", "Please accept the terms and conditions to proceed.")
      return
    }

    if (!orderStore.isOrderCreationComplete) {
      Alert.alert("Incomplete Order", "Please complete all required steps before submitting.")
      return
    }

    setIsSubmitting(true)

    try {
      // Create the draft order using OrderStore
      orderStore.createNigerianDraftOrder()

      // Submit the order
      const createdOrder = await orderStore.submitNigerianDraftOrder()

      Alert.alert(
        "Order Submitted Successfully!",
        `Your order #${createdOrder?.orderNumber} has been created. You will receive a confirmation email shortly.`,
        [
          {
            text: "View Order",
            onPress: () => {
              navigation.navigate("OrderDetail" as never, { orderId: createdOrder?.id })
            },
          },
          {
            text: "Create Another",
            onPress: () => {
              orderStore.clearDraftOrder()
              orderStore.startOrderCreation()
            },
          },
        ],
      )
    } catch (error) {
      console.error("Failed to submit order:", error)
      Alert.alert(
        "Submission Failed",
        "There was an error submitting your order. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEstimatedDelivery = () => {
    if (!orderData?.styleConfig) return "N/A"

    const garmentConfig = orderStore.getGarmentConfig(orderData.styleConfig.garmentType)
    if (!garmentConfig) return "N/A"

    const baseDays = garmentConfig.estimatedDays
    const priorityMultiplier =
      orderData.priority === "urgent"
        ? 0.5
        : orderData.priority === "high"
          ? 0.7
          : orderData.priority === "normal"
            ? 0.85
            : 1.0

    const adjustedDays = Math.ceil(baseDays * priorityMultiplier)

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + adjustedDays)

    return deliveryDate.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateTotalPrice = () => {
    if (!orderData?.styleConfig || !orderData?.fabricSelection || !orderData?.customerInfo) {
      return 0
    }

    try {
      const pricing = orderStore.calculateNigerianPricing(
        orderData.styleConfig.garmentType,
        orderData.customerInfo.city,
        orderData.priority === "urgent",
      )

      const cityConfig = orderStore.getCityConfig(orderData.customerInfo.city)
      const deliveryFee = cityConfig.deliveryFee

      return pricing.totalPrice + deliveryFee
    } catch {
      return 0
    }
  }

  if (!orderData) {
    return (
      <View style={$container}>
        <View style={$errorState}>
          <Icon icon="alert-circle" size={48} color={colors.palette.alertRed} />
          <Text style={$errorTitle}>Order Data Missing</Text>
          <Text style={$errorDescription}>Please go back and complete all order steps.</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>{orderStore.getTranslation("confirmation", "en")}</Text>
        <Text style={$subtitle}>Review your order details before final submission</Text>

        {/* Order Summary */}
        <View style={$summarySection}>
          <Text style={$sectionTitle}>Order Summary</Text>

          <View style={$summaryCard}>
            <View style={$summaryHeader}>
              <Text style={$summaryOrderType}>
                {orderData.orderType.charAt(0).toUpperCase() + orderData.orderType.slice(1)} Order
              </Text>
              <View style={$priorityBadge}>
                <Text style={$priorityText}>
                  {orderData.priority.charAt(0).toUpperCase() + orderData.priority.slice(1)}{" "}
                  Priority
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={$section}>
          <Text style={$sectionTitle}>Customer Information</Text>

          <View style={$infoCard}>
            <View style={$infoRow}>
              <Text style={$infoLabel}>Name:</Text>
              <Text style={$infoValue}>
                {orderData.customerInfo?.firstName} {orderData.customerInfo?.lastName}
              </Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Email:</Text>
              <Text style={$infoValue}>{orderData.customerInfo?.email}</Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Phone:</Text>
              <Text style={$infoValue}>{orderData.customerInfo?.phone}</Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>City:</Text>
              <Text style={$infoValue}>
                {orderData.customerInfo?.city &&
                  orderStore.getTranslation("cities", orderData.customerInfo.city)}
              </Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Language:</Text>
              <Text style={$infoValue}>
                {orderData.customerInfo?.preferredLanguage === "en" && "English"}
                {orderData.customerInfo?.preferredLanguage === "yo" && "Yorùbá"}
                {orderData.customerInfo?.preferredLanguage === "ha" && "Hausa"}
                {orderData.customerInfo?.preferredLanguage === "ig" && "Igbo"}
              </Text>
            </View>
          </View>
        </View>

        {/* Garment Details */}
        <View style={$section}>
          <Text style={$sectionTitle}>Garment Details</Text>

          <View style={$infoCard}>
            <View style={$infoRow}>
              <Text style={$infoLabel}>Style:</Text>
              <Text style={$infoValue}>
                {orderData.styleConfig?.garmentType &&
                  orderStore.getTranslation("garments", orderData.styleConfig.garmentType)}
              </Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Fit:</Text>
              <Text style={$infoValue}>
                {orderData.styleConfig?.fitPreference?.charAt(0).toUpperCase() +
                  orderData.styleConfig?.fitPreference?.slice(1)}{" "}
                Fit
              </Text>
            </View>

            {orderData.styleConfig?.designNotes && (
              <View style={$infoRow}>
                <Text style={$infoLabel}>Design Notes:</Text>
                <Text style={$infoValue}>{orderData.styleConfig.designNotes}</Text>
              </View>
            )}

            {orderData.styleConfig?.culturalSpecifications && (
              <View style={$infoRow}>
                <Text style={$infoLabel}>Cultural Details:</Text>
                <Text style={$infoValue}>{orderData.styleConfig.culturalSpecifications}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fabric Details */}
        <View style={$section}>
          <Text style={$sectionTitle}>Fabric Selection</Text>

          <View style={$infoCard}>
            <View style={$infoRow}>
              <Text style={$infoLabel}>Type:</Text>
              <Text style={$infoValue}>
                {orderData.fabricSelection?.type
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Color:</Text>
              <Text style={$infoValue}>{orderData.fabricSelection?.color}</Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Quantity:</Text>
              <Text style={$infoValue}>{orderData.fabricSelection?.quantity} meters</Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Cost:</Text>
              <Text style={$infoValue}>
                ₦{orderData.fabricSelection?.totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Measurements */}
        <View style={$section}>
          <Text style={$sectionTitle}>Measurements</Text>

          <View style={$infoCard}>
            {orderData.measurementId ? (
              <View style={$measurementStatus}>
                <Icon icon="checkmark-circle" size={24} color={colors.palette.sageGreen} />
                <Text style={$measurementText}>
                  Measurements saved (ID: {orderData.measurementId.slice(-8)})
                </Text>
              </View>
            ) : (
              <View style={$measurementStatus}>
                <Icon icon="clock" size={24} color={colors.palette.threadBlue} />
                <Text style={$measurementText}>
                  Measurements will be taken during fitting appointment
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Information */}
        <View style={$section}>
          <Text style={$sectionTitle}>Delivery Information</Text>

          <View style={$infoCard}>
            <View style={$infoRow}>
              <Text style={$infoLabel}>Estimated Delivery:</Text>
              <Text style={$infoValue}>{getEstimatedDelivery()}</Text>
            </View>

            <View style={$infoRow}>
              <Text style={$infoLabel}>Address:</Text>
              <Text style={$infoValue}>{orderData.customerInfo?.address}</Text>
            </View>
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={$section}>
          <Text style={$sectionTitle}>Total Cost</Text>

          <View style={$pricingCard}>
            <View style={$totalRow}>
              <Text style={$totalLabel}>Total Amount</Text>
              <Text style={$totalValue}>₦{calculateTotalPrice().toLocaleString()}</Text>
            </View>

            <View style={$paymentInfo}>
              <Text style={$paymentTitle}>Payment Schedule</Text>
              <View style={$paymentRow}>
                <Text style={$paymentLabel}>Deposit (50%)</Text>
                <Text style={$paymentAmount}>
                  ₦{(calculateTotalPrice() * 0.5).toLocaleString()}
                </Text>
              </View>
              <View style={$paymentRow}>
                <Text style={$paymentLabel}>Balance (50%)</Text>
                <Text style={$paymentAmount}>
                  ₦{(calculateTotalPrice() * 0.5).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={$section}>
          <View style={$termsContainer}>
            <Button text="" style={$checkbox} onPress={() => setTermsAccepted(!termsAccepted)}>
              <View style={[$checkboxBox, termsAccepted && $checkboxChecked]}>
                {termsAccepted && (
                  <Icon icon="checkmark" size={16} color={colors.palette.warmIvory} />
                )}
              </View>
            </Button>

            <View style={$termsText}>
              <Text style={$termsTitle}>Terms and Conditions</Text>
              <Text style={$termsDescription}>
                I agree to the terms and conditions, payment schedule, and understand that a 50%
                deposit is required to begin work. I acknowledge the estimated delivery date and
                fitting requirements.
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Button
          text={isSubmitting ? "Submitting Order..." : "Submit Order"}
          style={[$submitButton, (!termsAccepted || isSubmitting) && $disabledButton]}
          textStyle={$submitButtonText}
          onPress={handleSubmitOrder}
          disabled={!termsAccepted || isSubmitting}
        />

        <View style={$spacer} />
      </View>
    </ScrollView>
  )
})

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  padding: spacing.lg,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $subtitle: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginBottom: spacing.lg,
  lineHeight: 20,
}

const $errorState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $errorTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.alertRed,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}

const $errorDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  textAlign: "center",
}

const $summarySection: ViewStyle = {
  marginBottom: spacing.lg,
}

const $section: ViewStyle = {
  marginBottom: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $summaryCard: ViewStyle = {
  backgroundColor: colors.palette.tailorGold + "10",
  borderRadius: 12,
  padding: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.tailorGold,
}

const $summaryHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $summaryOrderType: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $priorityBadge: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 6,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
}

const $priorityText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.warmIvory,
}

const $infoCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $infoRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.sm,
}

const $infoLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  fontWeight: "500",
  flex: 1,
}

const $infoValue: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  fontWeight: "400",
  flex: 2,
  textAlign: "right",
}

const $measurementStatus: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $measurementText: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  marginLeft: spacing.sm,
  flex: 1,
}

const $pricingCard: ViewStyle = {
  backgroundColor: colors.palette.sageGreen + "10",
  borderRadius: 12,
  padding: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.sageGreen,
}

const $totalRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}

const $totalLabel: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $totalValue: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.sageGreen,
}

const $paymentInfo: ViewStyle = {
  marginTop: spacing.sm,
}

const $paymentTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.sm,
}

const $paymentRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $paymentLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $paymentAmount: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.sageGreen,
}

const $termsContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
}

const $checkbox: ViewStyle = {
  width: 24,
  height: 24,
  marginRight: spacing.sm,
  padding: 0,
  marginTop: 2,
}

const $checkboxBox: ViewStyle = {
  width: 24,
  height: 24,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: colors.palette.neutral400,
  backgroundColor: colors.palette.neutral100,
  justifyContent: "center",
  alignItems: "center",
}

const $checkboxChecked: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderColor: colors.palette.sageGreen,
}

const $termsText: ViewStyle = {
  flex: 1,
}

const $termsTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $termsDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  lineHeight: 16,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.lg,
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $disabledButton: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
  opacity: 0.6,
}

const $submitButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}

const $spacer: ViewStyle = {
  height: spacing.xl,
}
