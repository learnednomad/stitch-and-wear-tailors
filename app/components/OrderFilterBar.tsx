/**
 * OrderFilterBar
 *
 * Reusable order search + filter bar (ORD-013). Controlled component: the
 * parent owns an OrderFilterValue and receives every change via onChange.
 * Renders a debounced (~400ms) search field plus horizontal filter chips:
 * status multi-select (from the passed statusOptions), priority single-select
 * and date-range presets (All time / This week / This month), with an
 * active-filter count and clear-all chip.
 *
 * Helpers exported alongside the component:
 * - orderFilterToParams: maps a filter value to orderApi.fetchOrders params
 *   (single status only — multi-status selection is applied client-side)
 * - matchesOrderFilter: client-side predicate over mapped domain orders,
 *   used for multi-status filtering and locally-fetched boards
 * - datePresetRange: computes the dateFrom for a preset
 */
import { FC, useCallback, useEffect, useRef, useState } from "react"
import {
  ScrollView,
  StyleProp,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { Icon } from "./Icon"
import { Text } from "./Text"
import { TextField } from "./TextField"
import { colors, spacing } from "@/theme"

export type OrderDatePreset = "all" | "week" | "month"

export interface OrderFilterValue {
  search: string
  /** domain statuses, multi-select ([] = all) */
  statuses: string[]
  /** domain priority (undefined = all) */
  priority?: string
  datePreset?: OrderDatePreset
  dateFrom?: string
  dateTo?: string
}

export const EMPTY_ORDER_FILTER: OrderFilterValue = { search: "", statuses: [] }

export interface OrderFilterOption {
  value: string
  label: string
  color?: string
}

export interface OrderFilterBarProps {
  value: OrderFilterValue
  onChange: (value: OrderFilterValue) => void
  /** status chips to render; omit or pass [] to hide the status row */
  statusOptions?: OrderFilterOption[]
  /** priority chips; pass [] to hide. Defaults to the domain priorities. */
  priorityOptions?: OrderFilterOption[]
  searchPlaceholder?: string
  style?: StyleProp<ViewStyle>
}

const DEFAULT_PRIORITY_OPTIONS: OrderFilterOption[] = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "Express" },
  { value: "urgent", label: "Urgent" },
]

const DATE_PRESET_OPTIONS: { value: OrderDatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

/** Format a Date as a PocketBase-comparable UTC date string */
function toPBDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19)
}

/**
 * Compute the dateFrom for a date preset ("week" = start of the current
 * Monday-based week, "month" = first of the current month, "all" = none).
 */
export function datePresetRange(preset: OrderDatePreset, now: Date = new Date()): {
  dateFrom?: string
} {
  if (preset === "week") {
    const start = new Date(now)
    const daysSinceMonday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - daysSinceMonday)
    start.setHours(0, 0, 0, 0)
    return { dateFrom: toPBDate(start) }
  }
  if (preset === "month") {
    return { dateFrom: toPBDate(new Date(now.getFullYear(), now.getMonth(), 1)) }
  }
  return {}
}

/**
 * Map a filter value to orderApi.fetchOrders params. Multi-status selection
 * is intentionally not mapped (the API takes a single status) — apply
 * matchesOrderFilter client-side when more than one status is selected.
 */
export function orderFilterToParams(value: OrderFilterValue): {
  search?: string
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
} {
  const search = value.search.trim()
  return {
    ...(search ? { search } : {}),
    ...(value.statuses.length === 1 ? { status: value.statuses[0] } : {}),
    ...(value.priority ? { priority: value.priority } : {}),
    ...(value.dateFrom ? { dateFrom: value.dateFrom } : {}),
    ...(value.dateTo ? { dateTo: value.dateTo } : {}),
  }
}

/** Parse PB-style date strings ("YYYY-MM-DD HH:mm:ss[.SSSZ]") safely */
function parseDate(value: string): number {
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const time = Date.parse(normalized)
  return Number.isNaN(time) ? Date.parse(value) : time
}

/**
 * Client-side predicate over a mapped domain order (NigerianOrderModel
 * snapshot/instance shape). Matches all facets of the filter value; the
 * search term matches orderNumber, customer name or notes.
 */
export function matchesOrderFilter(order: Record<string, any>, value: OrderFilterValue): boolean {
  if (value.statuses.length > 0 && !value.statuses.includes(order.status)) return false
  if (value.priority && order.priority !== value.priority) return false

  const created = order.createdAt ? parseDate(order.createdAt) : NaN
  if (value.dateFrom && !Number.isNaN(created) && created < parseDate(value.dateFrom)) return false
  if (value.dateTo && !Number.isNaN(created) && created > parseDate(value.dateTo)) return false

  const search = value.search.trim().toLowerCase()
  if (search) {
    const haystack = [
      order.orderNumber,
      order.customerInfo?.firstName,
      order.customerInfo?.lastName,
      order.notes,
      order.garmentType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(search)) return false
  }
  return true
}

