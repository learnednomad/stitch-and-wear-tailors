/**
 * Nigerian Order Creation Screen
 * 6-step workflow: Customer Info → Measurements → Fabric → Style → Pricing → Confirmation
 */

import React, { FC, useEffect } from "react"
import { View, ViewStyle, TextStyle, BackHandler } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Icon, Button } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { useNavigation } from "@react-navigation/native"

// Import step components
import { CustomerInfoStep } from "./steps/CustomerInfoStep"
import { MeasurementsStep } from "./steps/MeasurementsStep"
import { FabricSelectionStep } from "./steps/FabricSelectionStep"
import { StyleSelectionStep } from "./steps/StyleSelectionStep"
import { PricingStep } from "./steps/PricingStep"
import { ConfirmationStep } from "./steps/ConfirmationStep"

interface OrderCreationScreenProps extends AppStackScreenProps<"OrderCreation"> {}

export const OrderCreationScreen: FC<OrderCreationScreenProps> = observer(() => {
  const navigation = useNavigation()
  const { orderStore } = useStores()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  const steps = [
    { id: 0, name: "Customer Info", component: CustomerInfoStep },
    { id: 1, name: "Measurements", component: MeasurementsStep },
    { id: 2, name: "Fabric", component: FabricSelectionStep },
    { id: 3, name: "Style", component: StyleSelectionStep },
    { id: 4, name: "Pricing", component: PricingStep },
    { id: 5, name: "Confirmation", component: ConfirmationStep },
  ]

  const currentStep = orderStore.orderCreationStep
  const CurrentStepComponent = steps[currentStep]?.component

  useEffect(() => {
    // Initialize order creation if not already started
    if (!orderStore.orderCreationData) {
      orderStore.startOrderCreation()
    }

    // Handle hardware back button on Android
    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress)
    return () => backHandler.remove()
  }, [])

  const handleBackPress = (): boolean => {
    if (currentStep > 0) {
      orderStore.previousCreationStep()
      return true // Prevent default back behavior
    }
    return false // Allow default back behavior (exit screen)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      orderStore.previousCreationStep()
    } else {
      navigation.goBack()
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      orderStore.nextCreationStep()
    }
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Customer Info
        return orderStore.orderCreationData?.customerInfo !== null
      case 1: // Measurements
        return orderStore.orderCreationData?.measurementId !== null
      case 2: // Fabric
        return orderStore.orderCreationData?.fabricSelection !== null
      case 3: // Style
        return orderStore.orderCreationData?.styleConfig !== null
      case 4: // Pricing
        return true // Pricing is auto-calculated
      case 5: // Confirmation
        return orderStore.isOrderCreationComplete
      default:
        return false
    }
  }

  const getStepTitle = () => {
    return orderStore.getTranslation(
      [
        "customerInfo",
        "measurements",
        "fabricSelection",
        "styleSelection",
        "pricing",
        "confirmation",
      ][currentStep] as any,
      "en",
    )
  }

  return (
    <Screen
      backgroundColor={colors.palette.warmIvory}
      safeAreaEdges={["top"]}
      preset="fixed"
      statusBarStyle="dark"
    >
      {/* Header */}
      <View style={$header}>
        <Button style={$backButton} onPress={handleBack} accessibilityLabel="Go back">
          <Icon icon="back" size={24} color={colors.palette.deepCharcoal} />
        </Button>

        <View style={$headerCenter}>
          <Text style={$headerTitle}>{orderStore.getTranslation("actions", "create")} Order</Text>
          <Text style={$headerSubtitle}>
            Step {currentStep + 1} of {steps.length}: {getStepTitle()}
          </Text>
        </View>

        <View style={$headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <View style={$progressContainer}>
        <View style={$progressBar}>
          <View
            style={[$progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]}
          />
        </View>
        <Text style={$progressText}>
          {currentStep + 1} / {steps.length}
        </Text>
      </View>

      {/* Step Content */}
      <View style={$content}>{CurrentStepComponent && <CurrentStepComponent />}</View>

      {/* Navigation Footer */}
      <View style={[$footer, $bottomContainerInsets]}>
        <View style={$footerActions}>
          {currentStep > 0 && (
            <Button
              text={orderStore.getTranslation("actions", "previous")}
              style={$secondaryButton}
              textStyle={$secondaryButtonText}
              onPress={handleBack}
            />
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              text={orderStore.getTranslation("actions", "next")}
              style={[$primaryButton, !canGoNext() && $disabledButton]}
              textStyle={$primaryButtonText}
              onPress={handleNext}
              disabled={!canGoNext()}
            />
          ) : (
            <Button
              text={orderStore.getTranslation("actions", "confirm")}
              style={[$primaryButton, !canGoNext() && $disabledButton]}
              textStyle={$primaryButtonText}
              onPress={() => {
                // Handle final confirmation
                orderStore.createNigerianDraftOrder()
                navigation.navigate("OrderConfirmation" as never)
              }}
              disabled={!canGoNext()}
            />
          )}
        </View>
      </View>
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
  backgroundColor: colors.palette.warmIvory,
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

const $headerSpacer: ViewStyle = {
  width: 44,
}

const $progressContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.palette.warmIvory,
}

const $progressBar: ViewStyle = {
  height: 4,
  backgroundColor: colors.palette.blushPink,
  borderRadius: 2,
  overflow: "hidden",
}

const $progressFill: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 2,
}

const $progressText: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  textAlign: "center",
  marginTop: spacing.xs,
  fontWeight: "500",
}

const $content: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.warmIvory,
}

const $footer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.warmIvory,
  borderTopWidth: 1,
  borderTopColor: colors.palette.blushPink,
}

const $footerActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
}

const $primaryButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
}

const $secondaryButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $disabledButton: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  opacity: 0.6,
}

const $primaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}
