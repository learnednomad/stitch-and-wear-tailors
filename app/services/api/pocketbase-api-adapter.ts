/**
 * PocketBase API Adapter
 *
 * Generic record CRUD against the self-hosted PocketBase backend, wrapped in
 * the app's ServiceResult shape. Replaces the Appwrite API adapter. Domain
 * services (order-api, fabric-api, …) build their filters with the `filters`
 * helpers below rather than Appwrite Query strings.
 */

import { pb, COLLECTIONS, CollectionName, handlePocketBaseError, fileUrl } from "../pocketbase/pocketbase-client"
import { ServiceResult } from "./base-api-service"

export { COLLECTIONS, fileUrl }
export type { CollectionName }

export interface ListOptions {
  /** PocketBase filter expression, e.g. `status = "pending" && customer = {:id}` */
  filter?: string
  /** substitution params for the filter expression */
  params?: Record<string, any>
  /** sort expression, e.g. "-created" */
  sort?: string
  /** relations to expand, e.g. "customer,tailor" */
  expand?: string
  page?: number
  perPage?: number
}

export interface ListResult<T> {
  items: T[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

function failure<T>(error: any, context: string): ServiceResult<T> {
  if (__DEV__) {
    console.warn(`PocketBase error (${context}):`, error?.status, error?.message)
  }
  const status = error?.status ?? 0
  const kind =
    status === 401 || status === 403
      ? ("unauthorized" as const)
      : status === 404
        ? ("not-found" as const)
        : status === 0
          ? ("cannot-connect" as const)
          : ("rejected" as const)
  return {
    success: false,
    problem: (kind === "cannot-connect" ? { kind, temporary: true } : { kind }) as any,
    message: handlePocketBaseError(error),
  }
}

/**
 * Filter-building helpers. PocketBase filters are strings with {:param}
 * substitution handled server-side (pb.filter escapes values safely).
 */
export const filters = {
  /** safely interpolate params into a filter expression */
  build(expr: string, params: Record<string, any>): string {
    return pb.filter(expr, params)
  },
  and(...parts: (string | undefined | null | false)[]): string {
    return parts.filter(Boolean).join(" && ")
  },
  or(...parts: (string | undefined | null | false)[]): string {
    const clauses = parts.filter(Boolean)
    return clauses.length > 1 ? `(${clauses.join(" || ")})` : clauses.join("")
  },
  eq(field: string, value: any): string {
    return pb.filter(`${field} = {:v}`, { v: value })
  },
  neq(field: string, value: any): string {
    return pb.filter(`${field} != {:v}`, { v: value })
  },
  gt(field: string, value: any): string {
    return pb.filter(`${field} > {:v}`, { v: value })
  },
  gte(field: string, value: any): string {
    return pb.filter(`${field} >= {:v}`, { v: value })
  },
  lt(field: string, value: any): string {
    return pb.filter(`${field} < {:v}`, { v: value })
  },
  lte(field: string, value: any): string {
    return pb.filter(`${field} <= {:v}`, { v: value })
  },
  like(field: string, value: string): string {
    return pb.filter(`${field} ~ {:v}`, { v: value })
  },
  in(field: string, values: any[]): string {
    if (values.length === 0) return ""
    return `(${values.map((v) => pb.filter(`${field} = {:v}`, { v })).join(" || ")})`
  },
}

export class PocketBaseApiAdapter {
  /**
   * Paginated list.
   */
  async list<T = any>(
    collection: CollectionName,
    options: ListOptions = {},
  ): Promise<ServiceResult<ListResult<T>>> {
    try {
      const filter =
        options.filter && options.params
          ? pb.filter(options.filter, options.params)
          : options.filter
      const result = await pb.collection(collection).getList<T>(
        options.page ?? 1,
        options.perPage ?? 25,
        {
          ...(filter ? { filter } : {}),
          ...(options.sort ? { sort: options.sort } : {}),
          ...(options.expand ? { expand: options.expand } : {}),
        },
      )
      return {
        success: true,
        data: {
          items: result.items,
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      }
    } catch (error: any) {
      return failure(error, `list:${collection}`)
    }
  }

  /**
   * Fetch every matching record (batched internally by the SDK).
   */
  async fullList<T = any>(
    collection: CollectionName,
    options: Omit<ListOptions, "page" | "perPage"> = {},
  ): Promise<ServiceResult<T[]>> {
    try {
      const filter =
        options.filter && options.params
          ? pb.filter(options.filter, options.params)
          : options.filter
      const items = await pb.collection(collection).getFullList<T>({
        ...(filter ? { filter } : {}),
        ...(options.sort ? { sort: options.sort } : {}),
        ...(options.expand ? { expand: options.expand } : {}),
      })
      return { success: true, data: items }
    } catch (error: any) {
      return failure(error, `fullList:${collection}`)
    }
  }

  /**
   * Get a single record by id.
   */
  async getOne<T = any>(
    collection: CollectionName,
    id: string,
    expand?: string,
  ): Promise<ServiceResult<T>> {
    try {
      const record = await pb
        .collection(collection)
        .getOne<T>(id, expand ? { expand } : undefined)
      return { success: true, data: record }
    } catch (error: any) {
      return failure(error, `getOne:${collection}:${id}`)
    }
  }

  /**
   * Get the first record matching a filter (or null).
   */
  async getFirst<T = any>(
    collection: CollectionName,
    filter: string,
    params?: Record<string, any>,
    expand?: string,
  ): Promise<ServiceResult<T | null>> {
    const result = await this.list<T>(collection, { filter, params, perPage: 1, expand })
    if (!result.success) return result
    return { success: true, data: result.data.items[0] ?? null }
  }

  /**
   * Create a record. Pass FormData to include file uploads.
   */
  async create<T = any>(
    collection: CollectionName,
    data: Record<string, any> | FormData,
  ): Promise<ServiceResult<T>> {
    try {
      const record = await pb.collection(collection).create<T>(data)
      return { success: true, data: record }
    } catch (error: any) {
      return failure(error, `create:${collection}`)
    }
  }

  /**
   * Update a record. Pass FormData to include file uploads.
   */
  async update<T = any>(
    collection: CollectionName,
    id: string,
    data: Record<string, any> | FormData,
  ): Promise<ServiceResult<T>> {
    try {
      const record = await pb.collection(collection).update<T>(id, data)
      return { success: true, data: record }
    } catch (error: any) {
      return failure(error, `update:${collection}:${id}`)
    }
  }

  /**
   * Delete a record.
   */
  async remove(collection: CollectionName, id: string): Promise<ServiceResult<void>> {
    try {
      await pb.collection(collection).delete(id)
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, `remove:${collection}:${id}`)
    }
  }

  /**
   * Current authenticated user id ("" when logged out).
   */
  get currentUserId(): string {
    return pb.authStore.record?.id ?? ""
  }

  /**
   * Verify the backend is reachable.
   */
  async testConnection(): Promise<ServiceResult<boolean>> {
    try {
      await pb.health.check()
      return { success: true, data: true }
    } catch (error: any) {
      return failure(error, "testConnection")
    }
  }
}

let adapter: PocketBaseApiAdapter | null = null

export function getPocketBaseAdapter(): PocketBaseApiAdapter {
  if (!adapter) {
    adapter = new PocketBaseApiAdapter()
  }
  return adapter
}

export function resetPocketBaseAdapter(): void {
  adapter = null
}
