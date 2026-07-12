import { COLLECTIONS, getPb } from "@/lib/pb";
import type { Order, OrderItem, User } from "@/lib/types";

/**
 * Mobile-app convention for order_items.specifications — mirrored here so the
 * web and React Native clients interoperate on the same records.
 */
export interface ItemSpecifications {
  garmentType?: string;
  customerInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  fabricSelection?: {
    type?: string;
    color?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    inStock?: boolean;
    customerProvided?: boolean;
  };
  styleConfig?: {
    designNotes?: string;
    fitPreference?: string;
    embellishments?: string[];
  };
  pricing?: {
    basePrice?: number;
    fabricCost?: number;
    urgencyFee?: number;
    complexityMultiplier?: number;
    totalPrice?: number;
    depositRequired?: number;
    balanceAmount?: number;
    currency?: string;
  };
  paymentMethod?: string;
}

export function itemSpecs(item?: OrderItem | null): ItemSpecifications {
  return (item?.specifications ?? {}) as ItemSpecifications;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s;
}

/** Short garment description for an order, from its first item when available. */
export function garmentSummary(order: Order, firstItem?: OrderItem | null): string {
  if (firstItem?.designStyle) return firstItem.designStyle;
  const specs = itemSpecs(firstItem);
  if (specs.garmentType) return capitalize(specs.garmentType);
  if (order.expand?.style?.name) return order.expand.style.name;
  if (order.orderType === "alteration") return "Alteration";
  if (order.orderType === "repair") return "Repair";
  return "Custom garment";
}

/** Display name for a tailor/customer user record. */
export function displayName(user?: User | null): string {
  if (!user) return "";
  return (
    user.businessName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
  );
}

/**
 * First order_item for each of the given orders, in one query.
 * Returns a map keyed by order id.
 */
export async function firstItemsByOrder(
  orders: Order[]
): Promise<Record<string, OrderItem>> {
  if (orders.length === 0) return {};
  const pb = getPb();
  const filter = orders
    .map((o) => pb.filter("order = {:id}", { id: o.id }))
    .join(" || ");
  const items = await pb
    .collection(COLLECTIONS.orderItems)
    .getFullList<OrderItem>({ filter, sort: "created" });
  const map: Record<string, OrderItem> = {};
  for (const item of items) {
    if (!map[item.order]) map[item.order] = item;
  }
  return map;
}
