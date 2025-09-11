/**
 * Pricing Step
 * Fifth step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, TouchableOpacity, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, Button, Icon } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { PaymentMethod, NigerianCity, OrderPriority } from "@/types/orders"

interface PricingBreakdown {
  basePrice: number
  fabricCost: number
  complexityMultiplier: number
  urgencyFee: number
  deliveryFee: number
  totalPrice: number
  depositRequired: number
  balanceAmount: number
}

export const PricingStep: FC = observer(() => {
  const { orderStore } = useStores()

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("bank_transfer")
  const [selectedPriority, setSelectedPriority] = useState<OrderPriority>("normal")
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const paymentMethods = [
    {
      method: "bank_transfer" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "bank_transfer"),
      description: "Direct bank transfer - Most common in Nigeria",
      processingFee: 0,
      icon: "bank" as const,
      available: true,
    },
    {
      method: "mobile_money" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "mobile_money"),
      description: "OPay, PalmPay, and other mobile wallets",
      processingFee: 50,
      icon: "mobile" as const,
      available: true,
    },
    {
      method: "cash" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "cash"),
      description: "Cash payment on delivery or at pickup",
      processingFee: 0,
      icon: "cash" as const,
      available: true,
    },
    {
      method: "card" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "card"),
      description: "Debit/Credit card payment",
      processingFee: 100,
      icon: "card" as const,
      available: true,
    },
    {
      method: "pos" as PaymentMethod,
      name: "POS Terminal",
      description: "Point of Sale terminal payment",
      processingFee: 50,
      icon: "terminal" as const,
      available: true,
    },
  ]

  const priorityOptions = [
    {
      priority: "low" as OrderPriority,
      name: "Standard Delivery",
      description: "Normal processing time",
      multiplier: 1.0,
      icon: "clock" as const,
    },
    {
      priority: "normal" as OrderPriority,
      name: "Priority Delivery",
      description: "Faster processing",
      multiplier: 1.2,
      icon: "fast-forward" as const,
    },
    {
      priority: "high" as OrderPriority,
      name: "Express Delivery",
      description: "Quick turnaround",
      multiplier: 1.5,
      icon: "lightning" as const,
    },
    {
      priority: "urgent" as OrderPriority,
      name: "Rush Order",
      description: "Emergency delivery",
      multiplier: 2.0,
      icon: "fire" as const,
    },
  ]

  useEffect(() => {
    calculatePricing()
  }, [selectedPriority])

  const calculatePricing = async () => {
    setIsCalculating(true)

    try {
      const { orderCreationData } = orderStore

      if (
        !orderCreationData?.styleConfig ||
        !orderCreationData?.fabricSelection ||
        !orderCreationData?.customerInfo
      ) {
        throw new Error("Missing required order data")
      }

      // Calculate Nigerian pricing using OrderStore method
      const garmentType = orderCreationData.styleConfig.garmentType
      const city = orderCreationData.customerInfo.city
      const isRush = selectedPriority === "urgent"

      const calculatedPricing = orderStore.calculateNigerianPricing(garmentType, city, isRush)

      // Add delivery fee based on city
      const cityConfig = orderStore.getCityConfig(city)
      const deliveryFee = cityConfig.deliveryFee

      // Add processing fee for payment method
      const selectedPayment = paymentMethods.find((p) => p.method === selectedPaymentMethod)
      const processingFee = selectedPayment?.processingFee || 0

      // Apply priority multiplier
      const priorityOption = priorityOptions.find((p) => p.priority === selectedPriority)
      const priorityMultiplier = priorityOption?.multiplier || 1.0

      const adjustedTotalPrice = calculatedPricing.totalPrice * priorityMultiplier
      const finalTotal = adjustedTotalPrice + deliveryFee + processingFee

      const pricingBreakdown: PricingBreakdown = {
        basePrice: calculatedPricing.basePrice,
        fabricCost: calculatedPricing.fabricCost,
        complexityMultiplier: calculatedPricing.complexityMultiplier,
        urgencyFee: calculatedPricing.urgencyFee,
        deliveryFee,
        totalPrice: finalTotal,
        depositRequired: finalTotal * 0.5, // 50% deposit
        balanceAmount: finalTotal * 0.5,
      }

      setPricing(pricingBreakdown)
    } catch (error) {
      console.error("Failed to calculate pricing:", error)
      Alert.alert("Error", "Failed to calculate pricing. Please check your order details.")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleConfirmPricing = () => {
    if (pricing && orderStore.orderCreationData) {
      // Update order priority
      orderStore.orderCreationData.priority = selectedPriority

      Alert.alert(
        "Pricing Confirmed",
        `Total: ₦${pricing.totalPrice.toLocaleString()}\nDeposit Required: ₦${pricing.depositRequired.toLocaleString()}`,
        [
          {
            text: "OK",
            onPress: () => {
              // This will allow progression to next step
            },
          },
        ],
      )
    }
  }

  const getEstimatedDelivery = () => {
    if (!orderStore.orderCreationData?.styleConfig) return "N/A"

    const garmentConfig = orderStore.getGarmentConfig(
      orderStore.orderCreationData.styleConfig.garmentType,
    )
    if (!garmentConfig) return "N/A"

    const baseDays = garmentConfig.estimatedDays
    const priorityOption = priorityOptions.find((p) => p.priority === selectedPriority)
    const adjustedDays = Math.ceil(baseDays / (priorityOption?.multiplier || 1.0))

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + adjustedDays)

    return deliveryDate.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>{orderStore.getTranslation("pricing", "en")}</Text>
        <Text style={$subtitle}>Review pricing and select payment preferences</Text>

        {/* Priority Selection */}
        <View style={$section}>
          <Text style={$sectionTitle}>Delivery Priority</Text>
          <Text style={$sectionDescription}>Choose your preferred delivery timeline</Text>

          {priorityOptions.map((option) => (
            <TouchableOpacity
              key={option.priority}
              style={[$priorityCard, selectedPriority === option.priority && $selectedPriorityCard]}
              onPress={() => setSelectedPriority(option.priority)}
            >
              <View style={$priorityContent}>
                <View style={$priorityHeader}>
                  <Icon icon={option.icon} size={24} color={colors.palette.tailorGold} />
                  <View style={$priorityInfo}>
                    <Text style={$priorityName}>{option.name}</Text>
                    <Text style={$priorityDescription}>{option.description}</Text>
                  </View>
                  <View style={$priorityMultiplier}>
                    <Text style={$multiplierText}>
                      {option.multiplier === 1.0 ? "Standard" : `${option.multiplier}x`}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method Selection */}
        <View style={$section}>
          <Text style={$sectionTitle}>Payment Method</Text>
          <Text style={$sectionDescription}>Choose your preferred payment option</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.method}
              style={[
                $paymentCard,
                selectedPaymentMethod === method.method && $selectedPaymentCard,
                !method.available && $disabledPaymentCard,
              ]}
              onPress={() => method.available && setSelectedPaymentMethod(method.method)}
              disabled={!method.available}
            >
              <View style={$paymentContent}>
                <Icon icon={method.icon} size={24} color={colors.palette.threadBlue} />
                <View style={$paymentInfo}>
                  <Text style={$paymentName}>{method.name}</Text>
                  <Text style={$paymentDescription}>{method.description}</Text>
                  {method.processingFee > 0 && (
                    <Text style={$processingFee}>Processing fee: ₦{method.processingFee}</Text>
                  )}
                </View>
                <View
                  style={[
                    $radioButton,
                    selectedPaymentMethod === method.method && $radioButtonSelected,
                  ]}
                >
                  {selectedPaymentMethod === method.method && <View style={$radioButtonInner} />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pricing Breakdown */}
        {pricing && (
          <View style={$section}>
            <Text style={$sectionTitle}>Pricing Breakdown</Text>

            <View style={$pricingCard}>
              <View style={$pricingRow}>
                <Text style={$pricingLabel}>Base Garment Price</Text>
                <Text style={$pricingValue}>₦{pricing.basePrice.toLocaleString()}</Text>
              </View>

              <View style={$pricingRow}>
                <Text style={$pricingLabel}>Fabric Cost</Text>
                <Text style={$pricingValue}>₦{pricing.fabricCost.toLocaleString()}</Text>
              </View>

              <View style={$pricingRow}>
                <Text style={$pricingLabel}>Complexity Adjustment</Text>
                <Text style={$pricingValue}>×{pricing.complexityMultiplier.toFixed(1)}</Text>
              </View>

              {pricing.urgencyFee > 0 && (
                <View style={$pricingRow}>
                  <Text style={$pricingLabel}>Rush Fee</Text>
                  <Text style={$pricingValue}>₦{pricing.urgencyFee.toLocaleString()}</Text>
                </View>
              )}

              <View style={$pricingRow}>
                <Text style={$pricingLabel}>Delivery Fee</Text>
                <Text style={$pricingValue}>₦{pricing.deliveryFee.toLocaleString()}</Text>
              </View>

              {paymentMethods.find((p) => p.method === selectedPaymentMethod)?.processingFee! >
                0 && (
                <View style={$pricingRow}>
                  <Text style={$pricingLabel}>Processing Fee</Text>
                  <Text style={$pricingValue}>
                    ₦
                    {paymentMethods
                      .find((p) => p.method === selectedPaymentMethod)
                      ?.processingFee?.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={[$pricingRow, $totalRow]}>
                <Text style={$totalLabel}>Total Amount</Text>
                <Text style={$totalValue}>₦{pricing.totalPrice.toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment Schedule */}
            <View style={$paymentSchedule}>
              <Text style={$scheduleTitle}>Payment Schedule</Text>

              <View style={$scheduleItem}>
                <View style={$scheduleInfo}>
                  <Text style={$scheduleLabel}>Deposit Required (50%)</Text>
                  <Text style={$scheduleDescription}>Due upon order confirmation</Text>
                </View>
                <Text style={$scheduleAmount}>₦{pricing.depositRequired.toLocaleString()}</Text>
              </View>

              <View style={$scheduleItem}>
                <View style={$scheduleInfo}>
                  <Text style={$scheduleLabel}>Balance Payment (50%)</Text>
                  <Text style={$scheduleDescription}>Due upon completion</Text>
                </View>
                <Text style={$scheduleAmount}>₦{pricing.balanceAmount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Information */}
        <View style={$section}>
          <Text style={$sectionTitle}>Delivery Information</Text>

          <View style={$deliveryInfo}>
            <View style={$deliveryItem}>
              <Icon icon="calendar" size={20} color={colors.palette.threadBlue} />
              <View style={$deliveryText}>
                <Text style={$deliveryLabel}>Estimated Delivery</Text>
                <Text style={$deliveryValue}>{getEstimatedDelivery()}</Text>
              </View>
            </View>

            <View style={$deliveryItem}>
              <Icon icon="location" size={20} color={colors.palette.threadBlue} />
              <View style={$deliveryText}>
                <Text style={$deliveryLabel}>Delivery Location</Text>
                <Text style={$deliveryValue}>
                  {orderStore.orderCreationData?.customerInfo?.city &&
                    orderStore.getTranslation(
                      "cities",
                      orderStore.orderCreationData.customerInfo.city,
                    )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms Notice */}
        <View style={$termsNotice}>
          <Icon icon="info" size={20} color={colors.palette.threadBlue} />
          <View style={$termsText}>
            <Text style={$termsTitle}>Payment Terms</Text>
            <Text style={$termsDescription}>
              • 50% deposit required to begin work{"\n"}• Balance due upon completion{"\n"}• Prices
              valid for 30 days{"\n"}• Alterations included in first fitting
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <Button
          text="Confirm Pricing & Payment"
          style={$confirmButton}
          textStyle={$confirmButtonText}
          onPress={handleConfirmPricing}
          disabled={isCalculating || !pricing}
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

const $section: ViewStyle = {
  marginBottom: spacing.xl,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $sectionDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
  marginBottom: spacing.md,
  lineHeight: 18,
}

const $priorityCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedPriorityCard: ViewStyle = {
  borderColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "10",
}

const $priorityContent: ViewStyle = {
  flex: 1,
}

const $priorityHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $priorityInfo: ViewStyle = {
  flex: 1,
  marginLeft: spacing.sm,
}

const $priorityName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $priorityDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $priorityMultiplier: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 6,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
}

const $multiplierText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $paymentCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedPaymentCard: ViewStyle = {
  borderColor: colors.palette.threadBlue,
  backgroundColor: colors.palette.threadBlue + "10",
}

const $disabledPaymentCard: ViewStyle = {
  opacity: 0.5,
}

const $paymentContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $paymentInfo: ViewStyle = {
  flex: 1,
  marginLeft: spacing.sm,
}

const $paymentName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $paymentDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $processingFee: TextStyle = {
  fontSize: 11,
  color: colors.palette.tailorGold,
  fontWeight: "500",
}

const $radioButton: ViewStyle = {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.palette.neutral300,
  justifyContent: "center",
  alignItems: "center",
}

const $radioButtonSelected: ViewStyle = {
  borderColor: colors.palette.threadBlue,
}

const $radioButtonInner: ViewStyle = {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.threadBlue,
}

const $pricingCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  marginBottom: spacing.md,
}

const $pricingRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $totalRow: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
  paddingTop: spacing.sm,
  marginBottom: 0,
}

const $pricingLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $pricingValue: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $totalLabel: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $totalValue: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.tailorGold,
}

const $paymentSchedule: ViewStyle = {
  backgroundColor: colors.palette.sageGreen + "10",
  borderRadius: 12,
  padding: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.sageGreen,
}

const $scheduleTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $scheduleItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $scheduleInfo: ViewStyle = {
  flex: 1,
}

const $scheduleLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $scheduleDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $scheduleAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.sageGreen,
}

const $deliveryInfo: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $deliveryItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $deliveryText: ViewStyle = {
  marginLeft: spacing.sm,
}

const $deliveryLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $deliveryValue: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $termsNotice: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.threadBlue + "10",
  borderRadius: 12,
  padding: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.threadBlue,
  marginBottom: spacing.lg,
}

const $termsText: ViewStyle = {
  flex: 1,
  marginLeft: spacing.sm,
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

const $confirmButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $confirmButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}

const $spacer: ViewStyle = {
  height: spacing.xl,
}
