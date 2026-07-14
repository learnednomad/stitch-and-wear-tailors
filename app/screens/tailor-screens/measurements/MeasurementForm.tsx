import { useRouter } from "expo-router"
import React, { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Button, Screen, Icon, Text } from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import {
  tailorMeasurementApi,
  MEASUREMENT_FIELD_GROUPS,
  MEASUREMENT_TYPES,
  MeasurementType,
  MeasurementUnit,
  PBMeasurementRecord,
} from "./measurement-data"

export type MeasurementFormMode = "add" | "edit" | "view"

interface MeasurementFormProps {
  mode: MeasurementFormMode
  measurementId?: string
}

/**
 * Shared measurement form handling view (read-only customer profiles),
 * add and edit (the tailor's own templates) via props.
 */
export const MeasurementForm: FC<MeasurementFormProps> = ({ mode, measurementId }) => {
  const router = useRouter()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  const [isLoading, setIsLoading] = useState(!!measurementId)
  const [isSaving, setIsSaving] = useState(false)
  const [record, setRecord] = useState<PBMeasurementRecord | null>(null)
  const [name, setName] = useState("")
  const [measurementType, setMeasurementType] = useState<MeasurementType>("traditional")
  const [unit, setUnit] = useState<MeasurementUnit>("cm")
  const [notes, setNotes] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})

  // View mode is forced for records the tailor doesn't own (customer profiles)
  const readOnly = mode === "view" || (record !== null && !tailorMeasurementApi.isOwn(record))

  const loadRecord = useCallback(async () => {
    if (!measurementId) return
    setIsLoading(true)
    const result = await tailorMeasurementApi.getOne(measurementId)
    if (result.success) {
      const data = result.data
      setRecord(data)
      setName(data.name ?? "")
      setMeasurementType(data.measurementType ?? "traditional")
      setUnit(data.unit === "inch" ? "inch" : "cm")
      setNotes(data.notes ?? "")
      const loaded: Record<string, string> = {}
      for (const group of MEASUREMENT_FIELD_GROUPS) {
        for (const field of group.fields) {
          const value = (data as any)[field.key]
          if (typeof value === "number" && value > 0) loaded[field.key] = String(value)
        }
      }
      setValues(loaded)
    } else {
      Alert.alert("Error", result.message ?? "Failed to load measurement")
    }
    setIsLoading(false)
  }, [measurementId])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const setFieldValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const validate = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please give this measurement profile a name.")
      return false
    }
    for (const group of MEASUREMENT_FIELD_GROUPS) {
      for (const field of group.fields) {
        const raw = values[field.key]?.trim()
        if (!raw) continue
        const num = parseFloat(raw)
        if (isNaN(num) || num < 0 || num > 500) {
          Alert.alert("Invalid Measurement", `Please check the ${field.label} value.`)
          return false
        }
      }
    }
    return true
  }

  const handleSave = async () => {
    if (readOnly || !validate()) return
    setIsSaving(true)

    const payload: Record<string, any> = {
      name: name.trim(),
      measurementType,
      unit,
      notes: notes.trim(),
    }
    for (const group of MEASUREMENT_FIELD_GROUPS) {
      for (const field of group.fields) {
        const raw = values[field.key]?.trim()
        payload[field.key] = raw ? parseFloat(raw) : 0
      }
    }

    const result =
      mode === "edit" && measurementId
        ? await tailorMeasurementApi.update(measurementId, payload)
        : await tailorMeasurementApi.create(payload)
    setIsSaving(false)

    if (result.success) {
      Alert.alert(
        "Saved",
        `"${name.trim()}" has been ${mode === "edit" ? "updated" : "created"}.`,
        [{ text: "OK", onPress: () =>router.back() }],
      )
    } else {
      Alert.alert("Save Failed", result.message ?? "Could not save the measurement.")
    }
  }

  const handleDelete = () => {
    if (!measurementId) return
    Alert.alert(
      "Delete Measurement",
      `Delete "${name || "this measurement"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await tailorMeasurementApi.remove(measurementId)
            if (result.success) {router.back()
            } else {
              Alert.alert("Delete Failed", result.message ?? "Could not delete the measurement.")
            }
          },
        },
      ],
    )
  }

  const title = readOnly ? "Measurement Profile" : mode === "edit" ? "Edit Template" : "New Template"

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="fixed"
      statusBarStyle="dark"
      contentContainerStyle={$screenContent}
    >
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-neutral200">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() =>router.back()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <Text className="flex-1 text-[18px] text-center" weight="semiBold" style={$headerTitleColor}>
          {title}
        </Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.palette.primary500} />
        </View>
      ) : (
        <ScrollView style={$container} showsVerticalScrollIndicator={false}>
          {/* Profile owner banner for read-only customer profiles */}
          {readOnly && (
            <View className="px-6 pt-6">
              <View className="flex-row items-center rounded-lg bg-primary100 p-4">
                <Icon icon="lock" size={18} color={colors.palette.primary700} />
                <Text className="flex-1 text-[13px] ml-3 leading-[18px]" style={$readOnlyTextColor}>
                  Customer profiles are read-only. Only your own templates can be edited.
                </Text>
              </View>
            </View>
          )}

          {/* Name */}
          <View className="px-6 pt-6">
            <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
              Profile Name
            </Text>
            <View className="flex-row items-center rounded-lg border border-neutral300 bg-neutral100">
              <TextInput
                style={$textInput}
                placeholder="e.g. Standard Agbada Template"
                placeholderTextColor={colors.palette.neutral400}
                value={name}
                onChangeText={setName}
                editable={!readOnly}
              />
            </View>
          </View>

          {/* Type */}
          <View className="px-6 pt-6">
            <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
              Garment Type
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {MEASUREMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  className="py-2 px-4 rounded-2xl border border-neutral300"
                  style={measurementType === type ? $selectedChip : undefined}
                  disabled={readOnly}
                  onPress={() => setMeasurementType(type)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={measurementType === type ? $selectedChipTextColor : $chipTextColor}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unit */}
          <View className="px-6 pt-6">
            <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
              Measurement Unit
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {(["cm", "inch"] as MeasurementUnit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  className="flex-1 py-3 px-4 rounded-lg border border-neutral300 items-center"
                  style={unit === u ? $selectedChip : undefined}
                  disabled={readOnly}
                  onPress={() => setUnit(u)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={unit === u ? $selectedChipTextColor : $chipTextColor}
                  >
                    {u === "cm" ? "Centimeters (cm)" : "Inches (in)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grouped numeric fields */}
          {MEASUREMENT_FIELD_GROUPS.map((group) => (
            <View key={group.title} className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                {group.title}
              </Text>
              <View className="gap-3">
                {group.fields.map((field) => (
                  <View key={field.key} className="mb-2">
                    <Text className="text-[14px] mb-2" weight="medium" style={$fieldLabelColor}>
                      {field.label}
                    </Text>
                    <View className="flex-row items-center rounded-lg border border-neutral300 bg-neutral100">
                      <TextInput
                        style={$textInput}
                        placeholder="0"
                        placeholderTextColor={colors.palette.neutral400}
                        value={values[field.key] ?? ""}
                        onChangeText={(value) => setFieldValue(field.key, value)}
                        keyboardType="numeric"
                        editable={!readOnly}
                      />
                      <View className="px-4 py-3 bg-neutral200 rounded-tr-lg rounded-br-lg">
                        <Text className="text-[14px]" weight="medium" style={$unitTextColor}>
                          {unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Notes */}
          <View className="px-6 pt-6">
            <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
              Notes
            </Text>
            <View className="rounded-lg border border-neutral300 bg-neutral100">
              <TextInput
                style={$textArea}
                placeholder="Fit preferences, posture notes, adjustments..."
                placeholderTextColor={colors.palette.neutral400}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!readOnly}
              />
            </View>
          </View>

          <View className="h-12" />
        </ScrollView>
      )}

      {/* Bottom Actions */}
      {!readOnly && !isLoading && (
        <View
          className="px-6 pt-4 pb-4 bg-neutral100 border-t border-neutral200"
          style={$bottomContainerInsets}
        >
          <Button
            text={isSaving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Template"}
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handleSave}
            disabled={isSaving}
          />
          {mode === "edit" && measurementId && (
            <TouchableOpacity className="items-center py-3 mt-3" onPress={handleDelete}>
              <Text className="text-[14px]" weight="semiBold" style={$deleteButtonTextColor}>
                Delete Template
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. Raw TextInput
// styles, the selection-state chip background, the flex ScrollView style, the
// Screen contentContainerStyle, Button style overrides, and the safe-area bottom
// inset stay inline.
const $container: ViewStyle = {
  flex: 1,
}

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

// Selection-state chip background/border stays inline (conditional style).
const $selectedChip: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

// Raw TextInput styles stay inline.
const $textInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.palette.neutral900,
}

const $textArea: TextStyle = {
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 14,
  color: colors.palette.neutral900,
  minHeight: 100,
}

// Button style overrides stay inline (Button owns its className).
const $primaryButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $primaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $readOnlyTextColor: TextStyle = { color: colors.palette.primary700 }
const $chipTextColor: TextStyle = { color: colors.palette.neutral700 }
const $selectedChipTextColor: TextStyle = { color: colors.palette.neutral100 }
const $fieldLabelColor: TextStyle = { color: colors.palette.neutral900 }
const $unitTextColor: TextStyle = { color: colors.palette.neutral600 }
const $deleteButtonTextColor: TextStyle = { color: colors.palette.error500 }
