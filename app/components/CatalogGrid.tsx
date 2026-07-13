/**
 * CatalogGrid
 *
 * Responsive image-card grid for catalog browsing (styles, fabrics).
 * 2 columns on phones, 3-4 on wider layouts via useWindowDimensions.
 * Items without an image render a colored placeholder block with the
 * item's category initial.
 */
import { useMemo } from "react"
import { Image, TouchableOpacity, useWindowDimensions, View } from "react-native"
import { Text } from "./Text"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { formatNaira } from "@/utils/formatCurrency"

export interface CatalogGridItem {
  id: string
  title: string
  subtitle?: string
  /** already-resolved image URL (use fileUrl) — placeholder shown when empty */
  imageUrl?: string
  price?: number
  /** used for the placeholder initial + color bucket */
  category?: string
}

interface CatalogGridProps {
  items: CatalogGridItem[]
  onPressItem?: (item: CatalogGridItem) => void
  /** rendered under the grid when items is empty */
  emptyText?: string
}

/** deterministic soft placeholder tone (background + initial color) per category */
function placeholderToneIndex(category?: string, buckets: number = 6): number {
  const key = category || "other"
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 997
  return hash % buckets
}

export function CatalogGrid(props: CatalogGridProps) {
  const { items, onPressItem, emptyText } = props
  const { width } = useWindowDimensions()
  const { theme } = useAppTheme()
  const { palette } = theme.colors

  const placeholderTones = [
    { bg: palette.emerald100, fg: palette.emerald500 },
    { bg: palette.primary100, fg: palette.primary600 },
    { bg: palette.secondary100, fg: palette.secondary400 },
    { bg: palette.accent100, fg: palette.accent500 },
    { bg: palette.warning100, fg: palette.warning600 },
    { bg: palette.error100, fg: palette.error500 },
  ]

  // 2 columns on phones, 3 on small tablets, 4 on wide layouts
  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 2
  const cardWidth = useMemo(() => {
    const horizontalPadding = spacing.md * 2
    const gaps = spacing.sm * (columns - 1)
    return (width - horizontalPadding - gaps) / columns
  }, [width, columns])

  if (items.length === 0) {
    return (
      <View className="items-center p-8">
        <Text
          text={emptyText ?? "Nothing here yet"}
          className="text-textDim dark:text-textDim-dark"
        />
      </View>
    )
  }

  return (
    <View className="flex-row flex-wrap gap-3 px-4">
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          className="overflow-hidden rounded-2xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
          style={{ width: cardWidth }}
          onPress={() => onPressItem?.(item)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} className="h-[120px] w-full" resizeMode="cover" />
          ) : (
            <View
              className="h-[120px] w-full items-center justify-center"
              style={{
                backgroundColor:
                  placeholderTones[placeholderToneIndex(item.category, placeholderTones.length)].bg,
              }}
            >
              <Text
                className="text-[36px] font-bold"
                style={{
                  color:
                    placeholderTones[placeholderToneIndex(item.category, placeholderTones.length)]
                      .fg,
                }}
              >
                {(item.category || item.title).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="p-3">
            <Text
              className="text-[14px] font-semibold text-text dark:text-text-dark"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text
                className="mt-0.5 text-[12px] text-textDim dark:text-textDim-dark"
                numberOfLines={1}
              >
                {item.subtitle}
              </Text>
            )}
            {item.price !== undefined && (
              <Text className="mt-1 text-[13px] font-bold text-accent dark:text-accent-dark">
                {formatNaira(item.price)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}
