/**
 * BookFittingScreen
 *
 * Book an appointment with a tailor: pick a tailor, appointment type,
 * a day (next 14 days) and an hourly slot (9:00-17:00), add an optional
 * note, and submit. The server hook notifies the tailor. Upcoming
 * appointments (with cancel) are listed below the form.
 *
 * Calls appointment-api's PB surface directly — AppointmentStore /
 * AppointmentStoreEnhanced are unwired mock machinery targeting /api
 * endpoints that don't exist.
 */
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  Alert,
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Screen, Text, TextField } from "@/components"
import { appointmentApi, PBAppointment } from "@/services/api/appointment-api"
import { catalogApi, PBTailor } from "@/services/api/catalog-api"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface BookFittingScreenProps extends AppStackScreenProps<"BookFitting"> {}

const APPOINTMENT_TYPES: Array<{ value: PBAppointment["type"]; label: string }> = [
  { value: "fitting", label: "Fitting" },
  { value: "consultation", label: "Consultation" },
  { value: "measurement", label: "Measurement" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
]

/** 9:00 through 17:00, hourly */
const TIME_SLOTS = Array.from({ length: 9 }, (_, i) => 9 + i)

/** the next 14 days starting today */
function nextTwoWeeks(): Date[] {
  const days: Date[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 14; i++) {
    days.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000))
  }
  return days
}

function tailorName(tailor?: Record<string, any> | null): string {
  if (!tailor) return "Tailor"
  return (
    tailor.businessName ||
    [tailor.firstName, tailor.lastName].filter(Boolean).join(" ") ||
    "Tailor"
  )
}

const STATUS_COLORS: Record<string, string> = {
  requested: "#E8B04B",
  confirmed: "#6B8E6B",
  completed: "#4A6B8C",
  cancelled: "#C85450",
  rescheduled: "#E8B04B",
}

