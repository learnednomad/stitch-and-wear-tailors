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
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text, AutoImage } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
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

interface NewOrderScreenProps extends AppStackScreenProps<"NewOrder"> {}

export const NewOrderScreen: FC<NewOrderScreenProps> = observer(() => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const { orderStore, fabricStore } = useStores()
  const { user } = useAuth()
  
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [selectedFabric, setSelectedFabric] = useState<string>("")
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

  const selectedStyleData = styles.find(s => s.id === selectedStyle)
  const selectedFabricData = fabrics.find(f => f.id === selectedFabric)

  const totalAmount = (selectedStyleData?.baseFee || 0) + 
    ((selectedFabricData?.pricePerYard || 0) * 3) // Assuming 3 yards needed

  const renderStyleCard = ({ item }: { item: Style }) => (
    <TouchableOpacity
      style={[
        $styleCard,
        selectedStyle === item.id && $selectedCard,
      ]}
      onPress={() => setSelectedStyle(item.id)}
      accessible
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedStyle === item.id }}
    >
      <View style={$styleCardContent}>
        <View style={$styleInfo}>
          <Text style={$styleName}>{item.name}</Text>
          <Text style={$styleDescription}>{item.description}</Text>
          <View style={$styleDetails}>
            <View
              style={[
                $complexityBadge,
                { backgroundColor: getComplexityColor(item.complexity) + "20" },
              ]}
            >
              <Text
                style={[
                  $complexityText,
                  { color: getComplexityColor(item.complexity) },
                ]}
              >
                {item.complexity}
              </Text>
            </View>
            <Text style={$estimatedTime}>{item.estimatedHours}h</Text>
          </View>
        </View>
        <View style={$priceContainer}>
          <Text style={$priceText}>₦{item.baseFee.toLocaleString()}</Text>
          <View
            style={[
              $radioButton,
              selectedStyle === item.id && $radioButtonSelected,
            ]}
          >
            {selectedStyle === item.id && <View style={$radioButtonInner} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderFabricCard = ({ item }: { item: Fabric }) => (
    <TouchableOpacity
      style={[
        $fabricCard,
        selectedFabric === item.id && $selectedCard,
      ]}
      onPress={() => setSelectedFabric(item.id)}
      accessible
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedFabric === item.id }}
    >
      <View style={$fabricCardContent}>
        <View style={$fabricInfo}>
          <Text style={$fabricName}>{item.name}</Text>
          <Text style={$fabricDescription}>{item.description}</Text>
          <View style={$fabricDetails}>
            <Text style={$fabricMaterial}>{item.material}</Text>
            <Text style={$fabricColor}>{item.color}</Text>
          </View>
        </View>
        <View style={$priceContainer}>
          <Text style={$pricePerYard}>₦{item.pricePerYard.toLocaleString()}/yd</Text>
          <View
            style={[
              $radioButton,
              selectedFabric === item.id && $radioButtonSelected,
            ]}
          >
            {selectedFabric === item.id && <View style={$radioButtonInner} />}
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
    Alert.alert(
      "Create Order",
      "Proceed to measurement collection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            navigation.navigate("Measurement" as never, {
              styleId: selectedStyle,
              fabricId: selectedFabric,
              amount: totalAmount,
            })
          },
        },
      ],
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "style":
        return (
          <View style={$stepContent}>
            <Text style={$stepTitle}>Choose Your Style</Text>
            <Text style={$stepDescription}>
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
          <View style={$stepContent}>
            <Text style={$stepTitle}>Select Fabric</Text>
            <Text style={$stepDescription}>
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
          <View style={$stepContent}>
            <Text style={$stepTitle}>Review Your Order</Text>
            <Text style={$stepDescription}>
              Confirm your selections before proceeding to measurements
            </Text>
            
            <View style={$reviewCard}>
              <Text style={$reviewSectionTitle}>Style</Text>
              <View style={$reviewItem}>
                <Text style={$reviewItemName}>{selectedStyleData?.name}</Text>
                <Text style={$reviewItemPrice}>₦{selectedStyleData?.baseFee.toLocaleString()}</Text>
              </View>
              <Text style={$reviewItemDescription}>{selectedStyleData?.description}</Text>
            </View>

            <View style={$reviewCard}>
              <Text style={$reviewSectionTitle}>Fabric</Text>
              <View style={$reviewItem}>
                <Text style={$reviewItemName}>{selectedFabricData?.name}</Text>
                <Text style={$reviewItemPrice}>₦{((selectedFabricData?.pricePerYard || 0) * 3).toLocaleString()}</Text>
              </View>
              <Text style={$reviewItemDescription}>
                {selectedFabricData?.description} • 3 yards estimated
              </Text>
            </View>

            <View style={[$reviewCard, $totalCard]}>
              <View style={$reviewItem}>
                <Text style={$totalLabel}>Total Estimated Cost</Text>
                <Text style={$totalAmount}>₦{totalAmount.toLocaleString()}</Text>
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
      <ScrollView style={$container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={$header}>
          <TouchableOpacity
            style={$backButton}
            onPress={() => {
              if (currentStep === "style") {
                navigation.goBack()
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
          <Text style={$headerTitle}>New Order</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={$progressContainer}>
          <View style={$progressSteps}>
            <View style={[$progressStep, currentStep === "style" && $activeStep]}>
              <Text style={[$progressStepText, currentStep === "style" && $activeStepText]}>
                Style
              </Text>
            </View>
            <View style={$progressConnector} />
            <View style={[$progressStep, currentStep === "fabric" && $activeStep]}>
              <Text style={[$progressStepText, currentStep === "fabric" && $activeStepText]}>
                Fabric
              </Text>
            </View>
            <View style={$progressConnector} />
            <View style={[$progressStep, currentStep === "review" && $activeStep]}>
              <Text style={[$progressStepText, currentStep === "review" && $activeStepText]}>
                Review
              </Text>
            </View>
          </View>
        </View>

        {/* Step Content */}
        {renderStepContent()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        <View style={$bottomActions}>
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
})

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

const $progressContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
}

const $progressSteps: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
}

const $progressStep: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  backgroundColor: colors.palette.neutral200,
}

const $activeStep: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const $progressStepText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.neutral600,
}

