import React, { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, FlatList, TouchableOpacity } from "react-native"
import { Text, Button, Card, Icon } from "../../../components"
import { useStores } from "../../../models"
import { colors, spacing, typography } from "../../../theme"

const CONTAINER: ViewStyle = {
  flex: 1,
}

const SECTION_TITLE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: colors.text,
  marginBottom: spacing.small,
}

const MEASUREMENT_CARD: ViewStyle = {
  padding: spacing.medium,
  marginBottom: spacing.small,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.separator,
}

const MEASUREMENT_CARD_SELECTED: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
}

const MEASUREMENT_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.tiny,
}

const MEASUREMENT_TITLE: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
}

const MEASUREMENT_DATE: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: colors.textDim,
}

const MEASUREMENT_DETAILS: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: spacing.tiny,
}

const MEASUREMENT_ITEM: ViewStyle = {
  marginRight: spacing.medium,
  marginBottom: spacing.tiny,
}

const MEASUREMENT_LABEL: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  color: colors.textDim,
}

const MEASUREMENT_VALUE: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 13,
  color: colors.text,
}

const NEW_MEASUREMENT_BUTTON: ViewStyle = {
  marginTop: spacing.medium,
}

const EMPTY_STATE: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.massive,
}

const EMPTY_TEXT: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.medium,
}

interface MeasurementProfile {
  id: string
  name: string
  createdAt: string
  measurements: {
    chest?: number
    waist?: number
    hips?: number
    shoulderWidth?: number
    sleeveLength?: number
    inseam?: number
    neckSize?: number
    armhole?: number
  }
}

export const MeasurementStep: FC = observer(function MeasurementStep() {
  const { orderStore, authStore } = useStores()
  const [measurements, setMeasurements] = useState<MeasurementProfile[]>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(
    orderStore.orderCreationData?.measurementId || null,
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMeasurements()
  }, [])

  const loadMeasurements = async () => {
    if (!authStore.user?.id) return

    setLoading(true)
    try {
      const userMeasurements = await orderStore.loadUserMeasurements(authStore.user.id)
      setMeasurements(userMeasurements)
    } catch (error) {
      console.error("Failed to load measurements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMeasurement = (measurementId: string) => {
    setSelectedMeasurementId(measurementId)
    orderStore.setOrderMeasurement(measurementId)
  }

  const handleCreateNewMeasurement = () => {
    // Navigate to measurement creation screen
    // For now, we'll just show a placeholder
    console.log("Navigate to measurement creation")
  }

  const renderMeasurementCard = ({ item }: { item: MeasurementProfile }) => {
    const isSelected = selectedMeasurementId === item.id

    return (
      <TouchableOpacity onPress={() => handleSelectMeasurement(item.id)}>
        <View style={[MEASUREMENT_CARD, isSelected && MEASUREMENT_CARD_SELECTED]}>
          <View style={MEASUREMENT_HEADER}>
            <Text style={MEASUREMENT_TITLE}>{item.name}</Text>
            <Icon
              icon={isSelected ? "checkCircle" : "circle"}
              color={isSelected ? colors.palette.primary500 : colors.palette.neutral400}
              size={20}
            />
          </View>
          <Text style={MEASUREMENT_DATE}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>

          <View style={MEASUREMENT_DETAILS}>
            {Object.entries(item.measurements).map(([key, value]) => (
              <View key={key} style={MEASUREMENT_ITEM}>
                <Text style={MEASUREMENT_LABEL}>{key}</Text>
                <Text style={MEASUREMENT_VALUE}>{value} cm</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (measurements.length === 0 && !loading) {
    return (
      <View style={CONTAINER}>
        <View style={EMPTY_STATE}>
          <Icon icon="ruler" size={48} color={colors.palette.neutral400} />
          <Text style={EMPTY_TEXT}>
            No measurements found.{"\n"}
            Create a new measurement profile to continue.
          </Text>
          <Button
            text="Create New Measurement"
            preset="primary"
            onPress={handleCreateNewMeasurement}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={CONTAINER}>
      <Text style={SECTION_TITLE}>Select Measurement Profile</Text>

      <FlatList
        data={measurements}
        keyExtractor={(item) => item.id}
        renderItem={renderMeasurementCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.medium }}
      />

      <Button
        style={NEW_MEASUREMENT_BUTTON}
        text="Create New Measurement"
        preset="default"
        onPress={handleCreateNewMeasurement}
      />
    </View>
  )
})
