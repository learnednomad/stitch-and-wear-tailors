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
import { useNavigation } from "@react-navigation/native"
import { Button, Screen, Icon, Text } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
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
  const navigation = useNavigation<any>()
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
        [{ text: "OK", onPress: () => navigation.goBack() }],
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
            if (result.success) {
              navigation.goBack()
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
      <View style={$header}>
        <TouchableOpacity
          style={$backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <Text style={$headerTitle}>{title}</Text>
        <View style={$headerSpacer} />
      </View>

      {isLoading ? (
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={colors.palette.primary500} />
        </View>
      ) : (
        <ScrollView style={$container} showsVerticalScrollIndicator={false}>
          {/* Profile owner banner for read-only customer profiles */}
          {readOnly && (
            <View style={$section}>
              <View style={$readOnlyBanner}>
                <Icon icon="lock" size={18} color={colors.palette.primary700} />
                <Text style={$readOnlyText}>
                  Customer profiles are read-only. Only your own templates can be edited.
                </Text>
              </View>
            </View>
          )}

          {/* Name */}
          <View style={$section}>
            <Text style={$sectionTitle}>Profile Name</Text>
            <View style={$inputContainer}>
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
          <View style={$section}>
            <Text style={$sectionTitle}>Garment Type</Text>
            <View style={$chipRow}>
              {MEASUREMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[$chip, measurementType === type && $selectedChip]}
                  disabled={readOnly}
                  onPress={() => setMeasurementType(type)}
                >
                  <Text style={[$chipText, measurementType === type && $selectedChipText]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unit */}
          <View style={$section}>
            <Text style={$sectionTitle}>Measurement Unit</Text>
            <View style={$chipRow}>
              {(["cm", "inch"] as MeasurementUnit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[$unitOption, unit === u && $selectedChip]}
                  disabled={readOnly}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[$chipText, unit === u && $selectedChipText]}>
                    {u === "cm" ? "Centimeters (cm)" : "Inches (in)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grouped numeric fields */}
          {MEASUREMENT_FIELD_GROUPS.map((group) => (
            <View key={group.title} style={$section}>
              <Text style={$sectionTitle}>{group.title}</Text>
              <View style={$fieldsContainer}>
                {group.fields.map((field) => (
                  <View key={field.key} style={$measurementField}>
                    <Text style={$fieldLabel}>{field.label}</Text>
                    <View style={$inputContainer}>
                      <TextInput
                        style={$textInput}
                        placeholder="0"
                        placeholderTextColor={colors.palette.neutral400}
                        value={values[field.key] ?? ""}
                        onChangeText={(value) => setFieldValue(field.key, value)}
                        keyboardType="numeric"
                        editable={!readOnly}
                      />
                      <View style={$unitSuffix}>
                        <Text style={$unitText}>{unit}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Notes */}
          <View style={$section}>
            <Text style={$sectionTitle}>Notes</Text>
            <View style={$textAreaContainer}>
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

          <View style={$scrollFooterSpace} />
        </ScrollView>
      )}

      {/* Bottom Actions */}
      {!readOnly && !isLoading && (
        <View style={[$bottomContainer, $bottomContainerInsets]}>
          <Button
            text={isSaving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Template"}
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handleSave}
            disabled={isSaving}
          />
          {mode === "edit" && measurementId && (
            <TouchableOpacity style={$deleteButton} onPress={handleDelete}>
              <Text style={$deleteButtonText}>Delete Template</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Screen>
  )
}

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  flex: 1,
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $headerSpacer: ViewStyle = {
  width: 40,
}

const $section: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
}

const $readOnlyBanner: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
}

const $readOnlyText: TextStyle = {
  flex: 1,
  fontSize: 13,
  color: colors.palette.primary700,
  marginLeft: spacing.sm,
  lineHeight: 18,
}

const $chipRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
}

const $chip: ViewStyle = {
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $unitOption: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  alignItems: "center",
}

const $selectedChip: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $chipText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral700,
}

const $selectedChipText: TextStyle = {
  color: colors.palette.neutral100,
}

const $fieldsContainer: ViewStyle = {
  gap: spacing.sm,
}

const $measurementField: ViewStyle = {
  marginBottom: spacing.xs,
}

const $fieldLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $inputContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $textInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.palette.neutral900,
}

const $unitSuffix: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.palette.neutral200,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
}

const $unitText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral600,
}

const $textAreaContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $textArea: TextStyle = {
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 14,
  color: colors.palette.neutral900,
  minHeight: 100,
}

const $scrollFooterSpace: ViewStyle = {
  height: spacing.xxl,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

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

const $deleteButton: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.sm,
  marginTop: spacing.sm,
}

const $deleteButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.error500,
}