/** Number of active filters (search, each status, priority, date range) */
export function countActiveOrderFilters(value: OrderFilterValue): number {
  return (
    (value.search.trim() ? 1 : 0) +
    value.statuses.length +
    (value.priority ? 1 : 0) +
    (value.dateFrom || value.dateTo ? 1 : 0)
  )
}

export const OrderFilterBar: FC<OrderFilterBarProps> = function OrderFilterBar(props) {
  const {
    value,
    onChange,
    statusOptions = [],
    priorityOptions = DEFAULT_PRIORITY_OPTIONS,
    searchPlaceholder = "Search orders...",
    style,
  } = props

  // Debounced search: keep the raw text locally, push to onChange after ~400ms
  const [searchText, setSearchText] = useState(value.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef({ value, onChange })
  latestRef.current = { value, onChange }

  useEffect(() => {
    // Sync external resets (e.g. clear-all from the parent)
    setSearchText((prev) => (value.search !== prev ? value.search : prev))
  }, [value.search])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const { value: current, onChange: emit } = latestRef.current
      if (current.search !== text) emit({ ...current, search: text })
    }, 400)
  }, [])

  const toggleStatus = (status: string) => {
    const statuses = value.statuses.includes(status)
      ? value.statuses.filter((s) => s !== status)
      : [...value.statuses, status]
    onChange({ ...value, statuses })
  }

  const togglePriority = (priority: string) => {
    onChange({ ...value, priority: value.priority === priority ? undefined : priority })
  }

  const selectDatePreset = (preset: OrderDatePreset) => {
    onChange({
      ...value,
      datePreset: preset,
      dateFrom: datePresetRange(preset).dateFrom,
      dateTo: undefined,
    })
  }

  const clearAll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchText("")
    onChange(EMPTY_ORDER_FILTER)
  }

  const activeCount = countActiveOrderFilters(value)
  const activePreset: OrderDatePreset = value.datePreset ?? (value.dateFrom ? "week" : "all")

  const renderChip = (
    key: string,
    label: string,
    isActive: boolean,
    onPress: () => void,
    activeColor: string = colors.palette.emerald500,
  ) => (
    <TouchableOpacity
      key={key}
      style={[$chip, isActive && { backgroundColor: activeColor, borderColor: activeColor }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Text style={[$chipText, isActive && $chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={[$container, style]}>
      <TextField
        placeholder={searchPlaceholder}
        value={searchText}
        onChangeText={handleSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
        LeftAccessory={(accessoryProps) => (
          <Icon
            icon="view"
            size={20}
            color={colors.palette.gray500}
            containerStyle={accessoryProps.style}
          />
        )}
        RightAccessory={
          searchText
            ? (accessoryProps) => (
                <TouchableOpacity
                  style={accessoryProps.style}
                  onPress={() => handleSearchChange("")}
                  accessibilityLabel="Clear search"
                >
                  <Icon icon="x" size={18} color={colors.palette.neutral500} />
                </TouchableOpacity>
              )
            : undefined
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {activeCount > 0 &&
          renderChip(
            "clear",
            `Clear all (${activeCount})`,
            true,
            clearAll,
            colors.palette.deepCharcoal,
          )}
        {statusOptions.map((option) =>
          renderChip(
            `status-${option.value}`,
            option.label,
            value.statuses.includes(option.value),
            () => toggleStatus(option.value),
          ),
        )}
        {statusOptions.length > 0 && <View style={$chipDivider} />}
        {priorityOptions.map((option) =>
          renderChip(
            `priority-${option.value}`,
            option.label,
            value.priority === option.value,
            () => togglePriority(option.value),
          ),
        )}
        {priorityOptions.length > 0 && <View style={$chipDivider} />}
        {DATE_PRESET_OPTIONS.map((option) =>
          renderChip(
            `date-${option.value}`,
            option.label,
            activePreset === option.value,
            () => selectDatePreset(option.value),
          ),
        )}
      </ScrollView>
    </View>
  )
}

const $container: ViewStyle = {
  gap: spacing.sm,
}

const $chipRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingRight: spacing.lg,
}

const $chip: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
}

const $chipText: TextStyle = {
  fontSize: 13,
  fontWeight: "500",
  color: colors.textDim,
}

const $chipTextActive: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "600",
}

const $chipDivider: ViewStyle = {
  width: 1,
  height: 20,
  backgroundColor: colors.separator,
  marginHorizontal: spacing.xxs,
}
