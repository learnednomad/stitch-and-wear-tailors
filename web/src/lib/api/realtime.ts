import type { RecordSubscription, SendOptions } from "pocketbase";
import { getPb, type CollectionName } from "@/lib/pb";

export interface SubscribeOptions extends SendOptions {
  /** Record id to watch instead of the whole collection. Default "*". */
  topic?: string;
  /** PocketBase filter applied server-side to the realtime events. */
  filter?: string;
  expand?: string;
}

/**
 * Subscribe to realtime changes (SSE) for a collection.
 * Returns a synchronous unsubscribe function — always call it on unmount.
 *
 * const off = subscribe<AppNotification>(COLLECTIONS.notifications, (e) => { ... });
 * return () => off();
 */
export function subscribe<T>(
  collection: CollectionName,
  callback: (event: RecordSubscription<T>) => void,
  options: SubscribeOptions = {}
): () => void {
  const { topic = "*", ...sendOptions } = options;
  let cancelled = false;
  let unsub: (() => void) | null = null;

  getPb()
    .collection(collection)
    .subscribe<T>(topic, callback, sendOptions)
    .then((fn) => {
      if (cancelled) fn();
      else unsub = fn;
    })
    .catch(() => {
      // Realtime is best-effort; callers should not crash if SSE fails.
    });

  return () => {
    cancelled = true;
    unsub?.();
  };
}
