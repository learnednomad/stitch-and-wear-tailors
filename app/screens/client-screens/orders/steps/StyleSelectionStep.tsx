/**
 * Style Selection Step
 * Fourth step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, TouchableOpacity, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button, Icon, AutoImage } from "@/components"
import { colors, spacing } from "@/theme"
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
      setSelectedGarmentType(existing.garmentType as NigerianGarmentType)
      setFitPreference(existing.fitPreference as "slim" | "regular" | "loose")
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

  const renderStyleCard = (style: StyleOption) => {
    const isSelected = selectedGarmentType === style.garmentType
    return (
      <TouchableOpacity
        key={style.garmentType}
        className={`bg-neutral100 rounded-[12px] p-lg mb-md border-2 ${
          isSelected ? "border-tailorGold" : "border-neutral200"
        }`}
        style={isSelected ? $selectedStyleCardBg : undefined}
        onPress={() => {
          setSelectedGarmentType(style.garmentType)
          setSelectedVariation("") // Reset variation when style changes
          setErrors((prev) => ({ ...prev, garmentType: "", variation: "" }))
        }}
      >
        <View className="flex-row justify-between items-center mb-sm">
          <Text className="text-[16px] font-semibold flex-1" style={$textDeep}>
            {style.name}
          </Text>
          <View className="rounded-[4px] px-xs py-xxxs" style={$complexityBadgeBg}>
            <Text className="text-[10px] font-semibold uppercase" style={$textThread}>
              {["Simple", "Easy", "Moderate", "Complex", "Expert"][style.complexity - 1]}
            </Text>
          </View>
        </View>

        <Text className="text-[13px] mb-sm leading-[18px]" style={$textThread}>
          {style.description}
        </Text>

        <View className="flex-row items-center rounded-[8px] p-sm mb-sm" style={$culturalInfoBg}>
          <Icon icon="check" size={16} color={colors.palette.tailorGold} />
          <Text className="text-[12px] italic ml-xs flex-1" style={$textGold}>
            {style.culturalSignificance}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            <Text className="text-[12px] mr-xs" style={$textNeutral600}>
              Base Price:
            </Text>
            <Text className="text-[12px] font-semibold" style={$textDeep}>
              ₦{style.basePrice.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-[12px] mr-xs" style={$textNeutral600}>
              Duration:
            </Text>
            <Text className="text-[12px] font-semibold" style={$textDeep}>
              {style.estimatedDays} days
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderVariationCard = (variation: StyleVariation) => {
    const isSelected = selectedVariation === variation.id
    return (
      <TouchableOpacity
        key={variation.id}
        className={`bg-neutral100 rounded-[8px] p-md mb-sm border ${
          isSelected ? "border-sageGreen" : "border-neutral300"
        }`}
        style={isSelected ? $selectedVariationCardBg : undefined}
        onPress={() => {
          setSelectedVariation(variation.id)
          setErrors((prev) => ({ ...prev, variation: "" }))
        }}
      >
        <View className="flex-row justify-between items-center mb-xs">
          <Text className="text-[14px] font-semibold" style={$textDeep}>
            {variation.name}
          </Text>
          {variation.priceAdjustment > 0 && (
            <Text className="text-[12px] font-semibold" style={$textGold}>
              +₦{variation.priceAdjustment.toLocaleString()}
            </Text>
          )}
        </View>

        <Text className="text-[12px] mb-sm" style={$textThread}>
          {variation.description}
        </Text>

        <View className="gap-xs">
          {variation.features.map((feature, index) => (
            <View key={index} className="flex-row items-center">
              <Icon icon="check" size={12} color={colors.palette.sageGreen} />
              <Text className="text-[11px] ml-xs" style={$textNeutral600}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="text-[24px] font-bold mb-xs" style={$textDeep}>
          {orderStore.getTranslation("styleSelection", "en")}
        </Text>
        <Text className="text-[14px] mb-lg leading-[20px]" style={$textThread}>
          Choose the perfect style that reflects your personality and cultural heritage
        </Text>

        {/* Garment Type Selection */}
        <View className="mb-xl">
          <Text className="text-[18px] font-semibold mb-md" style={$textDeep}>
            Select Garment Type
          </Text>
          {errors.garmentType && (
            <Text className="text-[12px] mb-sm" style={$textAlert}>
              {errors.garmentType}
            </Text>
          )}
          {styleOptions.map(renderStyleCard)}
        </View>

        {/* Style Variations */}
        {selectedStyle && (
          <View className="mb-xl">
            <Text className="text-[18px] font-semibold mb-md" style={$textDeep}>
              Choose Style Variation
            </Text>
            {errors.variation && (
              <Text className="text-[12px] mb-sm" style={$textAlert}>
                {errors.variation}
              </Text>
            )}
            {selectedStyle.variations.map(renderVariationCard)}
          </View>
        )}

        {/* Fit Preference */}
        {selectedGarmentType && (
          <View className="mb-xl">
            <Text className="text-[18px] font-semibold mb-md" style={$textDeep}>
              Fit Preference
            </Text>
            <View className="flex-row gap-sm">
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
          <View className="mb-xl">
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
            <View className="mb-xl">
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
          <View className="mt-lg">
            <Text className="text-[16px] font-semibold mb-md" style={$textDeep}>
              Style Summary
            </Text>
            <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
              <Text className="text-[14px] font-semibold" style={$textDeep}>
                {selectedStyle.name}
              </Text>
              <Text className="text-[16px] font-bold mb-xs" style={$textGold}>
                {selectedVariationData.name}
              </Text>
              <Text className="text-[12px] mb-md" style={$textThread}>
                {selectedVariationData.description}
              </Text>

              <View className="border-t border-neutral300 pt-sm">
                <View className="flex-row justify-between items-center mb-xs">
                  <Text className="text-[12px]" style={$textThread}>
                    Base Price:
                  </Text>
                  <Text className="text-[12px] font-medium" style={$textDeep}>
                    ₦{selectedStyle.basePrice.toLocaleString()}
                  </Text>
                </View>
                {selectedVariationData.priceAdjustment > 0 && (
                  <View className="flex-row justify-between items-center mb-xs">
                    <Text className="text-[12px]" style={$textThread}>
                      Style Premium:
                    </Text>
                    <Text className="text-[12px] font-medium" style={$textDeep}>
                      ₦{selectedVariationData.priceAdjustment.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center mb-xs border-t border-neutral300 pt-xs mt-xs">
                  <Text className="text-[14px] font-semibold" style={$textDeep}>
                    Style Total:
                  </Text>
                  <Text className="text-[16px] font-bold" style={$textGold}>
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

        <View className="h-xl" />
      </View>
    </ScrollView>
  )
})

// Styles
// Static (light-only) `colors` screen: layout/spacing/container colors moved to
// className token utilities; text colors and opacity tints stay inline; Button
// style/textStyle overrides remain inline style objects.
const $textDeep: TextStyle = { color: colors.palette.deepCharcoal }
const $textThread: TextStyle = { color: colors.palette.threadBlue }
const $textGold: TextStyle = { color: colors.palette.tailorGold }
const $textNeutral600: TextStyle = { color: colors.palette.neutral600 }
const $textAlert: TextStyle = { color: colors.palette.alertRed }

// Opacity tints (dynamic hex + alpha) stay inline.
const $complexityBadgeBg: ViewStyle = { backgroundColor: colors.palette.threadBlue + "20" }
const $culturalInfoBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "15" }
const $selectedStyleCardBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "10" }
const $selectedVariationCardBg: ViewStyle = { backgroundColor: colors.palette.sageGreen + "10" }

// Button overrides (Button owns its className; these stay inline).
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
