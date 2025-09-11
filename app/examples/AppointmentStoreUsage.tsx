/**
 * AppointmentStore Usage Examples
 * Demonstrates the hybrid Zod + MST validation approach
 */

import React, { useEffect, useState } from "react"
import { View, Text, Button, ScrollView, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import {
  createAppointmentStoreEnhanced,
  AppointmentStoreEnhanced,
} from "../models/stores/AppointmentStoreEnhanced"
import { AppointmentStorePersistence } from "../utils/store-persistence"
import { CreateAppointmentInputSchemaType } from "../models/schemas/AppointmentSchema"

/**
 * Example: Basic store usage with validation
 */
const AppointmentStoreExample = observer(() => {
  const [store] = useState(() => createAppointmentStoreEnhanced())
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize store with persistence
  useEffect(() => {
    const initializeStore = async () => {
      try {
        // Load persisted data
        const result = await AppointmentStorePersistence.load(store)
        if (result.success) {
          console.log("✅ AppointmentStore loaded from persistence")
        } else {
          console.warn("⚠️ Failed to load store:", result.error)
        }
      } catch (error) {
        console.error("❌ Store initialization error:", error)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeStore()
  }, [store])

  // Auto-save on changes
  useEffect(() => {
    if (!isInitialized) return

    const saveStore = async () => {
      const result = await AppointmentStorePersistence.save(store)
      if (!result.success) {
        console.error("Failed to save store:", result.error)
      }
    }

    // Debounced save
    const timeoutId = setTimeout(saveStore, 1000)
    return () => clearTimeout(timeoutId)
  }, [store.appointments.items.length, store.lastFetched, isInitialized])

  /**
   * Example: Creating appointment with validation
   */
  const handleCreateAppointment = async () => {
    // This data might come from a form, API, etc.
    const appointmentData: CreateAppointmentInputSchemaType = {
      clientId: "client-123",
      tailorId: "tailor-456",
      type: "consultation",
      services: {
        primaryService: "consultation",
        additionalServices: ["measurement"],
        requirements: ["Bring previous measurements", "Fabric samples"],
        notes: "First consultation for wedding dress",
      },
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 hour
      location: {
        type: "shop",
        address: {
          street: "123 Fashion Ave",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
        },
        instructions: "Ring doorbell twice",
      },
      reminders: [
        {
          type: "email",
          timeBeforeMinutes: 1440, // 24 hours
          sent: false,
        },
      ],
      preparation: {
        clientInstructions: ["Bring inspiration photos", "Wear comfortable clothes"],
        tailorInstructions: ["Prepare measurement tools", "Review client preferences"],
        materialsNeeded: ["Measuring tape", "Pattern paper"],
      },
    }

    // AI Collaborators' recommended approach: Validate at the boundary
    const result = store.createAppointmentWithValidation(appointmentData)

    if (result.success) {
      Alert.alert("Success", "Appointment created successfully!")
      console.log("✅ Created appointment:", result.appointment?.id)
    } else {
      Alert.alert(
        "Validation Error",
        `Failed to create appointment: ${result.errors?.[0]?.message}`,
      )
      console.error("❌ Validation failed:", result.errors)
    }
  }

  /**
   * Example: Loading appointments from API with validation
   */
  const handleLoadAppointments = async () => {
    try {
      const result = await store.loadAppointmentsWithValidation({
        clientId: "client-123",
      })

      if (result.success) {
        Alert.alert("Success", `Loaded ${result.count} appointments`)
      } else {
        Alert.alert("Error", result.error || "Failed to load appointments")
      }
    } catch (error) {
      console.error("Load appointments error:", error)
      Alert.alert("Error", "Unexpected error occurred")
    }
  }

  /**
   * Example: Updating appointment with validation
   */
  const handleUpdateFirstAppointment = () => {
    const firstAppointment = store.appointments.items[0]
    if (!firstAppointment) {
      Alert.alert("Info", "No appointments to update")
      return
    }

    // This might come from user input, form data, etc.
    const updates = {
      status: "confirmed" as const,
      clientNotes: "Client confirmed availability",
      tailorNotes: "Prepared all materials",
    }

    const result = store.updateAppointmentWithValidation(firstAppointment.id, updates)

    if (result.success) {
      Alert.alert("Success", "Appointment updated successfully!")
    } else {
      Alert.alert("Validation Error", "Failed to update appointment")
      console.error("❌ Update validation failed:", result.errors)
    }
  }

  /**
   * Example: Working with invalid data (demonstrates error handling)
   */
  const handleCreateInvalidAppointment = () => {
    // Intentionally invalid data to show validation in action
    const invalidData = {
      clientId: "", // Invalid: empty string
      tailorId: "tailor-456",
      type: "invalid-type", // Invalid: not in enum
      scheduledAt: "not-a-date", // Invalid: not ISO datetime
      // Missing required fields...
    }

    const result = store.createAppointmentWithValidation(invalidData)

    if (!result.success) {
      // This demonstrates how Zod catches invalid data before it reaches MST
      const errorMessages = result.errors
        ?.map((error) => `${error.path?.join(".")}: ${error.message}`)
        .join("\n")

      Alert.alert("Expected Validation Error", `Caught invalid data:\n${errorMessages}`)
      console.log("✅ Validation correctly prevented invalid data:", result.errors)
    }
  }

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Initializing AppointmentStore...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Appointment Store Demo
      </Text>

      {/* Store Statistics */}
      <View style={{ marginBottom: 20, padding: 10, backgroundColor: "#f0f0f0" }}>
        <Text style={{ fontWeight: "bold" }}>Store Status:</Text>
        <Text>Total Appointments: {store.appointments.items.length}</Text>
        <Text>Today's Appointments: {store.todaysAppointments.length}</Text>
        <Text>Upcoming: {store.upcomingAppointments.length}</Text>
        <Text>Loading: {store.isLoading ? "Yes" : "No"}</Text>
        <Text>Error: {store.error || "None"}</Text>
        <Text>
          Last Fetched: {store.lastFetched ? new Date(store.lastFetched).toLocaleString() : "Never"}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ gap: 10 }}>
        <Button title="Create Valid Appointment" onPress={handleCreateAppointment} />

        <Button title="Load Appointments from API" onPress={handleLoadAppointments} />

        <Button
          title="Update First Appointment"
          onPress={handleUpdateFirstAppointment}
          disabled={store.appointments.items.length === 0}
        />

        <Button
          title="Try Invalid Data (Demo Error Handling)"
          onPress={handleCreateInvalidAppointment}
          color="orange"
        />
      </View>

      {/* Appointments List */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>
        Current Appointments:
      </Text>

      {store.appointments.items.length === 0 ? (
        <Text style={{ fontStyle: "italic", color: "gray" }}>
          No appointments yet. Create one using the button above.
        </Text>
      ) : (
        store.appointments.items.map((appointment) => (
          <View
            key={appointment.id}
            style={{
              padding: 10,
              marginBottom: 10,
              backgroundColor: "#fff",
              borderRadius: 5,
              borderWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {appointment.type.toUpperCase()} - {appointment.status}
            </Text>
            <Text>Date: {new Date(appointment.scheduledAt).toLocaleString()}</Text>
            <Text>Client: {appointment.clientId}</Text>
            <Text>Tailor: {appointment.tailorId}</Text>
            <Text>Duration: {appointment.durationMinutes} minutes</Text>
            {appointment.location.type === "shop" && appointment.location.address && (
              <Text>
                Location: {appointment.location.address.street}, {appointment.location.address.city}
              </Text>
            )}
            <Text>Reminders: {appointment.reminders.length}</Text>
            <Text>Active: {appointment.isActive ? "Yes" : "No"}</Text>
            <Text>Overdue: {appointment.isOverdue ? "Yes" : "No"}</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
})

/**
 * Example: React Hook for appointment management
 */
export function useAppointmentManager() {
  const [store] = useState(() => createAppointmentStoreEnhanced())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeStore = async () => {
      const result = await AppointmentStorePersistence.load(store)
      setIsInitialized(true)

      if (!result.success) {
        console.warn("Failed to load appointments:", result.error)
      }
    }

    initializeStore()
  }, [store])

  const createAppointment = React.useCallback(
    async (data: CreateAppointmentInputSchemaType) => {
      const result = store.createAppointmentWithValidation(data)

      if (result.success) {
        // Auto-save after successful creation
        await AppointmentStorePersistence.save(store)
      }

      return result
    },
    [store],
  )

  const loadAppointments = React.useCallback(
    async (filters?: any) => {
      return store.loadAppointmentsWithValidation(filters)
    },
    [store],
  )

  return {
    store,
    isInitialized,
    createAppointment,
    loadAppointments,
    // Expose commonly used computed values
    todaysAppointments: store.todaysAppointments,
    upcomingAppointments: store.upcomingAppointments,
    isLoading: store.isLoading,
    error: store.error,
  }
}

export default AppointmentStoreExample
