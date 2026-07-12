/**
 * StylesScreen
 *
 * The same catalog data as CatalogScreen, presented grouped: pick a gender,
 * then browse styles grouped by category section.
 */
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  RefreshControl,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { CatalogGrid, Screen, Text } from "@/components"
import { catalogApi, PBCatalogStyle } from "@/services/api/catalog-api"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface StylesScreenProps extends AppStackScreenProps<"Styles"> {}

const GENDERS = [
  { value: null, label: "All" },
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "unisex", label: "Unisex" },
] as const

/** "buba_sokoto" -> "Buba Sokoto" */
function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const StylesScreen: FC<StylesScreenProps> = observer(function StylesScreen({ navigation }) {
  const { theme } = useAppTheme()
  const [styles, setStyles] = useState<PBCatalogStyle[]>([])
  const [gender, setGender] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const result = await catalogApi.listStyles()
    if (result.success) {
      setStyles(result.data)
      setError(null)
    } else {
      setError(result.message ?? "Failed to load styles")
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // group the gender-filtered styles by category
  const grouped = useMemo(() => {
    const visible = gender
      ? styles.filter((s) => s.gender === gender || s.gender === "unisex")
      : styles
    const byCategory: Record<string, PBCatalogStyle[]> = {}
    for (const style of visible) {
      ;(byCategory[style.category || "other"] ??= []).push(style)
    }
    return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b))
  }, [styles, gender])

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={isLoading} onRefresh={load} />,
      }}
    >
      <Text preset="heading" text="Styles" style={$heading} />

      {/* gender filter chips */}
      <View style={$chips}>
        {GENDERS.map((option) => {
          const active = gender === option.value
          return (
            <TouchableOpacity
              key={option.label}
              style={[
                $chip,
                {
                  backgroundColor: active ? theme.colors.tint : theme.colors.palette.neutral100,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setGender(option.value)}
            >
              <Text
                style={[
                  $chipText,
                  { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                ]}
                text={option.label}
              />
            </TouchableOpacity>
          )
        })}
      </View>

      {error && <Text style={[$error, { color: theme.colors.error }]} text={error} />}

      {grouped.map(([categoryKey, categoryStyles]) => (
        <View key={categoryKey} style={$section}>
          <Text preset="subheading" text={labelize(categoryKey)} style={$sectionTitle} />
          <CatalogGrid
            items={categoryStyles.map((style) => ({
              id: style.id,
              title: style.name,
              subtitle: labelize(style.gender),
              imageUrl: style.images?.length ? fileUrl(style, style.images[0], "300x300") : undefined,
              price: style.basePrice,
              category: style.category,
            }))}
            onPressItem={() => navigation.navigate("NewOrder")}
          />
        </View>
      ))}

      {!isLoading && grouped.length === 0 && !error && (
        <Text style={[$error, { color: theme.colors.textDim }]} text="No styles available" />
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $heading: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $chips: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
}

const $chip: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
}

const $chipText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $section: ViewStyle = {
  marginBottom: spacing.md,
}

const $sectionTitle: TextStyle = {
  paddingHorizontal: spacing.md,
  marginBottom: spacing.xs,
}

const $error: TextStyle = {
  padding: spacing.md,
  textAlign: "center",
}
