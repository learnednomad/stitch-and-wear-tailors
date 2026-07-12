import PocketBase, { ClientResponseError } from "pocketbase";

export const PB_URL =
  process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090";

/** Collection name map — always reference collections through this. */
export const COLLECTIONS = {
  users: "users",
  orders: "orders",
  orderItems: "order_items",
  orderStages: "order_stages",
  measurements: "measurements",
  fabrics: "fabrics",
  catalogStyles: "catalog_styles",
  messages: "messages",
  payments: "payments",
  invoices: "invoices",
  appointments: "appointments",
  notifications: "notifications",
  reviews: "reviews",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

let instance: PocketBase | null = null;

/**
 * Browser singleton PocketBase client (default LocalAuthStore → localStorage).
 * Safe to call from server components too, but auth state only exists in the browser.
 */
export function getPb(): PocketBase {
  if (!instance) {
    instance = new PocketBase(PB_URL);
    // React double-renders in dev would otherwise auto-cancel in-flight requests.
    instance.autoCancellation(false);
  }
  return instance;
}

/** Id of the currently authenticated user. Throws if signed out. */
export function authedUserId(): string {
  const id = getPb().authStore.record?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

/** Absolute URL for a file stored on a record. Pass thumb like "100x100" for images. */
export function fileUrl(
  record: { id: string; collectionId?: string; collectionName?: string },
  filename: string,
  thumb?: string
): string {
  if (!filename) return "";
  return getPb().files.getURL(record, filename, thumb ? { thumb } : undefined);
}

/** Turn any PocketBase/network error into a friendly, user-facing message. */
export function pbErrorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    if (err.status === 0) {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    if (err.status === 400) {
      // Prefer the first field-level validation message.
      const data = (err.response?.data ?? {}) as Record<
        string,
        { message?: string } | undefined
      >;
      const firstField = Object.keys(data)[0];
      const fieldMessage = firstField ? data[firstField]?.message : undefined;
      if (firstField && fieldMessage) {
        return `${humanizeField(firstField)}: ${fieldMessage}`;
      }
      return err.response?.message || "Invalid request. Please review and try again.";
    }
    if (err.status === 401) return "Your session has expired. Please sign in again.";
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 404) return "We couldn't find what you were looking for.";
    if (err.status === 429) return "Too many attempts. Please wait a moment and try again.";
    if (err.status >= 500) return "Something went wrong on our end. Please try again shortly.";
    return err.response?.message || err.message || "Something went wrong.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

function humanizeField(field: string): string {
  const withSpaces = field.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).trim();
}
