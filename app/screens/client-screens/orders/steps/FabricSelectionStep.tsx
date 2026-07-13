/**
 * Fabric Selection Step
 * Third step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, TouchableOpacity, FlatList, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button, Icon, AutoImage } from "@/components"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import { FabricType, NigerianCity } from "@/types/orders"

interface FabricOption {
  id: string
  type: FabricType
  name: string
  description: string
  color: string
  pattern?: string
  unitPrice: number
  inStock: boolean
  supplier?: string
  image?: string
  culturalSignificance?: string
}

export const FabricSelectionStep: FC = observer(() => {
  const { orderStore } = useStores()

  const [selectedFabricId, setSelectedFabricId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("3")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<FabricType | "all">("all")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock fabric data - would come from API in real implementation
  const fabricOptions: FabricOption[] = [
    {
      id: "aso-oke-1",
      type: "aso_oke",
      name: "Premium Aso Oke",
      description: "Traditional Yoruba handwoven fabric with intricate patterns",
      color: "Royal Blue",
      unitPrice: 15000,
      inStock: true,
      culturalSignificance: "Sacred Yoruba ceremonial fabric",
    },
    {
      id: "adire-1",
      type: "adire",
      name: "Indigo Adire",
      description: "Traditional tie-dye fabric from Southwestern Nigeria",
      color: "Deep Indigo",
      unitPrice: 8000,
      inStock: true,
      culturalSignificance: "Ancient resist-dye technique",
    },
    {
      id: "ankara-1",
      type: "ankara",
      name: "Premium Ankara Wax",
      description: "High-quality wax print cotton",
      color: "Multicolor",
      pattern: "Geometric African Print",
      unitPrice: 5000,
      inStock: true,
    },
    {
      id: "lace-1",
      type: "lace",
      name: "French Lace",
      description: "Delicate imported lace for special occasions",
      color: "Ivory",
      unitPrice: 25000,
      inStock: true,
    },
    {
      id: "george-1",
      type: "george",
      name: "George Wrapper",
      description: "Luxury silk George fabric for formal events",
      color: "Gold",
      unitPrice: 45000,
      inStock: true,
    },
    {
      id: "cotton-1",
      type: "cotton",
      name: "Premium Cotton",
      description: "High-thread-count cotton for comfort",
      color: "White",
      unitPrice: 3500,
      inStock: true,
    },
    {
      id: "silk-1",
      type: "silk",
      name: "Pure Silk",
      description: "Luxurious mulberry silk",
      color: "Champagne",
      unitPrice: 18000,
      inStock: true,
    },
    {
      id: "brocade-1",
      type: "brocade",
      name: "Metallic Brocade",
      description: "Rich brocade with gold thread detailing",
      color: "Deep Purple",
      unitPrice: 22000,
      inStock: false,
    },
  ]

  const categories = [
    { value: "all" as const, label: "All Fabrics" },
    {
      value: "aso_oke" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "aso_oke") || "Aso Oke",
    },
    {
      value: "adire" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "adire") || "Adire",
    },
    {
      value: "ankara" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "ankara") || "Ankara",
    },
    {
      value: "lace" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "lace") || "Lace",
    },
    {
      value: "cotton" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "cotton") || "Cotton",
    },
    {
      value: "silk" as FabricType,
      label: orderStore.getTranslation("fabricTypes", "silk") || "Silk",
    },
  ]

  useEffect(() => {
    // Load existing selection if available
    if (orderStore.orderCreationData?.fabricSelection) {
      const existing = orderStore.orderCreationData.fabricSelection
      // Find matching fabric
      const fabric = fabricOptions.find(
        (f) => f.type === existing.type && f.color === existing.color,
      )
      if (fabric) {
        setSelectedFabricId(fabric.id)
        setQuantity(existing.quantity.toString())
      }
    }
  }, [])

  const filteredFabrics = fabricOptions.filter((fabric) => {
    const matchesCategory = selectedCategory === "all" || fabric.type === selectedCategory
    const matchesSearch =
      fabric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fabric.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fabric.color.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const selectedFabric = fabricOptions.find((f) => f.id === selectedFabricId)
  const totalPrice = selectedFabric ? selectedFabric.unitPrice * Number(quantity) : 0

  const validateSelection = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedFabricId) {
      newErrors.fabric = "Please select a fabric"
    }

    if (!quantity.trim()) {
      newErrors.quantity = orderStore.getTranslation("errors", "required_field")
    } else if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity"
    } else if (Number(quantity) > 10) {
      newErrors.quantity = "Maximum 10 meters allowed"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateSelection() && selectedFabric) {
      const fabricSelection = {
        type: selectedFabric.type,
        color: selectedFabric.color,
        pattern: selectedFabric.pattern,
        quantity: Number(quantity),
        unitPrice: selectedFabric.unitPrice,
        totalPrice,
        supplier: selectedFabric.supplier,
        inStock: selectedFabric.inStock,
        location: (orderStore.orderCreationData?.customerInfo?.city || "lagos") as NigerianCity,
      }

      orderStore.setOrderFabricSelection(fabricSelection)
      Alert.alert(
        "Fabric Selected",
        `${selectedFabric.name} (${quantity}m) has been added to your order.`,
      )
    }
  }

  const renderFabricCard = ({ item }: { item: FabricOption }) => (
    <TouchableOpacity
      className={`flex-1 bg-neutral100 rounded-[12px] p-md mb-md border-2 ${
        selectedFabricId === item.id ? "border-tailorGold" : "border-neutral200"
      } ${!item.inStock ? "opacity-60" : ""}`}
      style={selectedFabricId === item.id ? $selectedCardBg : undefined}
      onPress={() => {
        if (item.inStock) {
          setSelectedFabricId(item.id)
          setErrors((prev) => ({ ...prev, fabric: "" }))
        }
      }}
      disabled={!item.inStock}
    >
      {/* Fabric Image Placeholder */}
      <View className="relative mb-sm">
        {item.image ? (
          <AutoImage source={{ uri: item.image }} style={{ width: "100%", height: 80, borderRadius: 8 }} />
        ) : (
          <View
            className="w-full h-[80px] rounded-[8px] justify-center items-center"
            style={{ backgroundColor: getFabricColor(item.type) }}
          >
            <Text className="text-[10px] font-semibold" style={$textWarmIvory}>
              {item.type.toUpperCase()}
            </Text>
          </View>
        )}
        {!item.inStock && (
          <View className="absolute top-xs right-xs bg-alertRed rounded-[4px] px-xs py-xxxs">
            <Text className="text-[9px] font-semibold uppercase" style={$textWarmIvory}>
              Out of Stock
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-[14px] font-semibold mb-xxs" style={$textDeepCharcoal}>
          {item.name}
        </Text>
        <Text className="text-[11px] leading-4 mb-sm" style={$textThreadBlue} numberOfLines={2}>
          {item.description}
        </Text>

        <View className="mb-sm">
          <Text className="text-[12px] font-medium" style={$textNeutral600}>
            {item.color}
          </Text>
          {item.pattern && (
            <Text className="text-[11px] italic" style={$textNeutral500}>
              {item.pattern}
            </Text>
          )}
        </View>

        {item.culturalSignificance && (
          <View
            className="flex-row items-center rounded-[4px] px-xs py-xxxs mb-sm self-start"
            style={$culturalBadgeBg}
          >
            <Icon icon="check" size={12} color={colors.palette.tailorGold} />
            <Text className="text-[9px] font-semibold uppercase ml-xxs" style={$textTailorGold}>
              Traditional
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center">
          <Text className="text-[13px] font-bold" style={$textTailorGold}>
            ₦{item.unitPrice.toLocaleString()}/m
          </Text>
          <View
            className={`w-[20px] h-[20px] rounded-[10px] border-2 justify-center items-center ${
              selectedFabricId === item.id ? "border-tailorGold" : "border-neutral300"
            }`}
          >
            {selectedFabricId === item.id && (
              <View className="w-[10px] h-[10px] rounded-[5px] bg-tailorGold" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const getFabricColor = (type: FabricType): string => {
    const colors = {
      aso_oke: "#8B4513",
      adire: "#4B0082",
      ankara: "#FF6B35",
      lace: "#F8F8FF",
      cotton: "#FFFDD0",
      silk: "#FFD700",
      linen: "#FAF0E6",
      brocade: "#800080",
      george: "#FFD700",
      custom: "#808080",
    }
    return colors[type] || "#808080"
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="text-[24px] font-bold mb-xs" style={$textDeepCharcoal}>
          {orderStore.getTranslation("fabricSelection", "en")}
        </Text>
        <Text className="text-[14px] leading-5 mb-lg" style={$textThreadBlue}>
          Choose the perfect fabric for your garment
        </Text>

        {/* Search and Filter */}
        <View className="mb-md">
          <TextField
            placeholder="Search fabrics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            LeftAccessory={() => <Icon icon="view" size={20} color={colors.palette.threadBlue} />}
          />
        </View>

        {/* Category Filter */}
        <View className="mb-lg">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-sm">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  text={category.label}
                  style={[
                    $categoryButton,
                    selectedCategory === category.value && $selectedCategoryButton,
                  ]}
                  textStyle={[
                    $categoryButtonText,
                    selectedCategory === category.value && $selectedCategoryButtonText,
                  ]}
                  onPress={() => setSelectedCategory(category.value)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Fabric Grid */}
        {errors.fabric && (
          <Text className="text-[12px] mb-sm" style={$textAlertRed}>
            {errors.fabric}
          </Text>
        )}

        <FlatList
          data={filteredFabrics}
          renderItem={renderFabricCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={$fabricRow}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />

        {/* Quantity Selection */}
        {selectedFabricId && (
          <View className="mt-lg">
            <Text className="text-[16px] font-semibold mb-md" style={$textDeepCharcoal}>
              Quantity (meters)
            </Text>
            <View className="flex-row items-center gap-md">
              <Button
                text="-"
                style={$quantityButton}
                textStyle={$quantityButtonText}
                onPress={() => {
                  const newQty = Math.max(1, Number(quantity) - 0.5)
                  setQuantity(newQty.toString())
                }}
              />
              <TextField
                value={quantity}
                onChangeText={(text) => {
                  setQuantity(text)
                  if (errors.quantity) {
                    setErrors((prev) => ({ ...prev, quantity: "" }))
                  }
                }}
                keyboardType="numeric"
                style={$quantityInput}
                status={errors.quantity ? "error" : undefined}
                helper={errors.quantity}
              />
              <Button
                text="+"
                style={$quantityButton}
                textStyle={$quantityButtonText}
                onPress={() => {
                  const newQty = Math.min(10, Number(quantity) + 0.5)
                  setQuantity(newQty.toString())
                }}
              />
            </View>
          </View>
        )}

        {/* Price Summary */}
        {selectedFabric && (
          <View className="bg-neutral100 rounded-[12px] p-lg mt-lg border border-neutral200">
            <View className="flex-row justify-between items-center mb-sm">
              <Text className="text-[14px]" style={$textThreadBlue}>
                {selectedFabric.name}
              </Text>
              <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                ₦{selectedFabric.unitPrice.toLocaleString()}/m
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-sm">
              <Text className="text-[14px]" style={$textThreadBlue}>
                Quantity
              </Text>
              <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                {quantity} meters
              </Text>
            </View>
            <View className="flex-row justify-between items-center border-t border-neutral300 pt-sm">
              <Text className="text-[16px] font-semibold" style={$textDeepCharcoal}>
                Total
              </Text>
              <Text className="text-[18px] font-bold" style={$textTailorGold}>
                ₦{totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Save Button */}
        <Button
          text="Select This Fabric"
          style={$saveButton}
          textStyle={$saveButtonText}
          onPress={handleSave}
          disabled={!selectedFabricId}
        />

        <View className="h-xl" />
      </View>
    </ScrollView>
  )
})

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors and
// opacity-tinted backgrounds stay inline; layout/spacing/solid container colors
// are className token utilities. No `dark:` variants.

// Text color overrides (static, light-only).
const $textDeepCharcoal: TextStyle = { color: colors.palette.deepCharcoal }
const $textThreadBlue: TextStyle = { color: colors.palette.threadBlue }
const $textNeutral600: TextStyle = { color: colors.palette.neutral600 }
const $textNeutral500: TextStyle = { color: colors.palette.neutral500 }
const $textTailorGold: TextStyle = { color: colors.palette.tailorGold }
const $textWarmIvory: TextStyle = { color: colors.palette.warmIvory }
const $textAlertRed: TextStyle = { color: colors.palette.alertRed }

// Opacity-tinted backgrounds (kept inline — no matching token utility).
const $selectedCardBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "10" }
const $culturalBadgeBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "20" }

// FlatList columnWrapperStyle takes a plain style object.
const $fabricRow: ViewStyle = {
  justifyContent: "space-between",
  gap: spacing.md,
}

// Button style overrides stay inline (Button owns its className).
const $categoryButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedCategoryButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderColor: colors.palette.tailorGold,
}

const $categoryButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $selectedCategoryButtonText: TextStyle = {
  color: colors.palette.warmIvory,
}

const $quantityButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $quantityButtonText: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $quantityInput: TextStyle = {
  flex: 1,
  textAlign: "center",
}

const $saveButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.xl,
}

const $saveButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}
