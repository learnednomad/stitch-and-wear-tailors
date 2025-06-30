/**
 * MST Model Creation Utilities
 * Provides helpers for creating MobX-State-Tree models with TypeScript integration
 */

import { types, Instance, SnapshotIn, SnapshotOut } from "mobx-state-tree"

/**
 * Creates a basic MST model with common properties
 */
export function createBaseModel(name: string) {
  return types.model(name, {
    id: types.identifier,
    createdAt: types.string,
    updatedAt: types.string,
  })
}

/**
 * Creates an MST model for entities with loading and error states
 */
export function createAsyncModel<T>(name: string, properties: T) {
  return types.model(name, {
    ...properties,
    // Loading and error states for async operations
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
  })
  .actions(self => ({
    setLoading(loading: boolean) {
      self.isLoading = loading
    },
    setError(error: string | null) {
      self.error = error
    },
    setLastFetched(timestamp: string) {
      self.lastFetched = timestamp
    },
    clearError() {
      self.error = null
    },
  }))
  .views(self => ({
    get hasError() {
      return self.error !== null
    },
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },
  }))
}

/**
 * Creates a collection model for managing arrays of items
 */
export function createCollectionModel<ItemType>(
  name: string,
  itemModel: ItemType,
) {
  return types.model(name, {
    items: types.array(itemModel),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    hasMore: types.optional(types.boolean, true),
    page: types.optional(types.number, 1),
  })
  .actions(self => ({
    setLoading(loading: boolean) {
      self.isLoading = loading
    },
    setError(error: string | null) {
      self.error = error
    },
    clearError() {
      self.error = null
    },
    setItems(items: any[]) {
      self.items.clear()
      self.items.push(...items)
      self.lastFetched = new Date().toISOString()
    },
    addItems(items: any[]) {
      self.items.push(...items)
      self.lastFetched = new Date().toISOString()
    },
    updateItem(id: string, updates: Partial<any>) {
      const item = self.items.find((item: any) => item.id === id)
      if (item) {
        Object.assign(item, updates, { updatedAt: new Date().toISOString() })
      }
    },
    removeItem(id: string) {
      const index = self.items.findIndex((item: any) => item.id === id)
      if (index !== -1) {
        self.items.splice(index, 1)
      }
    },
    addItem(item: any) {
      self.items.push(item)
    },
    setHasMore(hasMore: boolean) {
      self.hasMore = hasMore
    },
    setPage(page: number) {
      self.page = page
    },
    incrementPage() {
      self.page += 1
    },
    reset() {
      self.items.clear()
      self.page = 1
      self.hasMore = true
      self.error = null
      self.isLoading = false
      self.lastFetched = null
    },
  }))
  .views(self => ({
    get count() {
      return self.items.length
    },
    get hasError() {
      return self.error !== null
    },
    get isEmpty() {
      return self.items.length === 0 && !self.isLoading
    },
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },
    findById(id: string) {
      return self.items.find((item: any) => item.id === id)
    },
    filter(predicate: (item: any) => boolean) {
      return self.items.filter(predicate)
    },
  }))
}

/**
 * Creates a search/filter model for collections
 */
export function createSearchModel() {
  return types.model("Search", {
    query: types.optional(types.string, ""),
    filters: types.map(types.union(types.string, types.number, types.boolean)),
    sortBy: types.optional(types.string, ""),
    sortOrder: types.optional(types.enumeration(["asc", "desc"]), "asc"),
  })
  .actions(self => ({
    setQuery(query: string) {
      self.query = query
    },
    setFilter(key: string, value: string | number | boolean) {
      self.filters.set(key, value)
    },
    removeFilter(key: string) {
      self.filters.delete(key)
    },
    clearFilters() {
      self.filters.clear()
    },
    setSorting(sortBy: string, sortOrder: "asc" | "desc" = "asc") {
      self.sortBy = sortBy
      self.sortOrder = sortOrder
    },
    reset() {
      self.query = ""
      self.filters.clear()
      self.sortBy = ""
      self.sortOrder = "asc"
    },
  }))
  .views(self => ({
    get hasActiveFilters() {
      return self.query.length > 0 || self.filters.size > 0
    },
    get filterCount() {
      return self.filters.size
    },
    getFilter(key: string) {
      return self.filters.get(key)
    },
  }))
}

/**
 * Type helpers for MST models
 */
export type ModelInstance<T> = Instance<T>
export type ModelSnapshotIn<T> = SnapshotIn<T>
export type ModelSnapshotOut<T> = SnapshotOut<T>

/**
 * Creates a UUID for new items
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Creates a timestamp string for MST models
 */
export function createTimestamp(): string {
  return new Date().toISOString()
}