/**
 * React Query hooks over the PocketBase appointment surface
 * (BookFittingScreen). Mutations invalidate the whole ["appointments"]
 * scope so upcoming lists refresh after create/cancel.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { appointmentApi, CreatePBAppointmentInput } from "@/services/api/appointment-api"

import { unwrap } from "./common"

export const appointmentKeys = {
  all: ["appointments"] as const,
  upcoming: () => ["appointments", "upcoming"] as const,
}

export function useUpcomingAppointments() {
  return useQuery({
    queryKey: appointmentKeys.upcoming(),
    queryFn: () => unwrap(appointmentApi.listUpcoming()),
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePBAppointmentInput) =>
      unwrap(appointmentApi.createAppointment(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  })
}

export function useCancelAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appointmentId: string) => unwrap(appointmentApi.cancelAppointment(appointmentId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  })
}
