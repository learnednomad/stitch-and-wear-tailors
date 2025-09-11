/**
 * Fabric Selection Step
 * Third step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import {
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button, Icon, AutoImage } from "app/components"
import { colors, spacing } from "app/theme"
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
        location: orderStore.orderCreationData?.customerInfo?.city || ("lagos" as NigerianCity),
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
      style={[
        $fabricCard,
        selectedFabricId === item.id && $selectedFabricCard,
        !item.inStock && $outOfStockCard,
      ]}
      onPress={() => {
        if (item.inStock) {
          setSelectedFabricId(item.id)
          setErrors((prev) => ({ ...prev, fabric: "" }))
        }
      }}
      disabled={!item.inStock}
    >
      {/* Fabric Image Placeholder */}
      <View style={$fabricImageContainer}>
        {item.image ? (
          <AutoImage source={{ uri: item.image }} style={$fabricImage} />
        ) : (
          <View style={[$fabricImagePlaceholder, { backgroundColor: getFabricColor(item.type) }]}>
            <Text style={$fabricImageText}>{item.type.toUpperCase()}</Text>
          </View>
        )}
        {!item.inStock && (
          <View style={$outOfStockBadge}>
            <Text style={$outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={$fabricInfo}>
        <Text style={$fabricName}>{item.name}</Text>
        <Text style={$fabricDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={$fabricDetails}>
          <Text style={$fabricColor}>{item.color}</Text>
          {item.pattern && <Text style={$fabricPattern}>{item.pattern}</Text>}
        </View>

        {item.culturalSignificance && (
          <View style={$culturalBadge}>
            <Icon icon="star" size={12} color={colors.palette.tailorGold} />
            <Text style={$culturalText}>Traditional</Text>
          </View>
        )}

        <View style={$fabricPricing}>
          <Text style={$fabricPrice}>₦{item.unitPrice.toLocaleString()}/m</Text>
          <View style={[$radioButton, selectedFabricId === item.id && $radioButtonSelected]}>
            {selectedFabricId === item.id && <View style={$radioButtonInner} />}
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
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>{orderStore.getTranslation("fabricSelection", "en")}</Text>
        <Text style={$subtitle}>Choose the perfect fabric for your garment</Text>

        {/* Search and Filter */}
        <View style={$searchContainer}>
          <TextField
            placeholder="Search fabrics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            LeftAccessory={() => <Icon icon="search" size={20} color={colors.palette.threadBlue} />}
          />
        </View>

        {/* Category Filter */}
        <View style={$categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={$categoryList}>
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
        {errors.fabric && <Text style={$errorText}>{errors.fabric}</Text>}

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
          <View style={$quantitySection}>
            <Text style={$sectionTitle}>Quantity (meters)</Text>
            <View style={$quantityContainer}>
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
          <View style={$priceSection}>
            <View style={$priceRow}>
              <Text style={$priceLabel}>{selectedFabric.name}</Text>
              <Text style={$priceValue}>₦{selectedFabric.unitPrice.toLocaleString()}/m</Text>
            </View>
            <View style={$priceRow}>
              <Text style={$priceLabel}>Quantity</Text>
              <Text style={$priceValue}>{quantity} meters</Text>
            </View>
            <View style={[$priceRow, $totalRow]}>
              <Text style={$totalLabel}>Total</Text>
              <Text style={$totalValue}>₦{totalPrice.toLocaleString()}</Text>
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

const $searchContainer: ViewStyle = {
  marginBottom: spacing.md,
}

const $categoryContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $categoryList: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

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

const $fabricRow: ViewStyle = {
  justifyContent: "space-between",
  gap: spacing.md,
}

const $fabricCard: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedFabricCard: ViewStyle = {
  borderColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "10",
}

const $outOfStockCard: ViewStyle = {
  opacity: 0.6,
}

const $fabricImageContainer: ViewStyle = {
  position: "relative",
  marginBottom: spacing.sm,
}

const $fabricImage: ViewStyle = {
  width: "100%",
  height: 80,
  borderRadius: 8,
}

const $fabricImagePlaceholder: ViewStyle = {
  width: "100%",
  height: 80,
  borderRadius: 8,
  justifyContent: "center",
  alignItems: "center",
}

const $fabricImageText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
  color: colors.palette.warmIvory,
}

const $outOfStockBadge: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.palette.alertRed,
  borderRadius: 4,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
}

const $outOfStockText: TextStyle = {
  fontSize: 9,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textTransform: "uppercase",
}

const $fabricInfo: ViewStyle = {
  flex: 1,
}

const $fabricName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xxs,
}

const $fabricDescription: TextStyle = {
  fontSize: 11,
  color: colors.palette.threadBlue,
  marginBottom: spacing.sm,
  lineHeight: 16,
}

const $fabricDetails: ViewStyle = {
  marginBottom: spacing.sm,
}

const $fabricColor: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  fontWeight: "500",
}

const $fabricPattern: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
  fontStyle: "italic",
}

const $culturalBadge: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.tailorGold + "20",
  borderRadius: 4,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  marginBottom: spacing.sm,
  alignSelf: "flex-start",
}

const $culturalText: TextStyle = {
  fontSize: 9,
  fontWeight: "600",
  color: colors.palette.tailorGold,
  textTransform: "uppercase",
  marginLeft: spacing.xxs,
}

const $fabricPricing: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $fabricPrice: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  color: colors.palette.tailorGold,
}

const $radioButton: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: colors.palette.neutral300,
  justifyContent: "center",
  alignItems: "center",
}

const $radioButtonSelected: ViewStyle = {
  borderColor: colors.palette.tailorGold,
}

const $radioButtonInner: ViewStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: colors.palette.tailorGold,
}

const $quantitySection: ViewStyle = {
  marginTop: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $quantityContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
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

const $quantityInput: ViewStyle = {
  flex: 1,
  textAlign: "center",
}

const $priceSection: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginTop: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $priceRow: ViewStyle = {
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

const $priceLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $priceValue: TextStyle = {
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

const $errorText: TextStyle = {
  fontSize: 12,
  color: colors.palette.alertRed,
  marginBottom: spacing.sm,
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

const $spacer: ViewStyle = {
  height: spacing.xl,
}
