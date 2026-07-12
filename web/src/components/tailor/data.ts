/**
 * Tailor-side data helpers. Kept out of the shared @/lib/api modules so the
 * tailor feature can evolve without touching files other agents own.
 */

import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Review,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Customer display names (customer user records are rule-blocked from expand)
// ---------------------------------------------------------------------------

function nameFromSpecifications(items?: OrderItem[]): string | null {
  const specs = items?.[0]?.specifications as
    | Record<string, unknown>
    | null
    | undefined;
  const info = specs?.customerInfo;
  if (!info) return null;
  if (typeof info === "string") return info.trim() || null;
  if (typeof info === "object") {
    const o = info as Record<string, unknown>;
    const candidate =
      (typeof o.name === "string" && o.name) ||
      (typeof o.fullName === "string" && o.fullName) ||
      [o.firstName, o.lastName].filter((p) => typeof p === "string").join(" ");
    return candidate && candidate.trim() ? candidate.trim() : null;
  }
  return null;
}

/**
 * Best available display name for the customer on an order:
 * expanded user → order_items[0].specifications.customerInfo → id prefix.
 */
export function customerName(order: Order, items?: OrderItem[]): string {
  const u = order.expand?.customer;
  if (u) {
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    if (full) return full;
    if (u.businessName) return u.businessName;
    if (u.email) return u.email;
  }
  const fromSpecs = nameFromSpecifications(items);
  if (fromSpecs) return fromSpecs;
  return `Customer ${order.customer.slice(0, 5)}…`;
}

// ---------------------------------------------------------------------------
// Order items (batched, for board cards / garment summaries)
// ---------------------------------------------------------------------------

/** Fetch order_items for many orders in chunked OR-filter queries. */
export async function itemsByOrders(
  orderIds: string[]
): Promise<Map<string, OrderItem[]>> {
  const map = new Map<string, OrderItem[]>();
  if (orderIds.length === 0) return map;
  const pb = getPb();
  const chunks: string[][] = [];
  for (let i = 0; i < orderIds.length; i += 20) {
    chunks.push(orderIds.slice(i, i + 20));
  }
  const results = await Promise.all(
    chunks.map((ids) =>
      pb.collection(COLLECTIONS.orderItems).getFullList<OrderItem>({
        filter: ids.map((id) => pb.filter("order = {:id}", { id })).join(" || "),
        sort: "created",
      })
    )
  );
  for (const item of results.flat()) {
    const list = map.get(item.order) ?? [];
    list.push(item);
    map.set(item.order, list);
  }
  return map;
}

/** Garment type of a single item: specifications.garmentType → itemType. */
export function garmentType(item: OrderItem): string {
  const specs = item.specifications as Record<string, unknown> | null;
  const fromSpecs = specs?.garmentType;
  if (typeof fromSpecs === "string" && fromSpecs.trim()) return fromSpecs;
  return item.itemType || "item";
}

/** "2× traditional, 1× shirt" — short garment summary for an order card. */
export function garmentSummary(items?: OrderItem[]): string {
  if (!items || items.length === 0) return "No items";
  const counts = new Map<string, number>();
  for (const item of items) {
    const type = garmentType(item).replace(/_/g, " ");
    counts.set(type, (counts.get(type) ?? 0) + (item.quantity || 1));
  }
  return [...counts.entries()]
    .map(([type, qty]) => `${qty}× ${type}`)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Status updates with the mobile internalNotes convention
// ---------------------------------------------------------------------------

/**
 * Advance an order's status; when a note is given it is appended to
 * internalNotes as "[<ISO> → <status>] note" (mobile app convention).
 */
export async function updateStatusWithNote(
  order: Order,
  status: OrderStatus,
  note?: string
): Promise<Order> {
  const pb = getPb();
  const data: Record<string, unknown> = { status };
  const trimmed = note?.trim();
  if (trimmed) {
    const entry = `[${new Date().toISOString()} → ${status}] ${trimmed}`;
    data.internalNotes = order.internalNotes
      ? `${order.internalNotes}\n${entry}`
      : entry;
  }
  return pb.collection(COLLECTIONS.orders).update<Order>(order.id, data);
}

/** Production pipeline after acceptance, in order. */
export const PIPELINE: OrderStatus[] = [
  "measuring",
  "cutting",
  "sewing",
  "finishing",
  "ready",
  "delivered",
];

/** Forward statuses reachable from the current one (jumps allowed). */
export function forwardStatuses(current: OrderStatus): OrderStatus[] {
  const idx = PIPELINE.indexOf(current);
  if (current === "accepted") return PIPELINE;
  if (idx === -1) return [];
  return PIPELINE.slice(idx + 1);
}

// ---------------------------------------------------------------------------
// Payments / reviews for the signed-in tailor
// ---------------------------------------------------------------------------

/** All confirmed, non-refund payments on this tailor's orders. */
export async function confirmedPaymentsForTailor(): Promise<Payment[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.payments).getFullList<Payment>({
    filter: pb.filter(
      'order.tailor = {:uid} && status = "confirmed" && paymentType != "refund"',
      { uid: authedUserId() }
    ),
    sort: "-created",
  });
}

/** Effective date of a payment for revenue bucketing. */
export function paymentDate(payment: Payment): Date {
  return new Date(payment.confirmedAt || payment.created);
}

/** Reviews left for the signed-in tailor, newest first. */
export async function reviewsForTailor(): Promise<Review[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.reviews).getFullList<Review>({
    filter: pb.filter("tailor = {:uid}", { uid: authedUserId() }),
    sort: "-created",
    expand: "customer",
  });
}
