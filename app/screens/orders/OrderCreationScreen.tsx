import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, ScrollView, Alert } from "react-native"
import { StackScreenProps } from "@react-navigation/stack"
import { Screen, Text, Button, Header } from "../../components"
import { NavigatorParamList } from "../../navigators"
import { useStores } from "../../models"
import { colors, spacing, typography } from "../../theme"
import { CustomerInfoStep } from "./steps/CustomerInfoStep"
import { MeasurementStep } from "./steps/MeasurementStep"
import { FabricSelectionStep } from "./steps/FabricSelectionStep"
import { StyleConfigStep } from "./steps/StyleConfigStep"
import { PricingStep } from "./steps/PricingStep"
import { ConfirmationStep } from "./steps/ConfirmationStep"

const CONTAINER: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const CONTENT: ViewStyle = {
  flex: 1,
  padding: spacing.medium,
}

const PROGRESS_CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.medium,
  paddingVertical: spacing.small,
  backgroundColor: colors.palette.neutral100,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
}

const PROGRESS_STEP: ViewStyle = {
  flex: 1,
  alignItems: "center",
}

const PROGRESS_DOT: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral300,
  alignItems: "center",
  justifyContent: "center",
}

const PROGRESS_DOT_ACTIVE: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const PROGRESS_DOT_COMPLETED: ViewStyle = {
  backgroundColor: colors.palette.success500,
}

const PROGRESS_LINE: ViewStyle = {
  position: "absolute",
  top: 16,
  left: "50%",
  right: "-50%",
  height: 2,
  backgroundColor: colors.palette.neutral300,
}

const PROGRESS_LINE_COMPLETED: ViewStyle = {
  backgroundColor: colors.palette.success500,
}

const PROGRESS_NUMBER: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.palette.neutral100,
}

const PROGRESS_LABEL: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: spacing.tiny,
}

const STEP_CONTAINER: ViewStyle = {
  flex: 1,
}

const NAVIGATION_CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: spacing.medium,
  paddingVertical: spacing.medium,
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
}

const NAV_BUTTON: ViewStyle = {
  flex: 1,
  marginHorizontal: spacing.tiny,
}

const STEP_TITLE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 24,
  color: colors.text,
  marginBottom: spacing.small,
}

const STEP_SUBTITLE: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.textDim,
  marginBottom: spacing.large,
}

export const OrderCreationScreen: FC<StackScreenProps<NavigatorParamList, "orderCreation">> =
  observer(function OrderCreationScreen({ navigation }) {
    const { orderStore, authStore } = useStores()

    useEffect(() => {
      // Initialize order creation when screen mounts
      orderStore.startOrderCreation()

      return () => {
        // Optionally clear draft when leaving
        // orderStore.clearDraftOrder()
      }
    }, [])

    const handleNext = () => {
      // Validate current step before proceeding
      const currentStep = orderStore.orderCreationStep

      switch (currentStep) {
        case 0: // Customer Info
          if (!orderStore.orderCreationData?.customerInfo) {
            Alert.alert("Error", "Please fill in customer information")
            return
          }
          break
        case 1: // Measurements
          // Measurement is optional, can proceed
          break
        case 2: // Fabric Selection
          if (!orderStore.orderCreationData?.fabricSelection) {
            Alert.alert("Error", "Please select fabric")
            return
          }
          break
        case 3: // Style Config
          if (!orderStore.orderCreationData?.styleConfig) {
            Alert.alert("Error", "Please configure style preferences")
            return
          }
          break
        case 4: // Pricing
          // Generate draft order
          try {
            orderStore.createNigerianDraftOrder()
          } catch (error) {
            Alert.alert("Error", error.message)
            return
          }
          break
        case 5: // Confirmation
          // Submit order
          handleSubmitOrder()
          return
      }

      orderStore.nextCreationStep()
    }

    const handlePrevious = () => {
      orderStore.previousCreationStep()
    }

    const handleSubmitOrder = async () => {
      try {
        const createdOrder = await orderStore.submitNigerianDraftOrder()
        Alert.alert("Success", `Order ${createdOrder.orderNumber} created successfully!`, [
          {
            text: "View Order",
            onPress: () => navigation.navigate("orderDetail", { orderId: createdOrder.id }),
          },
          {
            text: "Create Another",
            onPress: () => orderStore.startOrderCreation(),
          },
        ])
      } catch (error) {
        Alert.alert("Error", "Failed to create order: " + error.message)
      }
    }

    const renderStep = () => {
      switch (orderStore.orderCreationStep) {
        case 0:
          return <CustomerInfoStep />
        case 1:
          return <MeasurementStep />
        case 2:
          return <FabricSelectionStep />
        case 3:
          return <StyleConfigStep />
        case 4:
          return <PricingStep />
        case 5:
          return <ConfirmationStep />
        default:
          return null
      }
    }

    const renderProgress = () => {
      const steps = ["Customer", "Measurements", "Fabric", "Style", "Pricing", "Confirm"]

      return (
        <View style={PROGRESS_CONTAINER}>
          {steps.map((step, index) => {
            const isActive = index === orderStore.orderCreationStep
            const isCompleted = index < orderStore.orderCreationStep

            return (
              <View key={step} style={PROGRESS_STEP}>
                {index < steps.length - 1 && (
                  <View style={[PROGRESS_LINE, isCompleted && PROGRESS_LINE_COMPLETED]} />
                )}
                <View
                  style={[
                    PROGRESS_DOT,
                    isActive && PROGRESS_DOT_ACTIVE,
                    isCompleted && PROGRESS_DOT_COMPLETED,
                  ]}
                >
                  <Text style={PROGRESS_NUMBER}>{index + 1}</Text>
                </View>
                <Text style={PROGRESS_LABEL}>{step}</Text>
              </View>
            )
          })}
        </View>
      )
    }

    const getStepTitle = () => {
      const titles = [
        "Customer Information",
        "Measurements",
        "Fabric Selection",
        "Style Preferences",
        "Pricing & Payment",
        "Order Confirmation",
      ]
      return titles[orderStore.orderCreationStep]
    }

    const getStepSubtitle = () => {
      const subtitles = [
        "Enter customer details and contact information",
        "Select existing measurements or create new ones",
        "Choose fabric type, color, and quantity",
        "Configure garment style and preferences",
        "Review pricing and select payment method",
        "Review and confirm your order",
      ]
      return subtitles[orderStore.orderCreationStep]
    }

    return (
      <Screen style={CONTAINER} preset="fixed" safeAreaEdges={["top"]}>
        <Header title="Create Order" leftIcon="back" onLeftPress={() => navigation.goBack()} />

        {renderProgress()}

        <ScrollView style={CONTENT} showsVerticalScrollIndicator={false}>
          <Text style={STEP_TITLE}>{getStepTitle()}</Text>
          <Text style={STEP_SUBTITLE}>{getStepSubtitle()}</Text>

          <View style={STEP_CONTAINER}>{renderStep()}</View>
        </ScrollView>

        <View style={NAVIGATION_CONTAINER}>
          <Button
            style={NAV_BUTTON}
            preset="default"
            text="Previous"
            onPress={handlePrevious}
            disabled={orderStore.orderCreationStep === 0}
          />
          <Button
            style={NAV_BUTTON}
            preset="primary"
            text={orderStore.orderCreationStep === 5 ? "Submit Order" : "Next"}
            onPress={handleNext}
          />
        </View>
      </Screen>
    )
  })