const $activeStepText: TextStyle = {
  color: colors.palette.neutral100,
}

const $progressConnector: ViewStyle = {
  width: 30,
  height: 2,
  backgroundColor: colors.palette.neutral300,
  marginHorizontal: spacing.xs,
}

const $stepContent: ViewStyle = {
  paddingHorizontal: spacing.lg,
}

const $stepTitle: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $stepDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: spacing.lg,
  lineHeight: 20,
}

const $styleCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $fabricCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $selectedCard: ViewStyle = {
  borderColor: colors.palette.primary500,
  borderWidth: 2,
}

const $styleCardContent: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
}

const $fabricCardContent: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
}

const $styleInfo: ViewStyle = {
  flex: 1,
  marginRight: spacing.md,
}

const $fabricInfo: ViewStyle = {
  flex: 1,
  marginRight: spacing.md,
}

const $styleName: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $fabricName: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $styleDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginBottom: spacing.sm,
  lineHeight: 18,
}

const $fabricDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginBottom: spacing.sm,
  lineHeight: 18,
}

const $styleDetails: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $fabricDetails: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $complexityBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
  marginRight: spacing.sm,
}

const $complexityText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
  textTransform: "uppercase",
}

const $estimatedTime: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $fabricMaterial: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginRight: spacing.sm,
}

const $fabricColor: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $priceContainer: ViewStyle = {
  alignItems: "flex-end",
}

const $priceText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.primary500,
  marginBottom: spacing.sm,
}

const $pricePerYard: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.primary500,
  marginBottom: spacing.sm,
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
  borderColor: colors.palette.primary500,
}

const $radioButtonInner: ViewStyle = {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.primary500,
}

const $reviewCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $totalCard: ViewStyle = {
  backgroundColor: colors.palette.primary100,
  borderColor: colors.palette.primary200,
}

const $reviewSectionTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
}

const $reviewItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $reviewItemName: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: colors.palette.neutral900,
}

const $reviewItemPrice: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.primary500,
}

const $reviewItemDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  lineHeight: 18,
}

const $totalLabel: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
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

const $bottomActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
}

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