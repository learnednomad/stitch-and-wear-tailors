import React, { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "@/theme"
import { tailorMeasurementApi, PBMeasurementRecord } from "./measurement-data"

type Segment = "customers" | "templates"

interface MeasurementScreenProps extends AppStackScreenProps<"TailorMeasurement"> {}

/**
 * Tailor measurements hub: read-only customer profiles (customers with
 * orders for this tailor) and the tailor's own editable house templates.
 */
export const TailorMeasurementScreen: FC<MeasurementScreenProps> = 
  function TailorMeasurementScreen() {
    const navigation = useNavigation<any>()

    const [segment, setSegment] = useState<Segment>("customers")
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [customerProfiles, setCustomerProfiles] = useState<PBMeasurementRecord[]>([])
    const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
    const [templates, setTemplates] = useState<PBMeasurementRecord[]>([])
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
      setError(null)
      const [profilesResult, templatesResult] = await Promise.all([
        tailorMeasurementApi.listCustomerProfiles(),
        tailorMeasurementApi.listMyTemplates(),
      ])
      if (profilesResult.success) {
        setCustomerProfiles(profilesResult.data.measurements)
        setCustomerNames(profilesResult.data.customerNames)
      } else {
        setError(profilesResult.message ?? "Failed to load measurements")
      }
      if (templatesResult.success) {
        setTemplates(templatesResult.data)
      }
      setIsLoading(false)
      setIsRefreshing(false)
    }, [])

    // Reload whenever the screen regains focus (after add/edit/delete)
    useEffect(() => {
      const unsubscribe = navigation.addListener("focus", load)
      return unsubscribe
    }, [navigation, load])

    const onRefresh = () => {
      setIsRefreshing(true)
      load()
    }

    // Group customer profiles by owner for the sectioned list
    const groupedProfiles = customerProfiles.reduce<Record<string, PBMeasurementRecord[]>>(
      (groups, record) => {
        ;(groups[record.user] ??= []).push(record)
        return groups
      },
      {},
    )

    const renderRow = (record: PBMeasurementRecord, readOnly: boolean) => (
      <TouchableOpacity
        key={record.id}
        className="flex-row items-center px-4 py-4 border-b border-neutral200"
        onPress={() =>
          navigation.navigate("EditMeasurement", {
            measurementId: record.id,
            mode: readOnly ? "view" : "edit",
          })
        }
      >
        <View className="flex-1">
          <Text className="text-[15px]" weight="semiBold" style={$rowTitleColor}>
            {record.name || "Untitled"}
          </Text>
          <Text className="text-[13px] mt-0.5 capitalize" style={$rowSubtitleColor}>
            {record.measurementType} · {record.unit}
            {record.isDefault ? " · default" : ""}
          </Text>
        </View>
        <Icon icon="caretRight" size={20} color={colors.palette.neutral400} />
      </TouchableOpacity>
    )

    return (
      <Screen
        backgroundColor={colors.palette.neutral100}
        safeAreaEdges={["top"]}
        preset="fixed"
        statusBarStyle="dark"
        contentContainerStyle={$screenContent}
      >
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-[22px]" weight="bold" style={$headerTitleColor}>
            Measurements
          </Text>
        </View>

        {/* Segment selector */}
        <View className="flex-row mx-6 mb-3 rounded-[10px] bg-neutral200 p-1">
          {(
            [
              ["customers", "Customers"],
              ["templates", "My Templates"],
            ] as [Segment, string][]
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              className="flex-1 py-3 rounded-lg items-center"
              style={segment === key ? $selectedSegment : undefined}
              onPress={() => setSegment(key)}
            >
              <Text
                className="text-[14px]"
                weight={segment === key ? "semiBold" : "medium"}
                style={segment === key ? $selectedSegmentTextColor : $segmentTextColor}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.palette.primary500} />
          </View>
        ) : (
          <ScrollView
            style={$container}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.palette.primary500}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <Text className="text-[13px] px-6 py-3" style={$errorTextColor}>
                {error}
              </Text>
            )}

            {segment === "customers" ? (
              Object.keys(groupedProfiles).length === 0 ? (
                <View className="items-center py-8 px-6">
                  <Text className="text-[16px] mb-2" weight="semiBold" style={$emptyTitleColor}>
                    No customer measurements yet
                  </Text>
                  <Text className="text-[13px] text-center leading-[18px]" style={$emptyTextColor}>
                    Measurement profiles of customers who place orders with you will appear here.
                  </Text>
                </View>
              ) : (
                Object.entries(groupedProfiles).map(([customerId, records]) => (
                  <View key={customerId} className="px-6 pt-4">
                    <Text className="text-[14px] mb-2 capitalize" weight="semiBold" style={$groupTitleColor}>
                      {customerNames[customerId] ?? `Customer ${customerId.slice(0, 5)}`}
                    </Text>
                    <View className="rounded-xl border border-neutral200 bg-neutral100 overflow-hidden">
                      {records.map((r) => renderRow(r, true))}
                    </View>
                  </View>
                ))
              )
            ) : (
              <View className="px-6 pt-4">
                <Button
                  text="+ New Template"
                  style={$addButton}
                  textStyle={$addButtonText}
                  onPress={() => navigation.navigate("AddMeasurement")}
                />
                {templates.length === 0 ? (
                  <View className="items-center py-8 px-6">
                    <Text className="text-[16px] mb-2" weight="semiBold" style={$emptyTitleColor}>
                      No templates yet
                    </Text>
                    <Text className="text-[13px] text-center leading-[18px]" style={$emptyTextColor}>
                      Create house templates (standard size profiles) you can reference while
                      working on orders.
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-xl border border-neutral200 bg-neutral100 overflow-hidden">
                    {templates.map((r) => renderRow(r, false))}
                  </View>
                )}
              </View>
            )}
            <View className="h-12" />
          </ScrollView>
        )}
      </Screen>
    )
  }

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. The
// selection-state segment background, Screen contentContainerStyle, the flex
// ScrollView style, and Button style overrides stay inline.
//
// Screen's fixed preset gives its inner container no height; without flex the
// measurement list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
}

// Selection-state background stays inline (conditional style).
const $selectedSegment: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

// Button style overrides stay inline (Button owns its className).
const $addButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  marginBottom: spacing.md,
}

const $addButtonText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $segmentTextColor: TextStyle = { color: colors.palette.neutral600 }
const $selectedSegmentTextColor: TextStyle = { color: colors.palette.neutral900 }
const $errorTextColor: TextStyle = { color: colors.palette.error500 }
const $groupTitleColor: TextStyle = { color: colors.palette.neutral600 }
const $rowTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $rowSubtitleColor: TextStyle = { color: colors.palette.neutral600 }
const $emptyTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $emptyTextColor: TextStyle = { color: colors.palette.neutral600 }
