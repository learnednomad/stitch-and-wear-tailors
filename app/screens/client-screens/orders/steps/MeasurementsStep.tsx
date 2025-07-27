/**
 * Measurements Step
 * Second step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, Alert, TouchableOpacity } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button, Icon } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { NigerianGarmentType, MeasurementData } from "@/types/orders"

interface SavedMeasurement {
  id: string
  garmentType: NigerianGarmentType
  chest: number
  waist: number
  length: number
  shoulder?: number
  armLength?: number
  neck?: number
  createdAt: string
  isDefault: boolean
}

export const MeasurementsStep: FC = observer(() => {
  const { orderStore, authStore } = useStores()
  
  const [selectedOption, setSelectedOption] = useState<"new" | "existing" | "skip">("new")
  const [savedMeasurements, setSavedMeasurements] = useState<SavedMeasurement[]>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>("")
  const [showTutorial, setShowTutorial] = useState(false)
  
  const [newMeasurements, setNewMeasurements] = useState({
    chest: "",
    waist: "",
    length: "",
    shoulder: "",
    armLength: "",
    neck: "",
    notes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSavedMeasurements()
  }, [])

  const loadSavedMeasurements = async () => {
    try {
      if (authStore.user?.id) {
        // TODO: Replace with actual API call
        const measurements = await orderStore.loadUserMeasurements(authStore.user.id)
        setSavedMeasurements(measurements || [])
      }
    } catch (error) {
      console.warn("Failed to load measurements:", error)
    }
  }

  const validateMeasurements = () => {
    const newErrors: Record<string, string> = {}

    if (selectedOption === "new") {
      if (!newMeasurements.chest.trim()) {
        newErrors.chest = orderStore.getTranslation("errors", "required_field")
      } else if (isNaN(Number(newMeasurements.chest)) || Number(newMeasurements.chest) <= 0) {
        newErrors.chest = orderStore.getTranslation("errors", "invalid_measurement")
      }

      if (!newMeasurements.waist.trim()) {
        newErrors.waist = orderStore.getTranslation("errors", "required_field")
      } else if (isNaN(Number(newMeasurements.waist)) || Number(newMeasurements.waist) <= 0) {
        newErrors.waist = orderStore.getTranslation("errors", "invalid_measurement")
      }

      if (!newMeasurements.length.trim()) {
        newErrors.length = orderStore.getTranslation("errors", "required_field")
      } else if (isNaN(Number(newMeasurements.length)) || Number(newMeasurements.length) <= 0) {
        newErrors.length = orderStore.getTranslation("errors", "invalid_measurement")
      }
    } else if (selectedOption === "existing") {
      if (!selectedMeasurementId) {
        newErrors.selection = "Please select a saved measurement"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateMeasurements()) {
      let measurementId: string

      if (selectedOption === "new") {
        // Create new measurement record
        measurementId = `measurement_${Date.now()}`
        // TODO: Save to backend
      } else if (selectedOption === "existing") {
        measurementId = selectedMeasurementId
      } else {
        // Skip measurements
        measurementId = ""
      }

      orderStore.setOrderMeasurement(measurementId)
      Alert.alert(
        "Measurements Saved",
        selectedOption === "skip" 
          ? "Measurements will be taken during fitting appointment"
          : "Measurements have been saved successfully."
      )
    }
  }

  const handleMeasurementChange = (field: keyof typeof newMeasurements, value: string) => {
    setNewMeasurements(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const measurementFields = [
    { key: "chest", label: orderStore.getTranslation("measurementTypes", "chest"), required: true },
    { key: "waist", label: orderStore.getTranslation("measurementTypes", "waist"), required: true },
    { key: "length", label: orderStore.getTranslation("measurementTypes", "length"), required: true },
    { key: "shoulder", label: orderStore.getTranslation("measurementTypes", "shoulder"), required: false },
    { key: "armLength", label: orderStore.getTranslation("measurementTypes", "armLength"), required: false },
    { key: "neck", label: orderStore.getTranslation("measurementTypes", "neck"), required: false },
  ]

  const renderSavedMeasurement = (measurement: SavedMeasurement) => (
    <TouchableOpacity
      key={measurement.id}
      style={[
        $measurementCard,
        selectedMeasurementId === measurement.id && $selectedMeasurementCard
      ]}
      onPress={() => setSelectedMeasurementId(measurement.id)}
    >
      <View style={$measurementHeader}>
        <Text style={$measurementTitle}>
          {orderStore.getTranslation("garments", measurement.garmentType)}
        </Text>
        {measurement.isDefault && (
          <View style={$defaultBadge}>
            <Text style={$defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      
      <View style={$measurementDetails}>
        <Text style={$measurementDetail}>
          Chest: {measurement.chest}cm • Waist: {measurement.waist}cm • Length: {measurement.length}cm
        </Text>
        <Text style={$measurementDate}>
          Created: {new Date(measurement.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={$measurementRadio}>
        <View style={[
          $radioButton,
          selectedMeasurementId === measurement.id && $radioButtonSelected
        ]}>
          {selectedMeasurementId === measurement.id && <View style={$radioButtonInner} />}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>
          {orderStore.getTranslation("measurements", "en")}
        </Text>
        <Text style={$subtitle}>
          We need your measurements to create the perfect fit
        </Text>

        {/* Measurement Options */}
        <View style={$optionsContainer}>
          <TouchableOpacity
            style={[
              $optionCard,
              selectedOption === "new" && $selectedOptionCard
            ]}
            onPress={() => setSelectedOption("new")}
          >
            <View style={$optionHeader}>
              <Icon icon="plus" size={24} color={colors.palette.tailorGold} />
              <Text style={$optionTitle}>Take New Measurements</Text>
            </View>
            <Text style={$optionDescription}>
              Enter your measurements manually or get help from our guide
            </Text>
          </TouchableOpacity>

          {savedMeasurements.length > 0 && (
            <TouchableOpacity
              style={[
                $optionCard,
                selectedOption === "existing" && $selectedOptionCard
              ]}
              onPress={() => setSelectedOption("existing")}
            >
              <View style={$optionHeader}>
                <Icon icon="history" size={24} color={colors.palette.sageGreen} />
                <Text style={$optionTitle}>Use Saved Measurements</Text>
              </View>
              <Text style={$optionDescription}>
                Choose from {savedMeasurements.length} previously saved measurements
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              $optionCard,
              selectedOption === "skip" && $selectedOptionCard
            ]}
            onPress={() => setSelectedOption("skip")}
          >
            <View style={$optionHeader}>
              <Icon icon="clock" size={24} color={colors.palette.threadBlue} />
              <Text style={$optionTitle}>Measure During Fitting</Text>
            </View>
            <Text style={$optionDescription}>
              Skip for now and take measurements during your fitting appointment
            </Text>
          </TouchableOpacity>
        </View>

        {/* New Measurements Form */}
        {selectedOption === "new" && (
          <View style={$section}>
            <View style={$sectionHeader}>
              <Text style={$sectionTitle}>Enter Measurements (in cm)</Text>
              <Button
                text="Help Guide"
                style={$helpButton}
                textStyle={$helpButtonText}
                onPress={() => setShowTutorial(true)}
              />
            </View>

            <View style={$measurementGrid}>
              {measurementFields.map((field) => (
                <View key={field.key} style={$measurementField}>
                  <TextField
                    label={`${field.label}${field.required ? " *" : ""}`}
                    placeholder="0"
                    value={newMeasurements[field.key as keyof typeof newMeasurements]}
                    onChangeText={(text) => handleMeasurementChange(field.key as keyof typeof newMeasurements, text)}
                    keyboardType="numeric"
                    status={errors[field.key] ? "error" : undefined}
                    helper={errors[field.key]}
                    RightAccessory={() => (
                      <Text style={$unitText}>cm</Text>
                    )}
                  />
                </View>
              ))}
            </View>

            <TextField
              label="Notes (Optional)"
              placeholder="Any special fitting notes..."
              value={newMeasurements.notes}
              onChangeText={(text) => handleMeasurementChange("notes", text)}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* Saved Measurements List */}
        {selectedOption === "existing" && savedMeasurements.length > 0 && (
          <View style={$section}>
            <Text style={$sectionTitle}>Select Saved Measurements</Text>
            {errors.selection && (
              <Text style={$errorText}>{errors.selection}</Text>
            )}
            {savedMeasurements.map(renderSavedMeasurement)}
          </View>
        )}

        {/* Skip Confirmation */}
        {selectedOption === "skip" && (
          <View style={$section}>
            <View style={$skipInfo}>
              <Icon icon="info" size={24} color={colors.palette.threadBlue} />
              <View style={$skipTextContainer}>
                <Text style={$skipTitle}>Fitting Appointment Required</Text>
                <Text style={$skipDescription}>
                  A fitting appointment will be scheduled where our tailor will take your measurements professionally.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <Button
          text={selectedOption === "skip" ? "Schedule Fitting" : "Save Measurements"}
          style={$saveButton}
          textStyle={$saveButtonText}
          onPress={handleSave}
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

const $optionsContainer: ViewStyle = {
  gap: spacing.md,
  marginBottom: spacing.lg,
}

const $optionCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedOptionCard: ViewStyle = {
  borderColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "10",
}

const $optionHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $optionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginLeft: spacing.sm,
}

const $optionDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
  lineHeight: 18,
}

const $section: ViewStyle = {
  marginTop: spacing.lg,
}

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $helpButton: ViewStyle = {
  backgroundColor: colors.palette.threadBlue,
  borderRadius: 8,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
}

const $helpButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.warmIvory,
}

const $measurementGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
  marginBottom: spacing.md,
}

const $measurementField: ViewStyle = {
  width: "48%",
}

const $unitText: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  fontWeight: "500",
}

const $measurementCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  marginBottom: spacing.md,
  borderWidth: 2,
  borderColor: colors.palette.neutral200,
}

const $selectedMeasurementCard: ViewStyle = {
  borderColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "10",
}

const $measurementHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $measurementTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $defaultBadge: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 4,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
}

const $defaultBadgeText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textTransform: "uppercase",
}

const $measurementDetails: ViewStyle = {
  marginBottom: spacing.sm,
}

const $measurementDetail: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
  marginBottom: spacing.xxs,
}

const $measurementDate: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
}

const $measurementRadio: ViewStyle = {
  alignItems: "flex-end",
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
  borderColor: colors.palette.tailorGold,
}

const $radioButtonInner: ViewStyle = {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.tailorGold,
}

const $skipInfo: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.threadBlue + "10",
  borderRadius: 12,
  padding: spacing.lg,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.threadBlue,
}

const $skipTextContainer: ViewStyle = {
  flex: 1,
  marginLeft: spacing.md,
}

const $skipTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $skipDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.threadBlue,
  lineHeight: 18,
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