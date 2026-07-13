/**
 * React Query hooks for client measurements — the server-data replacement for
 * the former MST MeasurementStore. The legacy store hit an unwired
 * `/api/measurements` REST mock; the live data lives in the PocketBase
 * `measurements` collection (see `PBMeasurementRecord`).
 *
 * `useClientMeasurements(userId)` lists the signed-in client's own measurement
 * records, newest first — it backs the HomeScreen "Recent Measurements" rail
 * and the order wizard's MeasurementsStep saved-measurement picker.
 */
import { useQuery } from "@tanstack/react-query"

import { getPocketBaseAdapter, filters, COLLECTIONS } from "@/services/api/pocketbase-api-adapter"
import { PBMeasurementRecord } from "@/screens/tailor-screens/measurements/measurement-data"

import { ServiceError } from "./common"

export const measurementKeys = {
  all: ["measurements"] as const,
  clientList: (userId: string) => ["measurements", "list", userId] as const,
}

/**
 * A client's own measurement records, newest first. Enabled only when a user id
 * is known (the `enabled: !!user` gating that replaces the RootStore bootstrap).
 */
export function useClientMeasurements(userId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: measurementKeys.clientList(userId ?? ""),
    queryFn: async () => {
      const adapter = getPocketBaseAdapter()
      const result = await adapter.list<PBMeasurementRecord>(COLLECTIONS.MEASUREMENTS, {
        filter: filters.eq("user", userId as string),
        sort: "-created",
        perPage: limit,
      })
      if (!result.success) {
        throw new ServiceError(result.message ?? "Failed to load measurements", result.problem)
      }
      return result.data.items
    },
    enabled: !!userId,
  })
}
