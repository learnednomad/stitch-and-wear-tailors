import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageStyle,
} from "react-native"
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

const GARMENT_GRID: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: spacing.small,
}

const GARMENT_CARD: ViewStyle = {
  width: "47%",
  marginRight: "3%",
  marginBottom: spacing.medium,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.small,
  borderWidth: 2,
  borderColor: colors.separator,
  alignItems: "center",
}

const GARMENT_CARD_SELECTED: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
}

const GARMENT_IMAGE: ImageStyle = {
  width: 80,
  height: 80,
  borderRadius: 8,
  marginBottom: spacing.tiny,
}

const GARMENT_NAME: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 14,
  color: colors.text,
  textAlign: "center",
}

const GARMENT_DESCRIPTION: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.tiny,
}

const PICKER_CONTAINER: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.separator,
  marginBottom: spacing.small,
}

const EMBELLISHMENT_OPTIONS: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: spacing.tiny,
}

const OPTION_CHIP: ViewStyle = {
  paddingHorizontal: spacing.medium,
  paddingVertical: spacing.tiny,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  marginRight: spacing.tiny,
  marginBottom: spacing.tiny,
}

const OPTION_CHIP_SELECTED: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const OPTION_TEXT: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 12,
  color: colors.text,
}

const OPTION_TEXT_SELECTED: TextStyle = {
  color: colors.palette.neutral100,
}

// Nigerian garment types with descriptions
const NIGERIAN_GARMENTS = [
  {
    id: "agbada",
    name: "Agbada",
    description: "Traditional flowing robe",
    icon: "👔",
    basePrice: 25000,
    estimatedDays: 7,
    fabricRequirement: 5.5,
  },
  {
    id: "kaftan",
    name: "Kaftan",
    description: "Long dress-like garment",
    icon: "👘",
    basePrice: 18000,
    estimatedDays: 5,
    fabricRequirement: 4,
  },
  {
    id: "senator",
    name: "Senator",
    description: "Modern traditional style",
    icon: "🎽",
    basePrice: 15000,
    estimatedDays: 4,
    fabricRequirement: 3.5,
  },
  {
    id: "dashiki",
    name: "Dashiki",
    description: "Colorful African shirt",
    icon: "👕",
    basePrice: 12000,
    estimatedDays: 3,
    fabricRequirement: 2.5,
  },
  {
    id: "isi_agu",
    name: "Isi Agu",
    description: "Lion head traditional",
    icon: "🦁",
    basePrice: 20000,
    estimatedDays: 6,
    fabricRequirement: 4,
  },
  {
    id: "babban_riga",
    name: "Babban Riga",
    description: "Northern formal robe",
    icon: "🥻",
    basePrice: 22000,
    estimatedDays: 6,
    fabricRequirement: 5,
  },
  {
    id: "ankara_dress",
    name: "Ankara Dress",
    description: "Women's African print",
    icon: "👗",
    basePrice: 16000,
    estimatedDays: 4,
    fabricRequirement: 3.5,
  },
  {
    id: "buba",
    name: "Buba & Sokoto",
    description: "Traditional top & trouser",
    icon: "👔",
    basePrice: 14000,
    estimatedDays: 4,
    fabricRequirement: 3,
  },
]

// Embellishment options for different garments
const EMBELLISHMENTS = {
  agbada: {
    embroideryStyles: ["Simple", "Elaborate", "Royal", "Custom"],
    neckStyles: ["Round", "V-Neck", "Square"],
    matching: ["Cap", "Shoe", "Walking Stick"],
  },
  kaftan: {
    embroideryStyles: ["Minimal", "Moderate", "Elaborate"],
    neckStyles: ["Round", "V-Neck", "Embroidered"],
    length: ["Short", "Medium", "Long", "Floor Length"],
  },
  senator: {
    styles: ["Plain", "Designed", "Stone Work"],
    matching: ["Cap", "Shoe"],
    pockets: ["Side Pockets", "Chest Pocket", "Both"],
  },
  dashiki: {
    embroideryStyles: ["Simple", "Traditional", "Modern"],
    sleeves: ["Short", "Long", "Three-Quarter"],
    neckStyles: ["Round", "V-Neck"],
  },
  isi_agu: {
    lionDesign: ["Traditional", "Modern", "Abstract"],
    embroideryStyles: ["Simple", "Elaborate"],
    buttons: ["Wooden", "Metal", "Fabric"],
  },
  babban_riga: {
    embroideryStyles: ["Traditional", "Modern", "Royal"],
    length: ["Standard", "Long", "Extra Long"],
    chest: ["Plain", "Embroidered", "Decorated"],
  },
  ankara_dress: {
    styles: ["Straight", "Flared", "Mermaid", "A-Line"],
    length: ["Short", "Knee", "Long", "Maxi"],
    sleeves: ["Sleeveless", "Short", "Long", "Off-Shoulder"],
  },
  buba: {
    styles: ["Traditional", "Modern", "Fitted"],
    trouser: ["Straight", "Tapered", "Wide"],
    length: ["Regular", "Long"],
  },
}

