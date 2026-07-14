/**
 * StatusUpdateSheet
 *
 * Bottom-sheet modal a tailor uses to advance an order's PocketBase status.
 * Offers every forward status from the current one (measuring → cutting →
 * sewing → finishing → ready → delivered, jumps allowed) plus an optional
 * note. Notes are appended to the order's internalNotes with a timestamp
 * prefix by orderApi.updateOrderStatus (v1 — per-stage notes need a server
 * hook change). Photo attachments are deferred (no-op in v1).
 */

import { useState } from "react"
import { Modal, View, TouchableOpacity, ViewStyle, TextStyle } from "react-native"
import { Text } from "./Text"
import { Button } from "./Button"
import { TextField } from "./TextField"
import { Icon } from "./Icon"
import { colors, spacing } from "../theme"

/** Forward work pipeline in PocketBase status vocabulary */
const WORK_PIPELINE = [
  "measuring",
  "cutting",
  "sewing",
  "finishing",
  "ready",
  "delivered",
] as const

const STATUS_LABELS: Record<string, string> = {
  measuring: "Measuring",
  cutting: "Cutting",
  sewing: "Sewing",
  finishing: "Finishing",
  ready: "Ready for Pickup",
  delivered: "Delivered",
}

/**
 * Forward statuses available from a current PB status. Statuses before the
 * pipeline (pending/accepted) can move to any stage; stages can only move
 * forward.
 */
export function nextStatuses(currentPBStatus: string): string[] {
  const currentIndex = (WORK_PIPELINE as readonly string[]).indexOf(currentPBStatus)
  if (currentIndex === -1) {
    // pending/accepted (or unknown) — whole pipeline is ahead
    return ["cancelled", "rejected"].includes(currentPBStatus) ? [] : [...WORK_PIPELINE]
  }
  return WORK_PIPELINE.slice(currentIndex + 1)
}

export interface StatusUpdateSheetProps {
  visible: boolean
  /** current PocketBase order status (pending|accepted|measuring|...) */
  currentStatus: string
  onClose: () => void
  /** invoked with the chosen PB status and optional note */
  onSubmit: (status: string, note?: string) => void
  isSubmitting?: boolean
}

export function StatusUpdateSheet(props: StatusUpdateSheetProps) {
  const { visible, currentStatus, onClose, onSubmit, isSubmitting } = props
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const options = nextStatuses(currentStatus)

  const handleClose = () => {
    setSelectedStatus(null)
    setNote("")
    onClose()
  }

  const handleSubmit = () => {
    if (!selectedStatus) return
    onSubmit(selectedStatus, note.trim() || undefined)
    setSelectedStatus(null)
    setNote("")
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end">
        <TouchableOpacity style={$backdrop} activeOpacity={1} onPress={handleClose} />
        <View className="rounded-t-[20px] bg-neutral100 p-6 pb-8">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[18px]" weight="bold" style={{ color: colors.palette.neutral900 }}>
              Update Status
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              accessible
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon icon="x" size={22} color={colors.palette.neutral700} />
            </TouchableOpacity>
          </View>

          {options.length === 0 ? (
            <Text className="py-4 text-[14px]" style={{ color: colors.palette.neutral600 }}>
              This order has no further stages.
            </Text>
          ) : (
            <>
              {options.map((status) => (
                <TouchableOpacity
                  key={status}
                  className="mb-2 flex-row items-center justify-between rounded-[10px] border border-neutral300 px-4 py-3"
                  style={
                    selectedStatus === status
                      ? { borderColor: colors.palette.primary500, backgroundColor: colors.palette.primary100 }
                      : undefined
                  }
                  onPress={() => setSelectedStatus(status)}
                  accessible
                  accessibilityLabel={STATUS_LABELS[status] ?? status}
                  accessibilityRole="button"
                >
                  <Text
                    className="text-[15px]"
                    weight={selectedStatus === status ? "semiBold" : undefined}
                    style={{
                      color:
                        selectedStatus === status
                          ? colors.palette.primary700
                          : colors.palette.neutral800,
                    }}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </Text>
                  {selectedStatus === status && (
                    <Icon icon="check" size={18} color={colors.palette.primary600} />
                  )}
                </TouchableOpacity>
              ))}

              <TextField
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                multiline
                containerStyle={$noteField}
              />

              <Button
                text={isSubmitting ? "Updating..." : "Update Status"}
                style={$submitButton}
                textStyle={$submitButtonText}
                disabled={!selectedStatus || isSubmitting}
                onPress={handleSubmit}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

// Styles
// Modal backdrop (opacity-tinted overlay) + TextField containerStyle + Button
// style/textStyle overrides stay inline per the recipe.
const $backdrop: ViewStyle = {
  ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle),
  backgroundColor: colors.palette.overlay50,
}

const $noteField: ViewStyle = {
  marginTop: spacing.sm,
  marginBottom: spacing.md,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
}

const $submitButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
