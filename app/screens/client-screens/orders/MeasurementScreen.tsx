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
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
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

interface MeasurementScreenProps extends AppStackScreenProps<"Measurement"> {}

export const MeasurementScreen: FC<MeasurementScreenProps> = ({ route }) => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const { orderStore } = useStores()
  const { user } = useAuth()

  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [unit, setUnit] = useState<"cm" | "inches">("cm")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Extract order details from route params
  const { styleId = "kaftan-1", fabricId = "ankara-1", amount = 45000 } = route?.params || {}

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

      const createdOrder = await orderStore.submitNigerianDraftOrder()

      Alert.alert(
        "Order Created Successfully!",
        `Your order #${createdOrder?.orderNumber} has been created. You will receive updates on the progress.`,
        [
          {
            text: "View Orders",
            onPress: () => navigation.navigate("Orders" as never),
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
    <View key={field.id} style={$measurementField}>
      <Text style={$fieldLabel}>
        {field.label}
        {field.required && <Text style={$requiredIndicator}> *</Text>}
      </Text>
      <View style={$inputContainer}>
        <TextInput
          style={$textInput}
          placeholder={field.placeholder}
          placeholderTextColor={colors.palette.neutral400}
          value={measurements[field.id] || ""}
          onChangeText={(value) => handleMeasurementChange(field.id, value)}
          keyboardType="numeric"
          returnKeyType="next"
        />
        <View style={$unitContainer}>
          <Text style={$unitText}>{field.unit}</Text>
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
          <Text style={$headerTitle}>Measurements</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Introduction */}
        <View style={$section}>
          <View style={$introCard}>
            <Icon icon="settings" size={24} color={colors.palette.primary500} />
            <View style={$introContent}>
              <Text style={$introTitle}>Precise Measurements Required</Text>
              <Text style={$introText}>
                Accurate measurements ensure a perfect fit. Please use a measuring tape and have
                someone assist you for best results.
              </Text>
            </View>
          </View>
        </View>

        {/* Unit Selector */}
        <View style={$section}>
          <Text style={$sectionTitle}>Measurement Unit</Text>
          <View style={$unitSelector}>
            <TouchableOpacity
              style={[$unitOption, unit === "cm" && $selectedUnitOption]}
              onPress={() => setUnit("cm")}
            >
              <Text style={[$unitOptionText, unit === "cm" && $selectedUnitOptionText]}>
                Centimeters (cm)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[$unitOption, unit === "inches" && $selectedUnitOption]}
              onPress={() => setUnit("inches")}
            >
              <Text style={[$unitOptionText, unit === "inches" && $selectedUnitOptionText]}>
                Inches (in)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Measurement Fields */}
        <View style={$section}>
          <Text style={$sectionTitle}>Body Measurements</Text>
          <View style={$measurementContainer}>{measurementFields.map(renderMeasurementField)}</View>
        </View>

        {/* Special Instructions */}
        <View style={$section}>
          <Text style={$sectionTitle}>Special Instructions</Text>
          <Text style={$sectionDescription}>
            Any specific preferences or modifications you'd like us to know about
          </Text>
          <View style={$textAreaContainer}>
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
        <View style={$section}>
          <Text style={$sectionTitle}>Measurement Tips</Text>
          <View style={$tipsContainer}>
            <View style={$tipItem}>
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text style={$tipText}>Use a flexible measuring tape</Text>
            </View>
            <View style={$tipItem}>
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text style={$tipText}>Measure over fitted undergarments</Text>
            </View>
            <View style={$tipItem}>
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text style={$tipText}>Keep the tape parallel to the floor</Text>
            </View>
            <View style={$tipItem}>
              <Icon icon="check" size={16} color={colors.palette.success500} />
              <Text style={$tipText}>Don't pull the tape too tight</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        <View style={$totalContainer}>
          <Text style={$totalText}>Order Total</Text>
          <Text style={$totalAmount}>₦{amount.toLocaleString()}</Text>
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
  marginBottom: spacing.sm,
}

const $sectionDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginBottom: spacing.md,
  lineHeight: 18,
}

const $introCard: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
  alignItems: "flex-start",
}

const $introContent: ViewStyle = {
  flex: 1,
  marginLeft: spacing.sm,
}

const $introTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.primary700,
  marginBottom: spacing.xs,
}

const $introText: TextStyle = {
  fontSize: 13,
  color: colors.palette.primary700,
  lineHeight: 18,
}

const $unitSelector: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $unitOption: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  alignItems: "center",
}

const $selectedUnitOption: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $unitOptionText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral700,
}

const $selectedUnitOptionText: TextStyle = {
  color: colors.palette.neutral100,
}

const $measurementContainer: ViewStyle = {
  gap: spacing.md,
}

const $measurementField: ViewStyle = {
  marginBottom: spacing.sm,
}

const $fieldLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $requiredIndicator: TextStyle = {
  color: colors.palette.error500,
}

const $inputContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $textInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.palette.neutral900,
}

const $unitContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.palette.neutral200,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
}

const $unitText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral600,
}

const $textAreaContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $textArea: TextStyle = {
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 14,
  color: colors.palette.neutral900,
  minHeight: 100,
}

const $tipsContainer: ViewStyle = {
  gap: spacing.sm,
}

const $tipItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $tipText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral700,
  marginLeft: spacing.sm,
}

const $totalContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
}

const $totalText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.primary700,
}

const $totalAmount: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.primary600,
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
