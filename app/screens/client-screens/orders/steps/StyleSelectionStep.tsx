/**
 * Style Selection Step
 * Fourth step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, TouchableOpacity, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button, Icon, AutoImage } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { NigerianGarmentType } from "@/types/orders"
import { nigerianBusinessConfig } from "@/i18n/nigerian-languages"

interface StyleOption {
  garmentType: NigerianGarmentType
  name: string
  description: string
  culturalSignificance: string
  complexity: number
  estimatedDays: number
  basePrice: number
  image?: string
  variations: StyleVariation[]
}

interface StyleVariation {
  id: string
  name: string
  description: string
  features: string[]
  priceAdjustment: number
}

export const StyleSelectionStep: FC = observer(() => {
  const { orderStore } = useStores()

  const [selectedGarmentType, setSelectedGarmentType] = useState<NigerianGarmentType | "">("")
  const [selectedVariation, setSelectedVariation] = useState<string>("")
  const [fitPreference, setFitPreference] = useState<"slim" | "regular" | "loose">("regular")
  const [designNotes, setDesignNotes] = useState<string>("")
  const [culturalSpecifications, setCulturalSpecifications] = useState<string>("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Nigerian garment styles with cultural context
  const styleOptions: StyleOption[] = [
    {
      garmentType: "agbada",
      name: nigerianBusinessConfig.traditionalGarments.agbada.name.en,
      description: nigerianBusinessConfig.traditionalGarments.agbada.description.en,
      culturalSignificance:
        nigerianBusinessConfig.traditionalGarments.agbada.culturalSignificance.en,
      complexity: nigerianBusinessConfig.traditionalGarments.agbada.complexityLevel,
      estimatedDays: nigerianBusinessConfig.traditionalGarments.agbada.estimatedDays,
      basePrice: nigerianBusinessConfig.traditionalGarments.agbada.basePrice,
      variations: [
        {
          id: "agbada-classic",
          name: "Classic Agbada",
          description: "Traditional flowing design with wide sleeves",
          features: [
            "Full flowing cut",
            "Wide sleeves",
            "Round neckline",
            "Traditional embroidery",
          ],
          priceAdjustment: 0,
        },
        {
          id: "agbada-modern",
          name: "Modern Agbada",
          description: "Contemporary fitted version",
          features: ["Fitted torso", "Tapered sleeves", "Modern collar", "Minimal embroidery"],
          priceAdjustment: 5000,
        },
        {
          id: "agbada-premium",
          name: "Premium Ceremonial",
          description: "Luxurious version for special occasions",
          features: [
            "Heavy embroidery",
            "Gold thread work",
            "Intricate patterns",
            "Premium finishing",
          ],
          priceAdjustment: 25000,
        },
      ],
    },
    {
      garmentType: "kaftan",
      name: nigerianBusinessConfig.traditionalGarments.kaftan.name.en,
      description: nigerianBusinessConfig.traditionalGarments.kaftan.description.en,
      culturalSignificance:
        nigerianBusinessConfig.traditionalGarments.kaftan.culturalSignificance.en,
      complexity: nigerianBusinessConfig.traditionalGarments.kaftan.complexityLevel,
      estimatedDays: nigerianBusinessConfig.traditionalGarments.kaftan.estimatedDays,
      basePrice: nigerianBusinessConfig.traditionalGarments.kaftan.basePrice,
      variations: [
        {
          id: "kaftan-casual",
          name: "Casual Kaftan",
          description: "Everyday comfortable wear",
          features: ["Loose fit", "Simple neckline", "Easy wear", "Minimal details"],
          priceAdjustment: 0,
        },
        {
          id: "kaftan-formal",
          name: "Formal Kaftan",
          description: "Elegant design for events",
          features: ["Tailored fit", "Decorative neckline", "Side pockets", "Quality finishing"],
          priceAdjustment: 3000,
        },
        {
          id: "kaftan-luxury",
          name: "Luxury Kaftan",
          description: "High-end version with premium details",
          features: [
            "Silk lining",
            "Hand-stitched details",
            "Custom embroidery",
            "Premium buttons",
          ],
          priceAdjustment: 10000,
        },
      ],
    },
    {
      garmentType: "isi_agu",
      name: "Isi Agu (Traditional Igbo Shirt)",
      description: "Traditional Igbo ceremonial shirt with symbolic patterns",
      culturalSignificance: "Sacred Igbo garment representing strength and leadership",
      complexity: 3,
      estimatedDays: 5,
      basePrice: 20000,
      variations: [
        {
          id: "isi-agu-traditional",
          name: "Traditional Isi Agu",
          description: "Classic lion head patterns",
          features: [
            "Lion head motifs",
            "Red color dominance",
            "Traditional cut",
            "Cultural authenticity",
          ],
          priceAdjustment: 0,
        },
        {
          id: "isi-agu-modern",
          name: "Modern Isi Agu",
          description: "Contemporary interpretation",
          features: ["Updated patterns", "Color variations", "Modern fit", "Fusion styling"],
          priceAdjustment: 2000,
        },
      ],
    },
    {
      garmentType: "babban_riga",
      name: "Babban Riga (Traditional Hausa Robe)",
      description: "Traditional Hausa flowing robe for formal occasions",
      culturalSignificance: "Symbol of dignity and respect in Hausa culture",
      complexity: 4,
      estimatedDays: 6,
      basePrice: 30000,
      variations: [
        {
          id: "babban-riga-classic",
          name: "Classic Babban Riga",
          description: "Traditional white flowing design",
          features: [
            "Full length",
            "Wide sleeves",
            "Traditional embroidery",
            "White or cream color",
          ],
          priceAdjustment: 0,
        },
        {
          id: "babban-riga-formal",
          name: "Formal Babban Riga",
          description: "Enhanced version for special events",
          features: ["Rich embroidery", "Quality fabric", "Formal styling", "Premium finishing"],
          priceAdjustment: 15000,
        },
      ],
    },
    {
      garmentType: "ankara_dress",
      name: "Ankara Dress",
      description: "Modern Nigerian dress using traditional Ankara fabric",
      culturalSignificance: "Celebration of African heritage through contemporary fashion",
      complexity: 2,
      estimatedDays: 4,
      basePrice: 18000,
      variations: [
        {
          id: "ankara-casual",
          name: "Casual Ankara Dress",
          description: "Comfortable everyday wear",
          features: ["A-line cut", "Knee length", "Simple styling", "Easy care"],
          priceAdjustment: 0,
        },
        {
          id: "ankara-formal",
          name: "Formal Ankara Dress",
          description: "Elegant design for events",
          features: ["Fitted bodice", "Flared skirt", "Statement sleeves", "Event styling"],
          priceAdjustment: 5000,
        },
        {
          id: "ankara-maxi",
          name: "Ankara Maxi Dress",
          description: "Full-length dramatic style",
          features: ["Floor length", "Flowing design", "Statement piece", "Versatile styling"],
          priceAdjustment: 7000,
        },
      ],
    },
    {
      garmentType: "senator",
      name: "Senator Style",
      description: "Modern Nigerian formal wear for men",
      culturalSignificance: "Contemporary Nigerian professional attire",
      complexity: 2,
      estimatedDays: 4,
      basePrice: 22000,
      variations: [
        {
          id: "senator-classic",
          name: "Classic Senator",
          description: "Standard professional styling",
          features: ["Mandarin collar", "Fitted cut", "Quality buttons", "Professional finish"],
          priceAdjustment: 0,
        },
        {
          id: "senator-premium",
          name: "Premium Senator",
          description: "High-end professional wear",
          features: ["Luxury fabric", "Custom fitting", "Premium buttons", "Executive styling"],
          priceAdjustment: 8000,
        },
      ],
    },
  ]

  useEffect(() => {
    // Load existing selection if available
    if (orderStore.orderCreationData?.styleConfig) {
      const existing = orderStore.orderCreationData.styleConfig
      setSelectedGarmentType(existing.garmentType)
      setFitPreference(existing.fitPreference)
      setDesignNotes(existing.designNotes || "")
      setCulturalSpecifications(existing.culturalSpecifications || "")
    }
  }, [])

  const selectedStyle = styleOptions.find((s) => s.garmentType === selectedGarmentType)
  const selectedVariationData = selectedStyle?.variations.find((v) => v.id === selectedVariation)

  const validateSelection = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedGarmentType) {
      newErrors.garmentType = "Please select a garment style"
    }

    if (!selectedVariation) {
      newErrors.variation = "Please select a style variation"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateSelection() && selectedStyle) {
      const styleConfig = {
        garmentType: selectedGarmentType as NigerianGarmentType,
        fitPreference,
        designNotes,
        culturalSpecifications,
        variation: selectedVariation,
        variationName: selectedVariationData?.name,
      }

      orderStore.setOrderStyleConfig(styleConfig)
      Alert.alert(
        "Style Selected",
        `${selectedStyle.name} - ${selectedVariationData?.name} has been selected.`,
      )
    }
  }

  const renderStyleCard = (style: StyleOption) => (
    <TouchableOpacity
      key={style.garmentType}
      style={[$styleCard, selectedGarmentType === style.garmentType && $selectedStyleCard]}
      onPress={() => {
        setSelectedGarmentType(style.garmentType)
        setSelectedVariation("") // Reset variation when style changes
        setErrors((prev) => ({ ...prev, garmentType: "", variation: "" }))
      }}
    >
      <View style={$styleHeader}>
        <Text style={$styleName}>{style.name}</Text>
        <View style={$complexityBadge}>
          <Text style={$complexityText}>
            {["Simple", "Easy", "Moderate", "Complex", "Expert"][style.complexity - 1]}
          </Text>
        </View>
      </View>

      <Text style={$styleDescription}>{style.description}</Text>

      <View style={$culturalInfo}>
        <Icon icon="star" size={16} color={colors.palette.tailorGold} />
        <Text style={$culturalText}>{style.culturalSignificance}</Text>
      </View>

      <View style={$styleDetails}>
        <View style={$styleDetail}>
          <Text style={$detailLabel}>Base Price:</Text>
          <Text style={$detailValue}>₦{style.basePrice.toLocaleString()}</Text>
        </View>
        <View style={$styleDetail}>
          <Text style={$detailLabel}>Duration:</Text>
          <Text style={$detailValue}>{style.estimatedDays} days</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderVariationCard = (variation: StyleVariation) => (
    <TouchableOpacity
      key={variation.id}
      style={[$variationCard, selectedVariation === variation.id && $selectedVariationCard]}
      onPress={() => {
        setSelectedVariation(variation.id)
        setErrors((prev) => ({ ...prev, variation: "" }))
      }}
    >
      <View style={$variationHeader}>
        <Text style={$variationName}>{variation.name}</Text>
        {variation.priceAdjustment > 0 && (
          <Text style={$priceAdjustment}>+₦{variation.priceAdjustment.toLocaleString()}</Text>
        )}
      </View>

      <Text style={$variationDescription}>{variation.description}</Text>

      <View style={$featuresList}>
        {variation.features.map((feature, index) => (
          <View key={index} style={$featureItem}>
            <Icon icon="checkmark" size={12} color={colors.palette.sageGreen} />
            <Text style={$featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>{orderStore.getTranslation("styleSelection", "en")}</Text>
        <Text style={$subtitle}>
          Choose the perfect style that reflects your personality and cultural heritage
        </Text>

        {/* Garment Type Selection */}
        <View style={$section}>
          <Text style={$sectionTitle}>Select Garment Type</Text>
          {errors.garmentType && <Text style={$errorText}>{errors.garmentType}</Text>}
          {styleOptions.map(renderStyleCard)}
        </View>

        {/* Style Variations */}
        {selectedStyle && (
          <View style={$section}>
            <Text style={$sectionTitle}>Choose Style Variation</Text>
            {errors.variation && <Text style={$errorText}>{errors.variation}</Text>}
            {selectedStyle.variations.map(renderVariationCard)}
          </View>
        )}

        {/* Fit Preference */}
        {selectedGarmentType && (
          <View style={$section}>
            <Text style={$sectionTitle}>Fit Preference</Text>
            <View style={$fitOptions}>
              {[
                {
                  value: "slim" as const,
                  label: "Slim Fit",
                  description: "Close-fitting silhouette",
                },
                {
                  value: "regular" as const,
                  label: "Regular Fit",
                  description: "Comfortable standard fit",
                },
                {
                  value: "loose" as const,
                  label: "Loose Fit",
                  description: "Relaxed comfortable wear",
                },
              ].map((fit) => (
                <Button
                  key={fit.value}
                  text={fit.label}
                  style={[$fitButton, fitPreference === fit.value && $selectedFitButton]}
                  textStyle={[
                    $fitButtonText,
                    fitPreference === fit.value && $selectedFitButtonText,
                  ]}
                  onPress={() => setFitPreference(fit.value)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Design Notes */}
        {selectedGarmentType && (
          <View style={$section}>
            <TextField
              label="Design Notes (Optional)"
              placeholder="Any specific design preferences, modifications, or special requests..."
              value={designNotes}
              onChangeText={setDesignNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Cultural Specifications */}
        {selectedGarmentType &&
          ["agbada", "isi_agu", "babban_riga"].includes(selectedGarmentType) && (
            <View style={$section}>
              <TextField
                label="Cultural Specifications (Optional)"
                placeholder="Any traditional elements, regional variations, or cultural details to include..."
                value={culturalSpecifications}
                onChangeText={setCulturalSpecifications}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

        {/* Style Summary */}
        {selectedStyle && selectedVariationData && (
          <View style={$summarySection}>
            <Text style={$summaryTitle}>Style Summary</Text>
            <View style={$summaryCard}>
              <Text style={$summaryLabel}>{selectedStyle.name}</Text>
              <Text style={$summaryValue}>{selectedVariationData.name}</Text>
              <Text style={$summaryDescription}>{selectedVariationData.description}</Text>

              <View style={$summaryPricing}>
                <View style={$priceRow}>
                  <Text style={$priceLabel}>Base Price:</Text>
                  <Text style={$priceValue}>₦{selectedStyle.basePrice.toLocaleString()}</Text>
                </View>
                {selectedVariationData.priceAdjustment > 0 && (
                  <View style={$priceRow}>
                    <Text style={$priceLabel}>Style Premium:</Text>
                    <Text style={$priceValue}>
                      ₦{selectedVariationData.priceAdjustment.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={[$priceRow, $totalRow]}>
                  <Text style={$totalLabel}>Style Total:</Text>
                  <Text style={$totalValue}>
                    ₦
                    {(
                      selectedStyle.basePrice + selectedVariationData.priceAdjustment
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <Button
          text="Confirm Style Selection"
          style={$saveButton}
          textStyle={$saveButtonText}
          onPress={handleSave}
          disabled={!selectedGarmentType || !selectedVariation}
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
  marginBottom: spacing.md,
}

const $styleCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginBottom: spacing.md,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedStyleCard: ViewStyle = {
  borderColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "10",
}

const $styleHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $styleName: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  flex: 1,
}

const $complexityBadge: ViewStyle = {
  backgroundColor: colors.palette.threadBlue + "20",
  borderRadius: 4,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
}

const $complexityText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
  color: colors.palette.threadBlue,
  textTransform: "uppercase",
}

const $styleDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
  marginBottom: spacing.sm,
  lineHeight: 18,
}

const $culturalInfo: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.tailorGold + "15",
  borderRadius: 8,
  padding: spacing.sm,
  marginBottom: spacing.sm,
}

const $culturalText: TextStyle = {
  fontSize: 12,
  color: colors.palette.tailorGold,
  fontStyle: "italic",
  marginLeft: spacing.xs,
  flex: 1,
}

const $styleDetails: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const $styleDetail: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $detailLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginRight: spacing.xs,
}

const $detailValue: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $variationCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedVariationCard: ViewStyle = {
  borderColor: colors.palette.sageGreen,
  backgroundColor: colors.palette.sageGreen + "10",
}

const $variationHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $variationName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $priceAdjustment: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.tailorGold,
}

const $variationDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginBottom: spacing.sm,
}

const $featuresList: ViewStyle = {
  gap: spacing.xs,
}

const $featureItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $featureText: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral600,
  marginLeft: spacing.xs,
}

const $fitOptions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $fitButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedFitButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderColor: colors.palette.sageGreen,
}

const $fitButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $selectedFitButtonText: TextStyle = {
  color: colors.palette.warmIvory,
}

const $summarySection: ViewStyle = {
  marginTop: spacing.lg,
}

const $summaryTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $summaryCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $summaryLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $summaryValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.tailorGold,
  marginBottom: spacing.xs,
}

const $summaryDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginBottom: spacing.md,
}

const $summaryPricing: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
  paddingTop: spacing.sm,
}

const $priceRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $totalRow: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
  paddingTop: spacing.xs,
  marginTop: spacing.xs,
}

const $priceLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $priceValue: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $totalLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $totalValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.tailorGold,
}

const $errorText: TextStyle = {
  fontSize: 12,
  color: colors.palette.alertRed,
  marginBottom: spacing.sm,
}

const $saveButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.lg,
}

const $saveButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}

const $spacer: ViewStyle = {
  height: spacing.xl,
}
