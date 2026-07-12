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
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "app/theme"
import { tailorMeasurementApi, PBMeasurementRecord } from "./measurement-data"

type Segment = "customers" | "templates"

interface MeasurementScreenProps extends AppStackScreenProps<"TailorMeasurement"> {}

/**
 * Tailor measurements hub: read-only customer profiles (customers with
 * orders for this tailor) and the tailor's own editable house templates.
 */
export const TailorMeasurementScreen: FC<MeasurementScreenProps> = observer(
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
        style={$row}
        onPress={() =>
          navigation.navigate("EditMeasurement", {
            measurementId: record.id,
            mode: readOnly ? "view" : "edit",
          })
        }
      >
        <View style={$rowContent}>
          <Text style={$rowTitle}>{record.name || "Untitled"}</Text>
          <Text style={$rowSubtitle}>
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
      >
        {/* Header */}
        <View style={$header}>
          <Text style={$headerTitle}>Measurements</Text>
        </View>

        {/* Segment selector */}
        <View style={$segmentRow}>
          {(
            [
              ["customers", "Customers"],
              ["templates", "My Templates"],
            ] as [Segment, string][]
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[$segment, segment === key && $selectedSegment]}
              onPress={() => setSegment(key)}
            >
              <Text style={[$segmentText, segment === key && $selectedSegmentText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={$loadingContainer}>
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
            {error && <Text style={$errorText}>{error}</Text>}

            {segment === "customers" ? (
              Object.keys(groupedProfiles).length === 0 ? (
                <View style={$emptyContainer}>
                  <Text style={$emptyTitle}>No customer measurements yet</Text>
                  <Text style={$emptyText}>
                    Measurement profiles of customers who place orders with you will appear here.
                  </Text>
                </View>
              ) : (
                Object.entries(groupedProfiles).map(([customerId, records]) => (
                  <View key={customerId} style={$group}>
                    <Text style={$groupTitle}>
                      {customerNames[customerId] ?? `Customer ${customerId.slice(0, 5)}`}
                    </Text>
                    <View style={$card}>{records.map((r) => renderRow(r, true))}</View>
                  </View>
                ))
              )
            ) : (
              <View style={$group}>
                <Button
                  text="+ New Template"
                  style={$addButton}
                  textStyle={$addButtonText}
                  onPress={() => navigation.navigate("AddMeasurement")}
                />
                {templates.length === 0 ? (
                  <View style={$emptyContainer}>
                    <Text style={$emptyTitle}>No templates yet</Text>
                    <Text style={$emptyText}>
                      Create house templates (standard size profiles) you can reference while
                      working on orders.
                    </Text>
                  </View>
                ) : (
                  <View style={$card}>{templates.map((r) => renderRow(r, false))}</View>
                )}
              </View>
            )}
            <View style={$scrollFooterSpace} />
          </ScrollView>
        )}
      </Screen>
    )
  },
)

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $header: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $headerTitle: TextStyle = {
  fontSize: 22,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $segmentRow: ViewStyle = {
  flexDirection: "row",
  marginHorizontal: spacing.lg,
  marginBottom: spacing.sm,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 10,
  padding: 4,
}

const $segment: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  alignItems: "center",
}

const $selectedSegment: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

const $segmentText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral600,
}

const $selectedSegmentText: TextStyle = {
  color: colors.palette.neutral900,
  fontWeight: "600",
}

const $errorText: TextStyle = {
  color: colors.palette.error500,
  fontSize: 13,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
}

const $group: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
}

const $groupTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
  textTransform: "capitalize",
}

const $card: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  overflow: "hidden",
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $rowContent: ViewStyle = {
  flex: 1,
}

const $rowTitle: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $rowSubtitle: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginTop: 2,
  textTransform: "capitalize",
}

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

const $emptyContainer: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.xl,
  paddingHorizontal: spacing.lg,
}

const $emptyTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $emptyText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  textAlign: "center",
  lineHeight: 18,
}

const $scrollFooterSpace: ViewStyle = {
  height: spacing.xxl,
}
