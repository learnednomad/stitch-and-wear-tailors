import { useRouter, useLocalSearchParams } from "expo-router"
import React, { FC, useState, useEffect } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  FlatList,
  Alert,
} from "react-native"
import { Button, Screen, Icon, Text, AutoImage } from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import { useAuth } from "@/contexts/AuthContext"

interface Style {
  id: string
  name: string
  description: string
  category: "traditional" | "modern" | "formal" | "casual"
  baseFee: number
  estimatedHours: number
  complexity: "simple" | "moderate" | "complex"
  image?: string
}

interface Fabric {
  id: string
  name: string
  description: string
  category: string
  color: string
  material: string
  pricePerYard: number
  isAvailable: boolean
  image?: string
}


export const NewOrderScreen: FC = () => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const router = useRouter()
  const { user } = useAuth()

  // Reorder entry point: OrderDetail pre-selects the past order's style and
  // fabric via route params (the store's orderCreationData is hydrated too)
  const { reorderStyleId, reorderFabricId } = useLocalSearchParams<{
    reorderStyleId?: string
    reorderFabricId?: string
  }>()

  const [selectedStyle, setSelectedStyle] = useState<string>(reorderStyleId ?? "")
  const [selectedFabric, setSelectedFabric] = useState<string>(reorderFabricId ?? "")
  const [currentStep, setCurrentStep] = useState<"style" | "fabric" | "review">("style")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  // Mock data - would come from API/store in real implementation
  const styles: Style[] = [
    {
      id: "kaftan-1",
      name: "Traditional Kaftan",
      description: "Classic flowing design with intricate patterns",
      category: "traditional",
      baseFee: 35000,
      estimatedHours: 8,
      complexity: "moderate",
    },
    {
      id: "agbada-1",
      name: "Premium Agbada",
      description: "Formal ceremonial wear with embroidery",
      category: "formal",
      baseFee: 65000,
      estimatedHours: 15,
      complexity: "complex",
    },
    {
      id: "shirt-1",
      name: "Modern Shirt",
      description: "Contemporary fitted shirt design",
      category: "modern",
      baseFee: 18000,
      estimatedHours: 4,
      complexity: "simple",
    },
    {
      id: "dress-1",
      name: "Casual Dress",
      description: "Comfortable everyday wear",
      category: "casual",
      baseFee: 25000,
      estimatedHours: 6,
      complexity: "moderate",
    },
  ]

  const fabrics: Fabric[] = [
    {
      id: "ankara-1",
      name: "Ankara Cotton",
      description: "Premium cotton with traditional prints",
      category: "Cotton",
      color: "Multicolor",
      material: "Cotton",
      pricePerYard: 3500,
      isAvailable: true,
    },
    {
      id: "silk-1",
      name: "Pure Silk",
      description: "Luxurious silk fabric for formal wear",
      category: "Silk",
      color: "Royal Blue",
      material: "Silk",
      pricePerYard: 8500,
      isAvailable: true,
    },
    {
      id: "lace-1",
      name: "French Lace",
      description: "Delicate lace for special occasions",
      category: "Lace",
      color: "Cream",
      material: "Lace",
      pricePerYard: 12000,
      isAvailable: true,
    },
    {
      id: "cotton-1",
      name: "Plain Cotton",
      description: "High-quality plain cotton fabric",
      category: "Cotton",
      color: "White",
      material: "Cotton",
      pricePerYard: 2500,
      isAvailable: true,
    },
  ]

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return colors.palette.success500
      case "moderate":
        return colors.palette.warning500
      case "complex":
        return colors.palette.error500
      default:
        return colors.palette.neutral500
    }
  }

  const selectedStyleData = styles.find((s) => s.id === selectedStyle)
  const selectedFabricData = fabrics.find((f) => f.id === selectedFabric)

  const totalAmount =
    (selectedStyleData?.baseFee || 0) + (selectedFabricData?.pricePerYard || 0) * 3 // Assuming 3 yards needed

  const renderStyleCard = ({ item }: { item: Style }) => (
    <TouchableOpacity
      className={`bg-neutral100 rounded-[12px] p-lg mb-md ${
        selectedStyle === item.id ? "border-2 border-primary500" : "border border-neutral200"
      }`}
      onPress={() => setSelectedStyle(item.id)}
      accessible
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedStyle === item.id }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-md">
          <Text className="text-[16px] font-semibold mb-xxs" style={$textNeutral900}>
            {item.name}
          </Text>
          <Text className="text-[13px] mb-sm leading-[18px]" style={$textNeutral600}>
            {item.description}
          </Text>
          <View className="flex-row items-center">
            <View
              className="px-xs py-[2px] rounded-[4px] mr-sm"
              style={{ backgroundColor: getComplexityColor(item.complexity) + "20" }}
            >
              <Text
                className="text-[10px] font-semibold uppercase"
                style={{ color: getComplexityColor(item.complexity) }}
              >
                {item.complexity}
              </Text>
            </View>
            <Text className="text-[12px]" style={$textNeutral500}>
              {item.estimatedHours}h
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[16px] font-bold mb-sm" style={$textPrimary500}>
            ₦{item.baseFee.toLocaleString()}
          </Text>
          <View
            className={`w-[24px] h-[24px] rounded-[12px] border-2 justify-center items-center ${
              selectedStyle === item.id ? "border-primary500" : "border-neutral300"
            }`}
          >
            {selectedStyle === item.id && (
              <View className="w-[12px] h-[12px] rounded-[6px] bg-primary500" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderFabricCard = ({ item }: { item: Fabric }) => (
    <TouchableOpacity
      className={`bg-neutral100 rounded-[12px] p-lg mb-md ${
        selectedFabric === item.id ? "border-2 border-primary500" : "border border-neutral200"
      }`}
      onPress={() => setSelectedFabric(item.id)}
      accessible
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedFabric === item.id }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-md">
          <Text className="text-[16px] font-semibold mb-xxs" style={$textNeutral900}>
            {item.name}
          </Text>
          <Text className="text-[13px] mb-sm leading-[18px]" style={$textNeutral600}>
            {item.description}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[12px] mr-sm" style={$textNeutral500}>
              {item.material}
            </Text>
            <Text className="text-[12px]" style={$textNeutral500}>
              {item.color}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[14px] font-semibold mb-sm" style={$textPrimary500}>
            ₦{item.pricePerYard.toLocaleString()}/yd
          </Text>
          <View
            className={`w-[24px] h-[24px] rounded-[12px] border-2 justify-center items-center ${
              selectedFabric === item.id ? "border-primary500" : "border-neutral300"
            }`}
          >
            {selectedFabric === item.id && (
              <View className="w-[12px] h-[12px] rounded-[6px] bg-primary500" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const handleNext = () => {
    if (currentStep === "style") {
      if (!selectedStyle) {
        Alert.alert("Please Select Style", "Choose a style to continue")
        return
      }
      setCurrentStep("fabric")
    } else if (currentStep === "fabric") {
      if (!selectedFabric) {
        Alert.alert("Please Select Fabric", "Choose a fabric to continue")
        return
      }
      setCurrentStep("review")
    }
  }

  const handleCreateOrder = () => {
    // Navigate to measurement screen or create order
    Alert.alert("Create Order", "Proceed to measurement collection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => {
          router.push({
            pathname: "/orders/measurement",
            params: {
              styleId: selectedStyle,
              fabricId: selectedFabric,
              amount: totalAmount,
            },
          })
        },
      },
    ])
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "style":
        return (
          <View className="px-lg">
            <Text className="text-[24px] font-bold mb-xs" style={$textNeutral900}>
              Choose Your Style
            </Text>
            <Text className="text-[14px] mb-lg leading-[20px]" style={$textNeutral600}>
              Select from our collection of traditional and modern designs
            </Text>
            <FlatList
              data={styles}
              renderItem={renderStyleCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )

      case "fabric":
        return (
          <View className="px-lg">
            <Text className="text-[24px] font-bold mb-xs" style={$textNeutral900}>
              Select Fabric
            </Text>
            <Text className="text-[14px] mb-lg leading-[20px]" style={$textNeutral600}>
              Choose the perfect fabric for your {selectedStyleData?.name}
            </Text>
            <FlatList
              data={fabrics}
              renderItem={renderFabricCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )

      case "review":
        return (
          <View className="px-lg">
            <Text className="text-[24px] font-bold mb-xs" style={$textNeutral900}>
              Review Your Order
            </Text>
            <Text className="text-[14px] mb-lg leading-[20px]" style={$textNeutral600}>
              Confirm your selections before proceeding to measurements
            </Text>

            <View className="bg-neutral100 rounded-[12px] p-lg mb-md border border-neutral200">
              <Text className="text-[14px] font-semibold mb-sm" style={$textNeutral900}>
                Style
              </Text>
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[16px] font-medium" style={$textNeutral900}>
                  {selectedStyleData?.name}
                </Text>
                <Text className="text-[16px] font-semibold" style={$textPrimary500}>
                  ₦{selectedStyleData?.baseFee.toLocaleString()}
                </Text>
              </View>
              <Text className="text-[13px] leading-[18px]" style={$textNeutral600}>
                {selectedStyleData?.description}
              </Text>
            </View>

            <View className="bg-neutral100 rounded-[12px] p-lg mb-md border border-neutral200">
              <Text className="text-[14px] font-semibold mb-sm" style={$textNeutral900}>
                Fabric
              </Text>
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[16px] font-medium" style={$textNeutral900}>
                  {selectedFabricData?.name}
                </Text>
                <Text className="text-[16px] font-semibold" style={$textPrimary500}>
                  ₦{((selectedFabricData?.pricePerYard || 0) * 3).toLocaleString()}
                </Text>
              </View>
              <Text className="text-[13px] leading-[18px]" style={$textNeutral600}>
                {selectedFabricData?.description} • 3 yards estimated
              </Text>
            </View>

            <View className="bg-primary100 rounded-[12px] p-lg mb-md border border-primary200">
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[18px] font-semibold" style={$textNeutral900}>
                  Total Estimated Cost
                </Text>
                <Text className="text-[20px] font-bold" style={$textPrimary600}>
                  ₦{totalAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-lg py-md border-b border-b-neutral200">
          <TouchableOpacity
            className="w-[40px] h-[40px] justify-center items-center"
            onPress={() => {
              if (currentStep === "style") {router.back()
              } else if (currentStep === "fabric") {
                setCurrentStep("style")
              } else {
                setCurrentStep("fabric")
              }
            }}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-semibold text-center" style={$textNeutral900}>
            New Order
          </Text>
          <View className="w-[40px]" />
        </View>

        {/* Progress Indicator */}
        <View className="px-lg py-lg">
          <View className="flex-row items-center justify-center">
            <View
              className={`px-md py-sm rounded-[20px] ${
                currentStep === "style" ? "bg-primary500" : "bg-neutral200"
              }`}
            >
              <Text
                className="text-[12px] font-medium"
                style={currentStep === "style" ? $textNeutral100 : $textNeutral600}
              >
                Style
              </Text>
            </View>
            <View className="w-[30px] h-[2px] bg-neutral300 mx-xs" />
            <View
              className={`px-md py-sm rounded-[20px] ${
                currentStep === "fabric" ? "bg-primary500" : "bg-neutral200"
              }`}
            >
              <Text
                className="text-[12px] font-medium"
                style={currentStep === "fabric" ? $textNeutral100 : $textNeutral600}
              >
                Fabric
              </Text>
            </View>
            <View className="w-[30px] h-[2px] bg-neutral300 mx-xs" />
            <View
              className={`px-md py-sm rounded-[20px] ${
                currentStep === "review" ? "bg-primary500" : "bg-neutral200"
              }`}
            >
              <Text
                className="text-[12px] font-medium"
                style={currentStep === "review" ? $textNeutral100 : $textNeutral600}
              >
                Review
              </Text>
            </View>
          </View>
        </View>

        {/* Step Content */}
        {renderStepContent()}
      </ScrollView>

      {/* Bottom Actions */}
      <View
        className="px-lg pt-md pb-md bg-neutral100 border-t border-t-neutral200"
        style={$bottomContainerInsets}
      >
        <View className="flex-row gap-md">
          {currentStep !== "style" && (
            <Button
              text="Back"
              style={$secondaryButton}
              textStyle={$secondaryButtonText}
              onPress={() => {
                if (currentStep === "fabric") {
                  setCurrentStep("style")
                } else if (currentStep === "review") {
                  setCurrentStep("fabric")
                }
              }}
            />
          )}
          <Button
            text={currentStep === "review" ? "Create Order" : "Next"}
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={currentStep === "review" ? handleCreateOrder : handleNext}
          />
        </View>
      </View>
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// inline (light in both schemes) — no `dark:` variants. Layout, spacing, and
// container backgrounds/borders are className token utilities.

// Text color overrides (static, light-only).
const $textNeutral900: TextStyle = { color: colors.palette.neutral900 }
const $textNeutral600: TextStyle = { color: colors.palette.neutral600 }
const $textNeutral500: TextStyle = { color: colors.palette.neutral500 }
const $textNeutral100: TextStyle = { color: colors.palette.neutral100 }
const $textPrimary500: TextStyle = { color: colors.palette.primary500 }
const $textPrimary600: TextStyle = { color: colors.palette.primary600 }

// Button style overrides stay inline (Button owns its className).
const $primaryButton: ViewStyle = {
  flex: 1,
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
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
}
