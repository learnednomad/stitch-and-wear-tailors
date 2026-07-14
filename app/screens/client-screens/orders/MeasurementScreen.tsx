import { useRouter, useLocalSearchParams } from "expo-router"
import React, { FC, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  Alert,
} from "react-native"
import { Button, Screen, Icon, Text } from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import { useOrderDraftStore } from "@/state/orderDraftStore"
import { useCreateOrder } from "@/api/orders"
import { useAuth } from "@/contexts/AuthContext"

/** Map the catalog style ids used by NewOrderScreen to domain garment types */
const STYLE_TO_GARMENT: Record<string, string> = {
  "kaftan-1": "kaftan",
  "agbada-1": "agbada",
  "shirt-1": "modern",
  "dress-1": "ankara_dress",
}

/** Map the catalog fabric ids used by NewOrderScreen to domain fabric types */
const FABRIC_TO_TYPE: Record<string, { type: string; color: string; unitPrice: number }> = {
  "ankara-1": { type: "ankara", color: "Multicolor", unitPrice: 3500 },
  "silk-1": { type: "silk", color: "Royal Blue", unitPrice: 8500 },
  "lace-1": { type: "lace", color: "Cream", unitPrice: 12000 },
  "cotton-1": { type: "cotton", color: "White", unitPrice: 2500 },
}

interface MeasurementField {
  id: string
  label: string
  placeholder: string
  required: boolean
  unit: string
}

interface MeasurementData {
  [key: string]: string
}


