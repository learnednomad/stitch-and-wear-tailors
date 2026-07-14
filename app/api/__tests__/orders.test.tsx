/**
 * Order hook module tests: the order service is mocked, so these verify the
 * ServiceResult -> React Query bridge (data reshaped on success, thrown
 * ServiceError on failure), the customer filter wiring, and the pure
 * statistics derivation.
 */
import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

import { orderApi } from "@/services/api/order-api"

import { useClientOrders, useOrder, computeOrderStatistics } from "../orders"
import { ServiceError } from "../common"

jest.mock("@/services/api/order-api", () => ({
  orderApi: {
    fetchOrders: jest.fn(),
    fetchOrder: jest.fn(),
  },
  // pass-through used by the mutation hooks (not exercised here)
  domainStatusToPB: (s: string) => s,
}))

const mockedOrderApi = orderApi as jest.Mocked<typeof orderApi>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("order hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("useClientOrders returns the mapped orders array and forwards the customer filter", async () => {
    const orders = [{ id: "o1", status: "pending", garmentType: "agbada", city: "lagos" }]
    mockedOrderApi.fetchOrders.mockResolvedValue({
      success: true,
      data: { orders, page: 1, perPage: 100, totalItems: 1, totalPages: 1, hasMore: false },
    } as never)

    const { result } = renderHook(() => useClientOrders("cust-1", { status: "pending" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(orders)
    expect(mockedOrderApi.fetchOrders).toHaveBeenCalledWith({
      customerId: "cust-1",
      status: "pending",
      priority: undefined,
      search: undefined,
      perPage: 100,
    })
  })

  it("useClientOrders stays disabled without a customerId", async () => {
    const { result } = renderHook(() => useClientOrders(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe("idle")
    expect(mockedOrderApi.fetchOrders).not.toHaveBeenCalled()
  })

  it("useOrder surfaces a ServiceError when the service fails", async () => {
    mockedOrderApi.fetchOrder.mockResolvedValue({
      success: false,
      problem: { kind: "not-found" },
      message: "Order not found",
    } as never)

    const { result } = renderHook(() => useOrder("o1"), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ServiceError)
    expect((result.current.error as ServiceError).message).toBe("Order not found")
  })

  it("computeOrderStatistics derives counts and revenue from delivered orders", () => {
    const stats = computeOrderStatistics([
      { status: "pending", garmentType: "agbada", city: "lagos", pricing: { totalPrice: 100 } },
      { status: "in_progress", garmentType: "kaftan", city: "abuja", pricing: { totalPrice: 200 } },
      { status: "delivered", garmentType: "agbada", city: "lagos", pricing: { totalPrice: 300 } },
      { status: "delivered", garmentType: "senator", city: "kano", pricing: { totalPrice: 500 } },
    ])

    expect(stats.totalOrders).toBe(4)
    expect(stats.pendingOrders).toBe(1)
    expect(stats.inProgressOrders).toBe(1)
    expect(stats.completedOrders).toBe(2)
    expect(stats.revenue).toBe(800) // 300 + 500 delivered
    expect(stats.averageOrderValue).toBe(200) // 800 / 4
    expect(stats.ordersByGarmentType).toEqual({ agbada: 2, kaftan: 1, senator: 1 })
    expect(stats.ordersByCity).toEqual({ lagos: 2, abuja: 1, kano: 1 })
  })
})
