/**
 * Measurements Step
 * Second step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, Alert, TouchableOpacity } from "react-native"
import { Text, TextField, Button, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import { useOrderDraftStore } from "@/state/orderDraftStore"
import { useAuthStore } from "@/state/authStore"
import {
  getPocketBaseAdapter,
  filters,
  COLLECTIONS,
} from "@/services/api/pocketbase-api-adapter"
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

export const MeasurementsStep: FC = () => {
  const orderStore = useOrderDraftStore()
  const authStore = useAuthStore()

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
        // Direct PB read (parity with the former OrderStore.loadUserMeasurements;
        // measurements move to a React Query hook in a later batch).
        const adapter = getPocketBaseAdapter()
        const result = await adapter.list(COLLECTIONS.MEASUREMENTS, {
          filter: filters.eq("user", authStore.user.id),
          sort: "-created",
          perPage: 10,
        })
        if (result.success) {
          setSavedMeasurements((result.data.items as SavedMeasurement[]) || [])
        }
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
          : "Measurements have been saved successfully.",
      )
    }
  }

  const handleMeasurementChange = (field: keyof typeof newMeasurements, value: string) => {
    setNewMeasurements((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const measurementFields = [
    { key: "chest", label: orderStore.getTranslation("measurementTypes", "chest"), required: true },
    { key: "waist", label: orderStore.getTranslation("measurementTypes", "waist"), required: true },
    {
      key: "length",
      label: orderStore.getTranslation("measurementTypes", "length"),
      required: true,
    },
    {
      key: "shoulder",
      label: orderStore.getTranslation("measurementTypes", "shoulder"),
      required: false,
    },
    {
      key: "armLength",
      label: orderStore.getTranslation("measurementTypes", "armLength"),
      required: false,
    },
    { key: "neck", label: orderStore.getTranslation("measurementTypes", "neck"), required: false },
  ]

  const renderSavedMeasurement = (measurement: SavedMeasurement) => (
    <TouchableOpacity
      key={measurement.id}
      className={`rounded-[12px] border-2 bg-neutral100 p-lg mb-md ${
        selectedMeasurementId === measurement.id ? "border-tailorGold" : "border-neutral200"
      }`}
      style={selectedMeasurementId === measurement.id ? $selectedCardBg : undefined}
      onPress={() => setSelectedMeasurementId(measurement.id)}
    >
      <View className="flex-row items-center justify-between mb-sm">
        <Text className="text-[16px] font-semibold" style={$textDeepCharcoal}>
          {orderStore.getTranslation("garments", measurement.garmentType)}
        </Text>
        {measurement.isDefault && (
          <View className="rounded-[4px] bg-sageGreen px-xs py-[2px]">
            <Text className="text-[10px] font-semibold uppercase" style={$textWarmIvory}>
              Default
            </Text>
          </View>
        )}
      </View>

      <View className="mb-sm">
        <Text className="text-[13px] mb-xxs" style={$textThreadBlue}>
          Chest: {measurement.chest}cm • Waist: {measurement.waist}cm • Length: {measurement.length}
          cm
        </Text>
        <Text className="text-[11px]" style={$textNeutral500}>
          Created: {new Date(measurement.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View className="items-end">
        <View
          className={`h-6 w-6 items-center justify-center rounded-[12px] border-2 ${
            selectedMeasurementId === measurement.id ? "border-tailorGold" : "border-neutral300"
          }`}
        >
          {selectedMeasurementId === measurement.id && (
            <View className="h-3 w-3 rounded-[6px] bg-tailorGold" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="text-[24px] font-bold mb-xs" style={$textDeepCharcoal}>
          {orderStore.getTranslation("measurements", "en")}
        </Text>
        <Text className="text-[14px] leading-5 mb-lg" style={$textThreadBlue}>
          We need your measurements to create the perfect fit
        </Text>

        {/* Measurement Options */}
        <View className="gap-md mb-lg">
          <TouchableOpacity
            className={`rounded-[12px] border-2 bg-neutral100 p-lg ${
              selectedOption === "new" ? "border-tailorGold" : "border-neutral200"
            }`}
            style={selectedOption === "new" ? $selectedCardBg : undefined}
            onPress={() => setSelectedOption("new")}
          >
            <View className="flex-row items-center mb-sm">
              <Icon icon="more" size={24} color={colors.palette.tailorGold} />
              <Text className="text-[16px] font-semibold ml-sm" style={$textDeepCharcoal}>
                Take New Measurements
              </Text>
            </View>
            <Text className="text-[13px] leading-[18px]" style={$textThreadBlue}>
              Enter your measurements manually or get help from our guide
            </Text>
          </TouchableOpacity>

          {savedMeasurements.length > 0 && (
            <TouchableOpacity
              className={`rounded-[12px] border-2 bg-neutral100 p-lg ${
                selectedOption === "existing" ? "border-tailorGold" : "border-neutral200"
              }`}
              style={selectedOption === "existing" ? $selectedCardBg : undefined}
              onPress={() => setSelectedOption("existing")}
            >
              <View className="flex-row items-center mb-sm">
                <Icon icon="appointment" size={24} color={colors.palette.sageGreen} />
                <Text className="text-[16px] font-semibold ml-sm" style={$textDeepCharcoal}>
                  Use Saved Measurements
                </Text>
              </View>
              <Text className="text-[13px] leading-[18px]" style={$textThreadBlue}>
                Choose from {savedMeasurements.length} previously saved measurements
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className={`rounded-[12px] border-2 bg-neutral100 p-lg ${
              selectedOption === "skip" ? "border-tailorGold" : "border-neutral200"
            }`}
            style={selectedOption === "skip" ? $selectedCardBg : undefined}
            onPress={() => setSelectedOption("skip")}
          >
            <View className="flex-row items-center mb-sm">
              <Icon icon="appointment" size={24} color={colors.palette.threadBlue} />
              <Text className="text-[16px] font-semibold ml-sm" style={$textDeepCharcoal}>
                Measure During Fitting
              </Text>
            </View>
            <Text className="text-[13px] leading-[18px]" style={$textThreadBlue}>
              Skip for now and take measurements during your fitting appointment
            </Text>
          </TouchableOpacity>
        </View>

        {/* New Measurements Form */}
        {selectedOption === "new" && (
          <View className="mt-lg">
            <View className="flex-row items-center justify-between mb-md">
              <Text className="text-[16px] font-semibold" style={$textDeepCharcoal}>
                Enter Measurements (in cm)
              </Text>
              <Button
                text="Help Guide"
                style={$helpButton}
                textStyle={$helpButtonText}
                onPress={() => setShowTutorial(true)}
              />
            </View>

            <View className="flex-row flex-wrap gap-md mb-md">
              {measurementFields.map((field) => (
                <View key={field.key} className="w-[48%]">
                  <TextField
                    label={`${field.label}${field.required ? " *" : ""}`}
                    placeholder="0"
                    value={newMeasurements[field.key as keyof typeof newMeasurements]}
                    onChangeText={(text) =>
                      handleMeasurementChange(field.key as keyof typeof newMeasurements, text)
                    }
                    keyboardType="numeric"
                    status={errors[field.key] ? "error" : undefined}
                    helper={errors[field.key]}
                    RightAccessory={() => (
                      <Text className="text-[14px] font-medium" style={$textThreadBlue}>
                        cm
                      </Text>
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
          <View className="mt-lg">
            <Text className="text-[16px] font-semibold mb-md" style={$textDeepCharcoal}>
              Select Saved Measurements
            </Text>
            {errors.selection && (
              <Text className="text-[12px] mb-sm" style={$textAlertRed}>
                {errors.selection}
              </Text>
            )}
            {savedMeasurements.map(renderSavedMeasurement)}
          </View>
        )}

        {/* Skip Confirmation */}
        {selectedOption === "skip" && (
          <View className="mt-lg">
            <View className="flex-row rounded-[12px] p-lg border-l-4" style={$skipInfoStyle}>
              <Icon icon="bell" size={24} color={colors.palette.threadBlue} />
              <View className="flex-1 ml-md">
                <Text className="text-[16px] font-semibold mb-xs" style={$textDeepCharcoal}>
                  Fitting Appointment Required
                </Text>
                <Text className="text-[13px] leading-[18px]" style={$textThreadBlue}>
                  A fitting appointment will be scheduled where our tailor will take your
                  measurements professionally.
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

        <View className="h-[32px]" />
      </View>
    </ScrollView>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (no `dark:` variants). Layout, spacing, and container
// backgrounds/borders are className token utilities.

// Text color overrides (static, light-only).
const $textDeepCharcoal: TextStyle = { color: colors.palette.deepCharcoal }
const $textThreadBlue: TextStyle = { color: colors.palette.threadBlue }
const $textWarmIvory: TextStyle = { color: colors.palette.warmIvory }
const $textNeutral500: TextStyle = { color: colors.palette.neutral500 }
const $textAlertRed: TextStyle = { color: colors.palette.alertRed }

// Dynamic-opacity fills kept inline (no matching token utility).
const $selectedCardBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "10" }
const $skipInfoStyle: ViewStyle = {
  backgroundColor: colors.palette.threadBlue + "10",
  borderLeftColor: colors.palette.threadBlue,
}

// Button style overrides stay inline (Button owns its className; callers never
// pass one in).
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
