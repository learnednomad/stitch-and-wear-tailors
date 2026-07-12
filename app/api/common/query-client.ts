/**
 * Shared React Query client (Obytes starter convention).
 *
 * One app-wide client created at module scope so non-React code
 * (e.g. realtime subscription handlers) can import it for cache writes.
 * Tests should create their own fresh QueryClient per test instead.
 */
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Screens re-mount often under React Navigation; keep data warm briefly
      // so tab switches don't refetch, while pull-to-refresh still refetches.
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
})