export const BookFittingScreen: FC<BookFittingScreenProps> = observer(function BookFittingScreen() {
  const { theme } = useAppTheme()
  const [tailors, setTailors] = useState<PBTailor[]>([])
  const [appointments, setAppointments] = useState<PBAppointment[]>([])
  const [selectedTailor, setSelectedTailor] = useState<string | null>(null)
  const [type, setType] = useState<PBAppointment["type"]>("fitting")
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const days = useMemo(nextTwoWeeks, [])

  const load = useCallback(async () => {
    const [tailorsResult, appointmentsResult] = await Promise.all([
      catalogApi.listTailors(),
      appointmentApi.listUpcoming(),
    ])
    if (tailorsResult.success) {
      setTailors(tailorsResult.data)
      // preselect when there's a single tailor
      if (tailorsResult.data.length === 1) setSelectedTailor(tailorsResult.data[0].id)
    }
    if (appointmentsResult.success) setAppointments(appointmentsResult.data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await load()
    setIsRefreshing(false)
  }, [load])

  const handleSubmit = async () => {
    if (!selectedTailor || !selectedDay || selectedHour === null) {
      Alert.alert("Incomplete", "Please pick a tailor, a day and a time slot.")
      return
    }
    const scheduledAt = new Date(selectedDay)
    scheduledAt.setHours(selectedHour, 0, 0, 0)
    if (scheduledAt.getTime() < Date.now()) {
      Alert.alert("Invalid time", "That time slot has already passed. Pick a later one.")
      return
    }

    setIsSubmitting(true)
    const result = await appointmentApi.createAppointment({
      tailor: selectedTailor,
      type,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: 60,
      notes: note.trim(),
    })
    setIsSubmitting(false)

    if (result.success) {
      Alert.alert("Requested!", "Your appointment request has been sent to the tailor.")
      setSelectedDay(null)
      setSelectedHour(null)
      setNote("")
      await load()
    } else {
      Alert.alert("Error", result.message ?? "Failed to book the appointment")
    }
  }

  const handleCancel = (appointment: PBAppointment) => {
    Alert.alert("Cancel appointment", "Are you sure you want to cancel this appointment?", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel appointment",
        style: "destructive",
        onPress: async () => {
          const result = await appointmentApi.cancelAppointment(appointment.id)
          if (result.success) {
            await load()
          } else {
            Alert.alert("Error", result.message ?? "Failed to cancel")
          }
        },
      },
    ])
  }

  const chipStyle = (active: boolean): ViewStyle[] => [
    $chip,
    {
      backgroundColor: active ? theme.colors.tint : theme.colors.palette.neutral100,
      borderColor: theme.colors.border,
    },
  ]

  const chipTextStyle = (active: boolean): TextStyle[] => [
    $chipText,
    { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
  ]

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />,
      }}
    >
      <Text preset="heading" text="Book an Appointment" style={$heading} />

      {/* tailor picker */}
      <Text preset="formLabel" text="Tailor" style={$label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {tailors.map((tailor) => (
          <TouchableOpacity
            key={tailor.id}
            style={chipStyle(selectedTailor === tailor.id)}
            onPress={() => setSelectedTailor(tailor.id)}
          >
            <Text style={chipTextStyle(selectedTailor === tailor.id)} text={tailorName(tailor)} />
          </TouchableOpacity>
        ))}
        {tailors.length === 0 && (
          <Text style={{ color: theme.colors.textDim }} text="No tailors available" />
        )}
      </ScrollView>

      {/* appointment type */}
      <Text preset="formLabel" text="Type" style={$label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {APPOINTMENT_TYPES.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={chipStyle(type === option.value)}
            onPress={() => setType(option.value)}
          >
            <Text style={chipTextStyle(type === option.value)} text={option.label} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* day picker: next 14 days */}
      <Text preset="formLabel" text="Day" style={$label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {days.map((day) => {
          const active = selectedDay?.getTime() === day.getTime()
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[...chipStyle(active), $dayChip]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={chipTextStyle(active)}
                text={day.toLocaleDateString("en-NG", { weekday: "short" })}
              />
              <Text
                style={chipTextStyle(active)}
                text={day.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* time slots 9:00-17:00 */}
      <Text preset="formLabel" text="Time" style={$label} />
      <View style={$slotGrid}>
        {TIME_SLOTS.map((hour) => {
          const active = selectedHour === hour
          return (
            <TouchableOpacity
              key={hour}
              style={chipStyle(active)}
              onPress={() => setSelectedHour(hour)}
            >
              <Text style={chipTextStyle(active)} text={`${hour}:00`} />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* optional note */}
      <View style={$noteContainer}>
        <TextField
          label="Note (optional)"
          placeholder="Anything the tailor should know?"
          value={note}
          onChangeText={setNote}
          multiline
        />
      </View>

      <Button
        text={isSubmitting ? "Booking..." : "Request Appointment"}
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={$submitButton}
      />

      {/* upcoming appointments */}
      <Text preset="subheading" text="Upcoming appointments" style={$upcomingTitle} />
      {appointments.filter((a) => a.status !== "cancelled").length === 0 && (
        <Text
          style={[$emptyText, { color: theme.colors.textDim }]}
          text="No upcoming appointments"
        />
      )}
      {appointments
        .filter((a) => a.status !== "cancelled")
        .map((appointment) => (
          <View
            key={appointment.id}
            style={[$appointmentCard, { backgroundColor: theme.colors.palette.neutral100 }]}
          >
            <View style={$appointmentHeader}>
              <Text
                style={[$appointmentType, { color: theme.colors.text }]}
                text={
                  APPOINTMENT_TYPES.find((t) => t.value === appointment.type)?.label ??
                  appointment.type
                }
              />
              <View
                style={[
                  $statusChip,
                  { backgroundColor: (STATUS_COLORS[appointment.status] ?? "#8B9D83") + "33" },
                ]}
              >
                <Text
                  style={[$statusChipText, { color: STATUS_COLORS[appointment.status] ?? "#8B9D83" }]}
                  text={appointment.status}
                />
              </View>
            </View>
            <Text
              style={[$appointmentMeta, { color: theme.colors.textDim }]}
              text={`${new Date(appointment.scheduledAt).toLocaleString("en-NG", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })} · ${tailorName(appointment.expand?.tailor)}`}
            />
            {!!appointment.notes && (
              <Text
                style={[$appointmentMeta, { color: theme.colors.textDim }]}
                text={appointment.notes}
                numberOfLines={2}
              />
            )}
            <TouchableOpacity onPress={() => handleCancel(appointment)}>
              <Text style={[$cancelText, { color: theme.colors.error }]} text="Cancel" />
            </TouchableOpacity>
          </View>
        ))}
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

const $label: TextStyle = {
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
}

const $chips: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  gap: spacing.xs,
  alignItems: "center",
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
  textAlign: "center",
}

const $dayChip: ViewStyle = {
  alignItems: "center",
  minWidth: 64,
}

const $slotGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
}

const $noteContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
}

const $submitButton: ViewStyle = {
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
}

const $upcomingTitle: TextStyle = {
  paddingHorizontal: spacing.md,
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
}

const $emptyText: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
}

const $appointmentCard: ViewStyle = {
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
  borderRadius: 12,
  padding: spacing.md,
}

const $appointmentHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $appointmentType: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
}

const $statusChip: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 10,
}

const $statusChipText: TextStyle = {
  fontSize: 11,
  fontWeight: "700",
}

const $appointmentMeta: TextStyle = {
  fontSize: 13,
  marginTop: spacing.xxs,
}

const $cancelText: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  marginTop: spacing.xs,
}
