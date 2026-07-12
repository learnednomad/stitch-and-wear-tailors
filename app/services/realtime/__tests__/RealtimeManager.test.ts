/**
 * RealtimeManager unit tests with a mocked subscribeToCollection so we can
 * drive establish/failure outcomes deterministically.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

jest.mock("../../pocketbase/pocketbase-client", () => ({
  subscribeToCollection: jest.fn(),
}))

import { RealtimeManager } from "../RealtimeManager"
import { subscribeToCollection } from "../../pocketbase/pocketbase-client"

const mockSubscribe = subscribeToCollection as jest.Mock

/** capture the lifecycle hooks of the latest subscribe call */
function lastCallOptions() {
  return mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1][2]
}

describe("RealtimeManager", () => {
  let manager: RealtimeManager
  let disposeSSE: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    manager = new RealtimeManager()
    disposeSSE = jest.fn()
    mockSubscribe.mockReset()
    mockSubscribe.mockReturnValue(disposeSSE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("subscribes and reports live once SSE is established", () => {
    manager.subscribe("orders", "orders" as any, jest.fn())
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(manager.status).toBe("polling") // connecting

    lastCallOptions().onEstablished()
    expect(manager.status).toBe("live")
  })

  it("is idempotent per key — re-subscribing tears down the previous stream", () => {
    manager.subscribe("orders", "orders" as any, jest.fn())
    manager.subscribe("orders", "orders" as any, jest.fn())
    expect(disposeSSE).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledTimes(2)
  })

  it("unsubscribe tears down the stream and returns to off", () => {
    const unsubscribe = manager.subscribe("orders", "orders" as any, jest.fn())
    lastCallOptions().onEstablished()
    unsubscribe()
    expect(disposeSSE).toHaveBeenCalled()
    expect(manager.status).toBe("off")
  })

  it("forwards events to the callback", () => {
    const callback = jest.fn()
    manager.subscribe("orders", "orders" as any, callback)
    const eventHandler = mockSubscribe.mock.calls[0][1]
    eventHandler({ action: "update", record: { id: "abc" } })
    expect(callback).toHaveBeenCalledWith({ action: "update", record: { id: "abc" } })
  })

  it("retries with backoff on failure, then falls back to polling", async () => {
    const fallbackPoll = jest.fn().mockResolvedValue(undefined)
    manager.subscribe("orders", "orders" as any, jest.fn(), { fallbackPoll })

    // fail the initial attempt and all 5 retries (advance past each backoff)
    for (let attempt = 0; attempt < 6; attempt++) {
      expect(mockSubscribe).toHaveBeenCalledTimes(attempt + 1)
      lastCallOptions().onError(new Error("no SSE"))
      if (attempt < 5) jest.advanceTimersByTime(1000 * 2 ** attempt)
    }

    // retries exhausted — no further subscribe attempts, polling instead
    expect(mockSubscribe).toHaveBeenCalledTimes(6)
    expect(manager.status).toBe("polling")

    expect(fallbackPoll).not.toHaveBeenCalled()
    jest.advanceTimersByTime(20_000)
    expect(fallbackPoll).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(20_000)
    expect(fallbackPoll).toHaveBeenCalledTimes(2)

    manager.unsubscribe("orders")
    jest.advanceTimersByTime(60_000)
    expect(fallbackPoll).toHaveBeenCalledTimes(2) // poll timer cleared
  })

  it("status reflects the healthiest subscription", () => {
    manager.subscribe("a", "orders" as any, jest.fn())
    const aOptions = lastCallOptions()
    manager.subscribe("b", "orders" as any, jest.fn())

    aOptions.onEstablished()
    expect(manager.status).toBe("live")

    manager.unsubscribe("a")
    expect(manager.status).toBe("polling") // b still connecting
  })
})