export const MeasurementScreen: FC = () => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const router = useRouter()
  const orderStore = useOrderDraftStore()
  const createOrderMutation = useCreateOrder()
  const { user } = useAuth()

  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [unit, setUnit] = useState<"cm" | "inches">("cm")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Extract order details from route params (all params arrive as strings)
  const params = useLocalSearchParams<{ styleId?: string; fabricId?: string; amount?: string }>()
  const styleId = params.styleId ?? "kaftan-1"
  const fabricId = params.fabricId ?? "ankara-1"
  const amount = params.amount ? Number(params.amount) : 45000

  // Different measurement fields based on style
  const getMeasurementFields = (styleId: string): MeasurementField[] => {
    const baseFields = [
      {
        id: "chest",
        label: "Chest/Bust",
        placeholder: "Enter chest measurement",
        required: true,
        unit: unit,
      },
      {
        id: "waist",
        label: "Waist",
        placeholder: "Enter waist measurement",
        required: true,
        unit: unit,
      },
      {
        id: "hips",
        label: "Hips",
        placeholder: "Enter hip measurement",
        required: true,
        unit: unit,
      },
      {
        id: "length",
        label: "Length",
        placeholder: "Enter desired length",
        required: true,
        unit: unit,
      },
    ]

    if (styleId?.includes("agbada") || styleId?.includes("kaftan")) {
      return [
        ...baseFields,
        {
          id: "shoulders",
          label: "Shoulders",
          placeholder: "Enter shoulder width",
          required: true,
          unit: unit,
        },
        {
          id: "sleeves",
          label: "Sleeve Length",
          placeholder: "Enter sleeve length",
          required: true,
          unit: unit,
        },
        {
          id: "neck",
          label: "Neck",
          placeholder: "Enter neck measurement",
          required: false,
          unit: unit,
        },
      ]
    }

    if (styleId?.includes("shirt")) {
      return [
        ...baseFields,
        {
          id: "shoulders",
          label: "Shoulders",
          placeholder: "Enter shoulder width",
          required: true,
          unit: unit,
        },
        {
          id: "sleeves",
          label: "Sleeve Length",
          placeholder: "Enter sleeve length",
          required: true,
          unit: unit,
        },
        {
          id: "collar",
          label: "Collar",
          placeholder: "Enter collar size",
          required: false,
          unit: unit,
        },
      ]
    }

    return baseFields
  }

  const measurementFields = getMeasurementFields(styleId)

  const handleMeasurementChange = (fieldId: string, value: string) => {
    setMeasurements((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const validateMeasurements = (): boolean => {
    const requiredFields = measurementFields.filter((field) => field.required)
    const missingFields = requiredFields.filter((field) => !measurements[field.id]?.trim())

    if (missingFields.length > 0) {
      Alert.alert(
        "Missing Measurements",
        `Please provide measurements for: ${missingFields.map((f) => f.label).join(", ")}`,
      )
      return false
    }

    // Basic validation for reasonable measurement values
    const numericFields = Object.entries(measurements).filter(([_, value]) => value.trim())
    for (const [fieldId, value] of numericFields) {
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue <= 0 || numValue > 200) {
        const field = measurementFields.find((f) => f.id === fieldId)
        Alert.alert(
          "Invalid Measurement",
          `Please check the ${field?.label} measurement. It should be a valid number.`,
        )
        return false
      }
    }

    return true
  }

  const createOrder = async () => {
    try {
      setIsSubmitting(true)

      const fabricInfo = FABRIC_TO_TYPE[fabricId] || { type: "ankara", color: "", unitPrice: 0 }
      const fabricQuantity = 3 // yards, matching the NewOrderScreen estimate

      // Populate the store's creation workflow, then build and submit the
      // draft — submission maps the draft to PocketBase via order-api
      orderStore.startOrderCreation()
      orderStore.setOrderCustomerInfo({
        firstName: user?.firstName || user?.name || "Customer",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phone || "",
        address: user?.location || "",
        city: "lagos",
        preferredLanguage: "en",
      } as any)
      orderStore.setOrderFabricSelection({
        type: fabricInfo.type,
        color: fabricInfo.color,
        quantity: fabricQuantity,
        unitPrice: fabricInfo.unitPrice,
        totalPrice: fabricInfo.unitPrice * fabricQuantity,
      } as any)
      orderStore.setOrderStyleConfig({
        garmentType: STYLE_TO_GARMENT[styleId] || "custom",
        fitPreference: "regular",
        designNotes: specialInstructions || null,
        culturalSpecifications: null,
      })
      orderStore.createNigerianDraftOrder()

      // Submit the freshly built draft via the React Query create mutation.
      const draft = useOrderDraftStore.getState().draftOrder
      const createdOrder = await createOrderMutation.mutateAsync(draft as Record<string, any>)
      useOrderDraftStore.getState().clearDraftOrder()

      Alert.alert(
        "Order Created Successfully!",
        `Your order #${createdOrder?.orderNumber} has been created. You will receive updates on the progress.`,
        [
          {
            text: "View Orders",
            onPress: () =>router.push("/orders"),
          },
        ],
      )
    } catch (error) {
      console.error("Failed to create order:", error)
      Alert.alert("Order Failed", "There was an error creating your order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (!validateMeasurements()) {
      return
    }

    Alert.alert("Create Order", "Your measurements have been collected. Create the order now?", [
      { text: "Cancel", style: "cancel" },
      { text: "Create Order", onPress: () => createOrder() },
    ])
  }

  const renderMeasurementField = (field: MeasurementField) => (
    <View key={field.id} className="mb-sm">
      <Text className="text-[14px] font-medium mb-xs" style={$fieldLabelColor}>
        {field.label}
        {field.required && (
          <Text className="text-[14px]" style={$requiredIndicatorColor}>
            {" *"}
          </Text>
        )}
      </Text>
      <View className="flex-row items-center bg-neutral100 rounded-[8px] border border-neutral300">
        <TextInput
          style={$textInput}
          placeholder={field.placeholder}
          placeholderTextColor={colors.palette.neutral400}
          value={measurements[field.id] || ""}
          onChangeText={(value) => handleMeasurementChange(field.id, value)}
          keyboardType="numeric"
          returnKeyType="next"
        />
        <View className="px-md py-sm bg-neutral200 rounded-r-[8px]">
          <Text className="text-[14px] font-medium" style={$unitTextColor}>
            {field.unit}
          </Text>
        </View>
      </View>
    </View>
  )

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      <ScrollView style={$container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-lg py-md border-b border-b-neutral200">
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
            Measurements
          </Text>
          <View className="w-[40px]" />
        </View>

        {/* Introduction */}
        <View className="px-lg py-lg">
          <View className="flex-row bg-primary100 rounded-[8px] p-md items-start">
            <Icon icon="settings" size={24} color={colors.palette.primary500} />
            <View className="flex-1 ml-sm">
              <Text className="text-[14px] font-semibold mb-xs" style={$introTitleColor}>
                Precise Measurements Required
              </Text>
              <Text className="text-[13px] leading-[18px]" style={$introTextColor}>
                Accurate measurements ensure a perfect fit. Please use a measuring tape and have
                someone assist you for best results.
              </Text>
            </View>
          </View>
        </View>

        {/* Unit Selector */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-sm" style={$sectionTitleColor}>
            Measurement Unit
          </Text>
          <View className="flex-row gap-sm">
            <TouchableOpacity
              className={`flex-1 py-sm px-md rounded-[8px] border items-center ${
                unit === "cm" ? "bg-primary500 border-primary500" : "border-neutral300"
              }`}
              onPress={() => setUnit("cm")}
            >
              <Text
                className="text-[14px] font-medium"
                style={unit === "cm" ? $selectedUnitOptionTextColor : $unitOptionTextColor}
              >
                Centimeters (cm)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-sm px-md rounded-[8px] border items-center ${
                unit === "inches" ? "bg-primary500 border-primary500" : "border-neutral300"
              }`}
              onPress={() => setUnit("inches")}
            >
              <Text
                className="text-[14px] font-medium"
                style={unit === "inches" ? $selectedUnitOptionTextColor : $unitOptionTextColor}
              >
                Inches (in)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Measurement Fields */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-sm" style={$sectionTitleColor}>
            Body Measurements
          </Text>
          <View className="gap-md">{measurementFields.map(renderMeasurementField)}</View>
        </View>

        {/* Special Instructions */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-sm" style={$sectionTitleColor}>
            Special Instructions
          </Text>
          <Text className="text-[13px] mb-md leading-[18px]" style={$sectionDescriptionColor}>
            Any specific preferences or modifications you'd like us to know about
          </Text>
          <View className="bg-neutral100 rounded-[8px] border border-neutral300">
            <TextInput
              style={$textArea}
              placeholder="e.g., Extra room in sleeves, specific fit preferences, color matching requests..."
              placeholderTextColor={colors.palette.neutral400}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Measurement Tips */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-sm" style={$sectionTitleColor}>
            Measurement Tips
          </Text>
          <View className="gap-sm">
            <View className="flex-row items-center">
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text className="text-[13px] ml-sm" style={$tipTextColor}>
                Use a flexible measuring tape
              </Text>
            </View>
            <View className="flex-row items-center">
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text className="text-[13px] ml-sm" style={$tipTextColor}>
                Measure over fitted undergarments
              </Text>
            </View>
            <View className="flex-row items-center">
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text className="text-[13px] ml-sm" style={$tipTextColor}>
                Keep the tape parallel to the floor
              </Text>
            </View>
            <View className="flex-row items-center">
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text className="text-[13px] ml-sm" style={$tipTextColor}>
                Don't pull the tape too tight
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-lg pt-md pb-md bg-neutral100 border-t border-t-neutral200" style={$bottomContainerInsets}>
        <View className="flex-row justify-between items-center mb-md py-sm px-md bg-primary100 rounded-[8px]">
          <Text className="text-[16px] font-semibold" style={$totalTextColor}>
            Order Total
          </Text>
          <Text className="text-[20px] font-bold" style={$totalAmountColor}>
            ₦{amount.toLocaleString()}
          </Text>
        </View>
        <Button
          text={isSubmitting ? "Creating Order..." : "Create Order"}
          style={$primaryButton}
          textStyle={$primaryButtonText}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
      </View>
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. The two raw
// react-native <TextInput> styles and the Button style overrides stay inline.
const $container: ViewStyle = {
  flex: 1,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionDescriptionColor: TextStyle = { color: colors.palette.neutral600 }
const $introTitleColor: TextStyle = { color: colors.palette.primary700 }
const $introTextColor: TextStyle = { color: colors.palette.primary700 }
const $fieldLabelColor: TextStyle = { color: colors.palette.neutral900 }
const $requiredIndicatorColor: TextStyle = { color: colors.palette.error500 }
const $unitTextColor: TextStyle = { color: colors.palette.neutral600 }
const $unitOptionTextColor: TextStyle = { color: colors.palette.neutral700 }
const $selectedUnitOptionTextColor: TextStyle = { color: colors.palette.neutral100 }
const $tipTextColor: TextStyle = { color: colors.palette.neutral700 }
const $totalTextColor: TextStyle = { color: colors.palette.primary700 }
const $totalAmountColor: TextStyle = { color: colors.palette.primary600 }

// Raw <TextInput> styles must stay inline (TextInput does not take className here).
const $textInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.palette.neutral900,
}

const $textArea: TextStyle = {
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 14,
  color: colors.palette.neutral900,
  minHeight: 100,
}

// Button style overrides stay inline (Button owns its className).
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
