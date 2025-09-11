import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, ScrollView, TouchableOpacity } from "react-native"
import { Text, TextField, Icon } from "../../../components"
import { useStores } from "../../../models"
import { colors, spacing, typography } from "../../../theme"
import { Picker } from "@react-native-picker/picker"

const CONTAINER: ViewStyle = {
  flex: 1,
}

const FORM_GROUP: ViewStyle = {
  marginBottom: spacing.medium,
}

const LABEL: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
  marginBottom: spacing.tiny,
}

const PICKER_CONTAINER: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.separator,
  marginBottom: spacing.small,
}

const COLOR_GRID: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: spacing.tiny,
}

const COLOR_OPTION: ViewStyle = {
  width: 60,
  height: 60,
  borderRadius: 8,
  margin: spacing.tiny,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: colors.separator,
}

const COLOR_SELECTED: ViewStyle = {
  borderColor: colors.palette.primary500,
  borderWidth: 3,
}

const COLOR_LABEL: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 10,
  color: colors.text,
  marginTop: spacing.tiny,
}

const PRICE_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.small,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  marginTop: spacing.medium,
}

const PRICE_LABEL: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
}

const PRICE_VALUE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: colors.palette.primary500,
}

const fabricColors = [
  { name: "White", value: "white", color: "#FFFFFF" },
  { name: "Black", value: "black", color: "#000000" },
  { name: "Navy", value: "navy", color: "#000080" },
  { name: "Brown", value: "brown", color: "#8B4513" },
  { name: "Grey", value: "grey", color: "#808080" },
  { name: "Burgundy", value: "burgundy", color: "#800020" },
  { name: "Gold", value: "gold", color: "#FFD700" },
  { name: "Green", value: "green", color: "#008000" },
  { name: "Blue", value: "blue", color: "#0000FF" },
  { name: "Red", value: "red", color: "#FF0000" },
]

export const FabricSelectionStep: FC = observer(function FabricSelectionStep() {
  const { orderStore } = useStores()

  const [fabricType, setFabricType] = useState(
    orderStore.orderCreationData?.fabricSelection?.type || "cotton",
  )
  const [fabricColor, setFabricColor] = useState(
    orderStore.orderCreationData?.fabricSelection?.color || "white",
  )
  const [quantity, setQuantity] = useState(
    orderStore.orderCreationData?.fabricSelection?.quantity?.toString() || "3",
  )
  const [unitPrice, setUnitPrice] = useState(
    orderStore.orderCreationData?.fabricSelection?.unitPrice?.toString() || "5000",
  )

  const calculateTotalPrice = () => {
    const qty = parseFloat(quantity) || 0
    const price = parseFloat(unitPrice) || 0
    return qty * price
  }

  const handleSave = () => {
    orderStore.setOrderFabricSelection({
      type: fabricType,
      color: fabricColor,
      pattern: null,
      quantity: parseFloat(quantity) || 3,
      unitPrice: parseFloat(unitPrice) || 5000,
      totalPrice: calculateTotalPrice(),
      supplier: null,
      inStock: true,
    })
  }

  // Auto-save on change
  React.useEffect(() => {
    handleSave()
  }, [fabricType, fabricColor, quantity, unitPrice])

  return (
    <ScrollView style={CONTAINER} showsVerticalScrollIndicator={false}>
      <View style={FORM_GROUP}>
        <Text style={LABEL}>Fabric Type</Text>
        <View style={PICKER_CONTAINER}>
          <Picker selectedValue={fabricType} onValueChange={setFabricType}>
            <Picker.Item label="Aso Oke" value="aso_oke" />
            <Picker.Item label="Adire" value="adire" />
            <Picker.Item label="Ankara" value="ankara" />
            <Picker.Item label="Lace" value="lace" />
            <Picker.Item label="Cotton" value="cotton" />
            <Picker.Item label="Silk" value="silk" />
            <Picker.Item label="Linen" value="linen" />
            <Picker.Item label="Brocade" value="brocade" />
            <Picker.Item label="George" value="george" />
            <Picker.Item label="Custom" value="custom" />
          </Picker>
        </View>
      </View>

      <View style={FORM_GROUP}>
        <Text style={LABEL}>Fabric Color</Text>
        <View style={COLOR_GRID}>
          {fabricColors.map((colorOption) => (
            <TouchableOpacity
              key={colorOption.value}
              onPress={() => setFabricColor(colorOption.value)}
            >
              <View
                style={[
                  COLOR_OPTION,
                  { backgroundColor: colorOption.color },
                  fabricColor === colorOption.value && COLOR_SELECTED,
                ]}
              >
                {fabricColor === colorOption.value && (
                  <Icon
                    icon="check"
                    size={24}
                    color={colorOption.value === "white" ? colors.text : colors.palette.neutral100}
                  />
                )}
              </View>
              <Text style={COLOR_LABEL}>{colorOption.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Quantity (meters)"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="3"
        />
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Price per Meter (₦)"
          value={unitPrice}
          onChangeText={setUnitPrice}
          keyboardType="number-pad"
          placeholder="5000"
        />
      </View>

      <View style={PRICE_ROW}>
        <Text style={PRICE_LABEL}>Total Fabric Cost</Text>
        <Text style={PRICE_VALUE}>₦{calculateTotalPrice().toLocaleString()}</Text>
      </View>
    </ScrollView>
  )
})
