/**
 * StylesScreen
 *
 * The same catalog data as CatalogScreen, presented grouped: pick a gender,
 * then browse styles grouped by category section.
 */
import { FC, useMemo, useState } from "react"
import { RefreshControl, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { CatalogGrid, Icon, Screen, Text } from "@/components"
import { useStyles } from "@/api/catalog"
import { errorMessage } from "@/api/common"
import { PBCatalogStyle } from "@/services/api/catalog-api"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
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

export const StylesScreen: FC<StylesScreenProps> = function StylesScreen({ navigation }) {
  const { theme } = useAppTheme()
  const [gender, setGender] = useState<string | null>(null)

  const stylesQuery = useStyles()
  const styles = useMemo(() => stylesQuery.data ?? [], [stylesQuery.data])
  const isLoading = stylesQuery.isLoading
  const error = stylesQuery.error ? errorMessage(stylesQuery.error) : null

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
        refreshControl: (
          <RefreshControl
            refreshing={stylesQuery.isRefetching}
            onRefresh={() => stylesQuery.refetch()}
          />
        ),
      }}
    >
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="mr-2 h-10 w-10 items-center justify-center"
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text preset="heading" text="Styles" className="flex-1" />
      </View>

      {/* gender filter chips */}
      <View className="flex-row gap-2 px-4 py-3">
        {GENDERS.map((option) => {
          const active = gender === option.value
          return (
            <TouchableOpacity
              key={option.label}
              className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
              style={{ backgroundColor: active ? theme.colors.accent : theme.colors.surface }}
              onPress={() => setGender(option.value)}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: active ? theme.colors.palette.neutral100 : theme.colors.text }}
                text={option.label}
              />
            </TouchableOpacity>
          )
        })}
      </View>

      {error && (
        <Text className="p-4 text-center text-error dark:text-error-dark" text={error} />
      )}

      {grouped.map(([categoryKey, categoryStyles]) => (
        <View key={categoryKey} className="mb-4">
          <Text preset="subheading" text={labelize(categoryKey)} className="mb-2 px-4" />
          <CatalogGrid
            items={categoryStyles.map((style) => ({
              id: style.id,
              title: style.name,
              subtitle: labelize(style.gender),
              imageUrl: style.images?.length
                ? fileUrl(style, style.images[0], "300x300")
                : undefined,
              price: style.basePrice,
              category: style.category,
            }))}
            onPressItem={() => navigation.navigate("NewOrder")}
          />
        </View>
      ))}

      {!isLoading && grouped.length === 0 && !error && (
        <Text
          className="p-4 text-center text-textDim dark:text-textDim-dark"
          text="No styles available"
        />
      )}
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}
