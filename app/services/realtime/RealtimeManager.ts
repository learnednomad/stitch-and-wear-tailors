/**
 * RealtimeManager
 *
 * Thin manager over the PocketBase `subscribeToCollection` helper that adds:
 * - idempotent subscriptions keyed by a caller-supplied string
 * - automatic re-subscribe with exponential backoff when the SSE stream
 *   cannot be established (max ~5 retries)
 * - an optional polling fallback: once retries are exhausted, the provided
 *   `fallbackPoll` fetcher is invoked every 20s so screens keep fresh data
 * - a tiny observable `status` ("live" | "polling" | "off") so screens can
 *   render a connection indicator
 *
 * Dependency-free by design (no MobX/RxJS — plain listeners).
 */

import {
  subscribeToCollection,
  CollectionName,
} from "../pocketbase/pocketbase-client"

export type RealtimeStatus = "live" | "polling" | "off"

export interface RealtimeEvent {
  action: string
  record: any
}

export interface RealtimeSubscribeOptions {
  /** subscribe to a single record instead of the whole collection */
  recordId?: string
  /** PocketBase realtime filter expression */
  filter?: string
  /** invoked every POLL_INTERVAL_MS while SSE is unavailable */
  fallbackPoll?: () => Promise<void>
}

interface Subscription {
  key: string
  collection: CollectionName
  callback: (event: RealtimeEvent) => void
  options?: RealtimeSubscribeOptions
  /** unsubscribe fn for the current SSE attempt (null while retrying/polling) */
  disposeSSE: (() => void) | null
  live: boolean
  retryCount: number
  retryTimer: ReturnType<typeof setTimeout> | null
  pollTimer: ReturnType<typeof setInterval> | null
  disposed: boolean
}

const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 1000
const POLL_INTERVAL_MS = 20_000

export class RealtimeManager {
  private subscriptions = new Map<string, Subscription>()
  private statusListeners = new Set<(status: RealtimeStatus) => void>()
  private currentStatus: RealtimeStatus = "off"

  /**
   * Aggregate connection status across all active subscriptions:
   * "live" if any SSE stream is established, "off" when nothing is
   * subscribed, "polling" otherwise (connecting, retrying or polling).
   */
  get status(): RealtimeStatus {
    return this.currentStatus
  }

  /**
   * Listen for status changes. The listener is invoked immediately with the
   * current status. Returns a remove function.
   */
  onStatusChange(listener: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.currentStatus)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /**
   * Subscribe to a collection (or single record). Idempotent per key: an
   * existing subscription with the same key is torn down first. Returns an
   * unsubscribe function.
   */
  subscribe(
    key: string,
    collection: CollectionName,
    callback: (event: RealtimeEvent) => void,
    options?: RealtimeSubscribeOptions,
  ): () => void {
    this.unsubscribe(key)

    const subscription: Subscription = {
      key,
      collection,
      callback,
      options,
      disposeSSE: null,
      live: false,
      retryCount: 0,
      retryTimer: null,
      pollTimer: null,
      disposed: false,
    }
    this.subscriptions.set(key, subscription)
    this.connect(subscription)
    this.recomputeStatus()

    return () => this.unsubscribe(key)
  }

  /**
   * Tear down a subscription (SSE stream, retry timer and poll timer).
   */
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key)
    if (!subscription) return
    subscription.disposed = true
    if (subscription.retryTimer) clearTimeout(subscription.retryTimer)
    if (subscription.pollTimer) clearInterval(subscription.pollTimer)
    subscription.disposeSSE?.()
    this.subscriptions.delete(key)
    this.recomputeStatus()
  }

  /**
   * Tear down every subscription.
   */
  unsubscribeAll(): void {
    for (const key of [...this.subscriptions.keys()]) {
      this.unsubscribe(key)
    }
  }

  /**
   * Attempt (or re-attempt) the SSE subscription for one entry.
   */
  private connect(subscription: Subscription): void {
    if (subscription.disposed) return
    subscription.disposeSSE = subscribeToCollection(
      subscription.collection,
      (event) => {
        if (!subscription.disposed) subscription.callback(event)
      },
      {
        recordId: subscription.options?.recordId,
        filter: subscription.options?.filter,
        onEstablished: () => {
          if (subscription.disposed) return
          subscription.live = true
          subscription.retryCount = 0
          this.stopPolling(subscription)
          this.recomputeStatus()
        },
        onError: () => this.handleFailure(subscription),
      },
    )
  }

  /**
   * SSE could not be established: retry with exponential backoff, then fall
   * back to polling once retries are exhausted.
   */
  private handleFailure(subscription: Subscription): void {
    if (subscription.disposed) return
    subscription.live = false
    subscription.disposeSSE?.()
    subscription.disposeSSE = null

    if (subscription.retryCount < MAX_RETRIES) {
      const delay = BASE_BACKOFF_MS * 2 ** subscription.retryCount
      subscription.retryCount += 1
      subscription.retryTimer = setTimeout(() => {
        subscription.retryTimer = null
        this.connect(subscription)
      }, delay)
    } else {
      this.startPolling(subscription)
    }
    this.recomputeStatus()
  }

  private startPolling(subscription: Subscription): void {
    const poll = subscription.options?.fallbackPoll
    if (!poll || subscription.pollTimer) return
    subscription.pollTimer = setInterval(() => {
      poll().catch(() => {
        // polling errors are transient by nature — keep trying
      })
    }, POLL_INTERVAL_MS)
  }

  private stopPolling(subscription: Subscription): void {
    if (subscription.pollTimer) {
      clearInterval(subscription.pollTimer)
      subscription.pollTimer = null
    }
  }

  private recomputeStatus(): void {
    const entries = [...this.subscriptions.values()]
    const next: RealtimeStatus =
      entries.length === 0 ? "off" : entries.some((e) => e.live) ? "live" : "polling"
    if (next === this.currentStatus) return
    this.currentStatus = next
    this.statusListeners.forEach((listener) => listener(next))
  }
}

/**
 * App-wide singleton (screens and stores share one connection state).
 */
export const realtimeManager = new RealtimeManager()
