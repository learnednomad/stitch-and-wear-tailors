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
import { FC, useEffect, useMemo, useState } from "react"
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
import { Button, Icon, Screen, Text, TextField } from "@/components"
import {
  useCancelAppointment,
  useCreateAppointment,
  useUpcomingAppointments,
} from "@/api/appointments"
import { useTailors } from "@/api/catalog"
import { errorMessage } from "@/api/common"
import { PBAppointment } from "@/services/api/appointment-api"
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
    tailor.businessName || [tailor.firstName, tailor.lastName].filter(Boolean).join(" ") || "Tailor"
  )
}

const STATUS_COLORS: Record<string, string> = {
  requested: "#E8B04B",
  confirmed: "#6B8E6B",
  completed: "#4A6B8C",
  cancelled: "#C85450",
  rescheduled: "#E8B04B",
}

// Shared chip layout/border classes (dynamic bg + text color stay inline).
const CHIP_CLASS = "rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
const CHIP_TEXT_CLASS = "text-center text-[13px] font-semibold"

export const BookFittingScreen: FC<BookFittingScreenProps> = function BookFittingScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const [selectedTailor, setSelectedTailor] = useState<string | null>(null)
  const [type, setType] = useState<PBAppointment["type"]>("fitting")
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [note, setNote] = useState("")

  const days = useMemo(nextTwoWeeks, [])

  const tailorsQuery = useTailors()
  const appointmentsQuery = useUpcomingAppointments()
  const createAppointment = useCreateAppointment()
  const cancelAppointment = useCancelAppointment()

  const tailors = useMemo(() => tailorsQuery.data ?? [], [tailorsQuery.data])
  const appointments = appointmentsQuery.data ?? []
  const isSubmitting = createAppointment.isPending

  // preselect when there's a single tailor
  useEffect(() => {
    if (tailors.length === 1) {
      setSelectedTailor((current) => current ?? tailors[0].id)
    }
  }, [tailors])

  const isRefreshing = tailorsQuery.isRefetching || appointmentsQuery.isRefetching
  const onRefresh = () => {
    tailorsQuery.refetch()
    appointmentsQuery.refetch()
  }

  const handleSubmit = () => {
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

    createAppointment.mutate(
      {
        tailor: selectedTailor,
        type,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: 60,
        notes: note.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert("Requested!", "Your appointment request has been sent to the tailor.")
          setSelectedDay(null)
          setSelectedHour(null)
          setNote("")
        },
        onError: (error) => {
          Alert.alert("Error", errorMessage(error) || "Failed to book the appointment")
        },
      },
    )
  }

  const handleCancel = (appointment: PBAppointment) => {
    Alert.alert("Cancel appointment", "Are you sure you want to cancel this appointment?", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel appointment",
        style: "destructive",
        onPress: () => {
          cancelAppointment.mutate(appointment.id, {
            onError: (error) => {
              Alert.alert("Error", errorMessage(error) || "Failed to cancel")
            },
          })
        },
      },
    ])
  }

  // Selection-state tinted background stays inline; layout + solid-token border
  // move to the CHIP_CLASS className.
  const chipBg = (active: boolean): ViewStyle => ({
    backgroundColor: active ? theme.colors.tint : theme.colors.palette.neutral100,
  })

  const chipTextColor = (active: boolean): TextStyle => ({
    color: active ? theme.colors.palette.neutral100 : theme.colors.text,
  })

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />,
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
        <Text preset="heading" text="Book an Appointment" className="flex-1" />
      </View>

      {/* tailor picker */}
      <Text preset="formLabel" text="Tailor" className="mt-3 px-4" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {tailors.map((tailor) => (
          <TouchableOpacity
            key={tailor.id}
            className={CHIP_CLASS}
            style={chipBg(selectedTailor === tailor.id)}
            onPress={() => setSelectedTailor(tailor.id)}
          >
            <Text
              className={CHIP_TEXT_CLASS}
              style={chipTextColor(selectedTailor === tailor.id)}
              text={tailorName(tailor)}
            />
          </TouchableOpacity>
        ))}
        {tailors.length === 0 && (
          <Text className="text-textDim dark:text-textDim-dark" text="No tailors available" />
        )}
      </ScrollView>

      {/* appointment type */}
      <Text preset="formLabel" text="Type" className="mt-3 px-4" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {APPOINTMENT_TYPES.map((option) => (
          <TouchableOpacity
            key={option.value}
            className={CHIP_CLASS}
            style={chipBg(type === option.value)}
            onPress={() => setType(option.value)}
          >
            <Text
              className={CHIP_TEXT_CLASS}
              style={chipTextColor(type === option.value)}
              text={option.label}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* day picker: next 14 days */}
      <Text preset="formLabel" text="Day" className="mt-3 px-4" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {days.map((day) => {
          const active = selectedDay?.getTime() === day.getTime()
          return (
            <TouchableOpacity
              key={day.toISOString()}
              className={`${CHIP_CLASS} min-w-[64px] items-center`}
              style={chipBg(active)}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                className={CHIP_TEXT_CLASS}
                style={chipTextColor(active)}
                text={day.toLocaleDateString("en-NG", { weekday: "short" })}
              />
              <Text
                className={CHIP_TEXT_CLASS}
                style={chipTextColor(active)}
                text={day.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* time slots 9:00-17:00 */}
      <Text preset="formLabel" text="Time" className="mt-3 px-4" />
      <View className="flex-row flex-wrap gap-2 px-4 py-2">
        {TIME_SLOTS.map((hour) => {
          const active = selectedHour === hour
          return (
            <TouchableOpacity
              key={hour}
              className={CHIP_CLASS}
              style={chipBg(active)}
              onPress={() => setSelectedHour(hour)}
            >
              <Text className={CHIP_TEXT_CLASS} style={chipTextColor(active)} text={`${hour}:00`} />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* optional note */}
      <View className="px-4 pt-3">
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
      <Text preset="subheading" text="Upcoming appointments" className="mb-2 mt-6 px-4" />
      {appointments.filter((a) => a.status !== "cancelled").length === 0 && (
        <Text
          className="px-4 pb-6 text-textDim dark:text-textDim-dark"
          text="No upcoming appointments"
        />
      )}
      {appointments
        .filter((a) => a.status !== "cancelled")
        .map((appointment) => (
          <View
            key={appointment.id}
            className="mx-4 mb-3 rounded-xl bg-neutral100 p-4 dark:bg-neutral100-dark"
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[15px] font-bold text-text dark:text-text-dark"
                text={
                  APPOINTMENT_TYPES.find((t) => t.value === appointment.type)?.label ??
                  appointment.type
                }
              />
              <View
                className="rounded-[10px] px-2 py-0.5"
                style={{
                  backgroundColor: (STATUS_COLORS[appointment.status] ?? "#8B9D83") + "33",
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: STATUS_COLORS[appointment.status] ?? "#8B9D83" }}
                  text={appointment.status}
                />
              </View>
            </View>
            <Text
              className="mt-1 text-[13px] text-textDim dark:text-textDim-dark"
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
                className="mt-1 text-[13px] text-textDim dark:text-textDim-dark"
                text={appointment.notes}
                numberOfLines={2}
              />
            )}
            <TouchableOpacity onPress={() => handleCancel(appointment)}>
              <Text
                className="mt-2 text-[13px] font-bold text-error dark:text-error-dark"
                text="Cancel"
              />
            </TouchableOpacity>
          </View>
        ))}
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

// ScrollView contentContainerStyle prop — stays an inline style object.
const $chips: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  gap: spacing.xs,
  alignItems: "center",
}

// Button style override — stays inline.
const $submitButton: ViewStyle = {
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
}
