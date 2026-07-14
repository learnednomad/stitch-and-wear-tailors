/**
 * Catalog hook module tests: the service layer is mocked, so these verify
 * the ServiceResult -> React Query bridge (data on success, thrown
 * ServiceError on failure) and the query-key params wiring.
 */
import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

import { catalogApi } from "@/services/api/catalog-api"

import { useFabrics, useStyles } from "../catalog"
import { ServiceError } from "../common"

jest.mock("@/services/api/catalog-api", () => ({
  catalogApi: {
    listStyles: jest.fn(),
    getStyle: jest.fn(),
    listFabrics: jest.fn(),
    listTailors: jest.fn(),
  },
}))

const mockedCatalogApi = catalogApi as jest.Mocked<typeof catalogApi>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("catalog hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("useStyles returns data on service success and forwards params", async () => {
    const styles = [{ id: "s1", name: "Agbada", category: "agbada" }]
    mockedCatalogApi.listStyles.mockResolvedValue({ success: true, data: styles as never })

    const { result } = renderHook(() => useStyles({ search: "agb" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(styles)
    expect(mockedCatalogApi.listStyles).toHaveBeenCalledWith({ search: "agb" })
  })

  it("useStyles surfaces a ServiceError when the service fails", async () => {
    mockedCatalogApi.listStyles.mockResolvedValue({
      success: false,
      problem: { kind: "server" },
      message: "Failed to load catalog",
    })

    const { result } = renderHook(() => useStyles(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ServiceError)
    expect((result.current.error as ServiceError).message).toBe("Failed to load catalog")
    expect((result.current.error as ServiceError).problem).toEqual({ kind: "server" })
  })

  it("useFabrics returns fabric data", async () => {
    const fabrics = [{ id: "f1", name: "Ankara", type: "ankara" }]
    mockedCatalogApi.listFabrics.mockResolvedValue({ success: true, data: fabrics as never })

    const { result } = renderHook(() => useFabrics(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fabrics)
    expect(mockedCatalogApi.listFabrics).toHaveBeenCalledWith({})
  })
})
