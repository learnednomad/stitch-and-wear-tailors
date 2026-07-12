/**
 * OrderFilterBar helper tests: filter value → orderApi params mapping,
 * date preset computation and the client-side order predicate.
 */
import {
  orderFilterToParams,
  datePresetRange,
  matchesOrderFilter,
  countActiveOrderFilters,
  EMPTY_ORDER_FILTER,
} from "../OrderFilterBar"

describe("orderFilterToParams", () => {
  it("maps an empty filter to no params", () => {
    expect(orderFilterToParams(EMPTY_ORDER_FILTER)).toEqual({})
  })

  it("trims and maps the search term", () => {
    expect(orderFilterToParams({ search: "  ORD-2026 ", statuses: [] })).toEqual({
      search: "ORD-2026",
    })
    expect(orderFilterToParams({ search: "   ", statuses: [] })).toEqual({})
  })

  it("maps a single selected status to the status param", () => {
    expect(orderFilterToParams({ search: "", statuses: ["in_progress"] })).toEqual({
      status: "in_progress",
    })
  })

  it("omits the status param for multi-select (applied client-side)", () => {
    expect(orderFilterToParams({ search: "", statuses: ["pending", "ready"] })).toEqual({})
  })

  it("passes priority and date range through", () => {
    expect(
      orderFilterToParams({
        search: "",
        statuses: [],
        priority: "urgent",
        dateFrom: "2026-07-01 00:00:00",
        dateTo: "2026-07-31 23:59:59",
      }),
    ).toEqual({
      priority: "urgent",
      dateFrom: "2026-07-01 00:00:00",
      dateTo: "2026-07-31 23:59:59",
    })
  })
})

describe("datePresetRange", () => {
  // Saturday 2026-07-11 (local) — Monday of that week is 2026-07-06
  const now = new Date(2026, 6, 11, 15, 30)

  it("returns no range for all time", () => {
    expect(datePresetRange("all", now)).toEqual({})
  })

  it("returns the Monday week start for this week", () => {
    const { dateFrom } = datePresetRange("week", now)
    expect(dateFrom).toBe(new Date(2026, 6, 6, 0, 0, 0, 0).toISOString().replace("T", " ").slice(0, 19))
  })

  it("returns the first of the month for this month", () => {
    const { dateFrom } = datePresetRange("month", now)
    expect(dateFrom).toBe(new Date(2026, 6, 1).toISOString().replace("T", " ").slice(0, 19))
  })
})

describe("matchesOrderFilter", () => {
  const order = {
    orderNumber: "ORD-2026-0042",
    status: "in_progress",
    priority: "urgent",
    createdAt: "2026-07-10 09:00:00.000Z",
    customerInfo: { firstName: "Amina", lastName: "Bello" },
    notes: "extra embroidery on sleeves",
    garmentType: "agbada",
  }

  it("matches everything with an empty filter", () => {
    expect(matchesOrderFilter(order, EMPTY_ORDER_FILTER)).toBe(true)
  })

  it("filters by multi-select statuses", () => {
    expect(matchesOrderFilter(order, { search: "", statuses: ["in_progress", "ready"] })).toBe(true)
    expect(matchesOrderFilter(order, { search: "", statuses: ["pending"] })).toBe(false)
  })

  it("filters by priority", () => {
    expect(matchesOrderFilter(order, { search: "", statuses: [], priority: "urgent" })).toBe(true)
    expect(matchesOrderFilter(order, { search: "", statuses: [], priority: "normal" })).toBe(false)
  })

  it("matches the search term against orderNumber, customer name and notes", () => {
    expect(matchesOrderFilter(order, { search: "0042", statuses: [] })).toBe(true)
    expect(matchesOrderFilter(order, { search: "amina", statuses: [] })).toBe(true)
    expect(matchesOrderFilter(order, { search: "embroidery", statuses: [] })).toBe(true)
    expect(matchesOrderFilter(order, { search: "kaftan", statuses: [] })).toBe(false)
  })

  it("filters by date range against createdAt", () => {
    expect(
      matchesOrderFilter(order, { search: "", statuses: [], dateFrom: "2026-07-06 00:00:00" }),
    ).toBe(true)
    expect(
      matchesOrderFilter(order, { search: "", statuses: [], dateFrom: "2026-07-11 00:00:00" }),
    ).toBe(false)
  })
})

describe("countActiveOrderFilters", () => {
  it("counts search, statuses, priority and date range", () => {
    expect(countActiveOrderFilters(EMPTY_ORDER_FILTER)).toBe(0)
    expect(
      countActiveOrderFilters({
        search: "abc",
        statuses: ["pending", "ready"],
        priority: "urgent",
        dateFrom: "2026-07-01 00:00:00",
      }),
    ).toBe(5)
  })
})