export const StyleConfigStep: FC = observer(function StyleConfigStep() {
  const { orderStore } = useStores()

  const [selectedGarment, setSelectedGarment] = useState(
    orderStore.orderCreationData?.styleConfig?.garmentType || "agbada",
  )

  const [embroideryStyle, setEmbroideryStyle] = useState(
    orderStore.orderCreationData?.styleConfig?.embroideryStyle || "Simple",
  )

  const [neckStyle, setNeckStyle] = useState(
    orderStore.orderCreationData?.styleConfig?.neckStyle || "Round",
  )

  const [selectedMatching, setSelectedMatching] = useState<string[]>(
    orderStore.orderCreationData?.styleConfig?.matching || [],
  )

  const [priority, setPriority] = useState(
    orderStore.orderCreationData?.styleConfig?.priority || "normal",
  )

  const [specialInstructions, setSpecialInstructions] = useState(
    orderStore.orderCreationData?.styleConfig?.specialInstructions || "",
  )

  const selectedGarmentData = NIGERIAN_GARMENTS.find((g) => g.id === selectedGarment)
  const garmentEmbellishments = EMBELLISHMENTS[selectedGarment] || {}

  const toggleMatching = (item: string) => {
    setSelectedMatching((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    )
  }

  const handleSave = () => {
    orderStore.setOrderStyleConfig({
      garmentType: selectedGarment,
      embroideryStyle,
      neckStyle,
      matching: selectedMatching,
      priority,
      specialInstructions,
      estimatedDays: selectedGarmentData?.estimatedDays || 5,
      basePrice: selectedGarmentData?.basePrice || 15000,
      fabricRequirement: selectedGarmentData?.fabricRequirement || 3,
    })
  }

  // Auto-save on change
  React.useEffect(() => {
    handleSave()
  }, [selectedGarment, embroideryStyle, neckStyle, selectedMatching, priority, specialInstructions])

  return (
    <ScrollView style={CONTAINER} showsVerticalScrollIndicator={false}>
      <View style={FORM_GROUP}>
        <Text style={LABEL}>Select Garment Type</Text>
        <View style={GARMENT_GRID}>
          {NIGERIAN_GARMENTS.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              style={[GARMENT_CARD, selectedGarment === garment.id && GARMENT_CARD_SELECTED]}
              onPress={() => setSelectedGarment(garment.id)}
            >
              <Text style={{ fontSize: 48 }}>{garment.icon}</Text>
              <Text style={GARMENT_NAME}>{garment.name}</Text>
              <Text style={GARMENT_DESCRIPTION}>{garment.description}</Text>
              <Text style={GARMENT_DESCRIPTION}>₦{garment.basePrice.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {garmentEmbellishments.embroideryStyles && (
        <View style={FORM_GROUP}>
          <Text style={LABEL}>Embroidery Style</Text>
          <View style={EMBELLISHMENT_OPTIONS}>
            {garmentEmbellishments.embroideryStyles.map((style: string) => (
              <TouchableOpacity
                key={style}
                style={[OPTION_CHIP, embroideryStyle === style && OPTION_CHIP_SELECTED]}
                onPress={() => setEmbroideryStyle(style)}
              >
                <Text style={[OPTION_TEXT, embroideryStyle === style && OPTION_TEXT_SELECTED]}>
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {garmentEmbellishments.neckStyles && (
        <View style={FORM_GROUP}>
          <Text style={LABEL}>Neck Style</Text>
          <View style={EMBELLISHMENT_OPTIONS}>
            {garmentEmbellishments.neckStyles.map((style: string) => (
              <TouchableOpacity
                key={style}
                style={[OPTION_CHIP, neckStyle === style && OPTION_CHIP_SELECTED]}
                onPress={() => setNeckStyle(style)}
              >
                <Text style={[OPTION_TEXT, neckStyle === style && OPTION_TEXT_SELECTED]}>
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {garmentEmbellishments.matching && (
        <View style={FORM_GROUP}>
          <Text style={LABEL}>Matching Accessories</Text>
          <View style={EMBELLISHMENT_OPTIONS}>
            {garmentEmbellishments.matching.map((item: string) => (
              <TouchableOpacity
                key={item}
                style={[OPTION_CHIP, selectedMatching.includes(item) && OPTION_CHIP_SELECTED]}
                onPress={() => toggleMatching(item)}
              >
                <Text
                  style={[OPTION_TEXT, selectedMatching.includes(item) && OPTION_TEXT_SELECTED]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={FORM_GROUP}>
        <Text style={LABEL}>Priority</Text>
        <View style={PICKER_CONTAINER}>
          <Picker selectedValue={priority} onValueChange={setPriority}>
            <Picker.Item label="Normal (7-10 days)" value="normal" />
            <Picker.Item label="Express (4-6 days) +25%" value="express" />
            <Picker.Item label="Urgent (2-3 days) +50%" value="urgent" />
          </Picker>
        </View>
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Special Instructions"
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Any specific requirements or customizations..."
          multiline
          numberOfLines={4}
        />
      </View>

      {selectedGarmentData && (
        <View style={FORM_GROUP}>
          <View
            style={{
              backgroundColor: colors.palette.primary100,
              padding: spacing.medium,
              borderRadius: 8,
            }}
          >
            <Text style={LABEL}>Order Summary</Text>
            <Text style={GARMENT_DESCRIPTION}>Garment: {selectedGarmentData.name}</Text>
            <Text style={GARMENT_DESCRIPTION}>
              Base Price: ₦{selectedGarmentData.basePrice.toLocaleString()}
            </Text>
            <Text style={GARMENT_DESCRIPTION}>
              Fabric Required: {selectedGarmentData.fabricRequirement} meters
            </Text>
            <Text style={GARMENT_DESCRIPTION}>
              Estimated Time: {selectedGarmentData.estimatedDays} days
            </Text>
            {priority === "express" && (
              <Text style={GARMENT_DESCRIPTION}>
                Express Charge: +₦{(selectedGarmentData.basePrice * 0.25).toLocaleString()}
              </Text>
            )}
            {priority === "urgent" && (
              <Text style={GARMENT_DESCRIPTION}>
                Urgent Charge: +₦{(selectedGarmentData.basePrice * 0.5).toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  )
})
