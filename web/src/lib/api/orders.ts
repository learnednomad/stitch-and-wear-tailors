import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type {
  Order,
  OrderItem,
  OrderPriority,
  OrderStage,
  OrderStatus,
  OrderType,
} from "@/lib/types";

export interface OrderListFilters {
  /** Restrict to these statuses (OR-ed). */
  status?: OrderStatus[];
  /** Matches orderNumber or specialInstructions (contains). */
  search?: string;
  /** ISO date (inclusive) applied to `created`. */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
  /** Which side of the order the current user is on. Default "customer". */
  role?: "customer" | "tailor";
  /** Tailor-side only: also include unassigned pending orders (tailor = ""). */
  includeUnassigned?: boolean;
}

export async function listOrders(
  filters: OrderListFilters = {}
): Promise<ListResult<Order>> {
  const pb = getPb();
  const uid = authedUserId();
  const {
    status,
    search,
    dateFrom,
    dateTo,
    page = 1,
    perPage = 20,
    role = "customer",
  } = filters;

  const parts: string[] = [
    role === "tailor" && filters.includeUnassigned
      ? pb.filter('(tailor = {:uid} || (tailor = "" && status = "pending"))', {
          uid,
        })
      : pb.filter(`${role} = {:uid}`, { uid }),
  ];

  if (status && status.length > 0) {
    parts.push(
      "(" +
        status.map((s) => pb.filter("status = {:s}", { s })).join(" || ") +
        ")"
    );
  }
  if (search) {
    parts.push(
      pb.filter("(orderNumber ~ {:q} || specialInstructions ~ {:q})", {
        q: search,
      })
    );
  }
  if (dateFrom) parts.push(pb.filter("created >= {:d}", { d: dateFrom }));
  if (dateTo) parts.push(pb.filter("created <= {:d}", { d: dateTo }));

  return pb.collection(COLLECTIONS.orders).getList<Order>(page, perPage, {
    filter: parts.join(" && "),
    sort: "-created",
    expand: "customer,tailor,style",
  });
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  stages: OrderStage[];
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const pb = getPb();
  const [order, items, stages] = await Promise.all([
    pb.collection(COLLECTIONS.orders).getOne<Order>(id, {
      expand: "customer,tailor,style,measurement",
    }),
    pb.collection(COLLECTIONS.orderItems).getFullList<OrderItem>({
      filter: pb.filter("order = {:id}", { id }),
      expand: "fabric",
      sort: "created",
    }),
    pb.collection(COLLECTIONS.orderStages).getFullList<OrderStage>({
      filter: pb.filter("order = {:id}", { id }),
      expand: "changedBy",
      sort: "-created",
    }),
  ]);
  return { order, items, stages };
}

export interface CreateOrderInput {
  tailor: string;
  orderType: OrderType;
  priority?: OrderPriority;
  style?: string;
  measurement?: string;
  totalAmount: number;
  currency?: string;
  estimatedDelivery?: string;
  specialInstructions?: string;
  fabricSource?: string;
}

export interface CreateOrderItemInput {
  itemType: string;
  quantity: number;
  fabric?: string;
  designStyle?: string;
  itemPrice: number;
  totalPrice: number;
  specifications?: Record<string, unknown>;
}

/**
 * Create an order plus its items. orderNumber, payment fields and stages are
 * server-managed — never send them.
 */
export async function createOrder(
  data: CreateOrderInput,
  items: CreateOrderItemInput[] = []
): Promise<Order> {
  const pb = getPb();
  const order = await pb.collection(COLLECTIONS.orders).create<Order>({
    ...data,
    customer: authedUserId(),
    status: "pending",
    currency: data.currency ?? "NGN",
    priority: data.priority ?? "normal",
  });

  for (const item of items) {
    await pb
      .collection(COLLECTIONS.orderItems)
      .create({ ...item, order: order.id });
  }
  return order;
}

/** Tailor-side stage progression (measuring → … → delivered). */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  return getPb().collection(COLLECTIONS.orders).update<Order>(id, { status });
}

/** Tailor accepts a pending order (assigns self, server stamps acceptedAt). */
export async function acceptOrder(id: string): Promise<Order> {
  return getPb().collection(COLLECTIONS.orders).update<Order>(id, {
    tailor: authedUserId(),
    status: "accepted",
  });
}

export async function rejectOrder(id: string, reason?: string): Promise<Order> {
  return getPb().collection(COLLECTIONS.orders).update<Order>(id, {
    status: "rejected",
    ...(reason ? { cancellationReason: reason } : {}),
  });
}

export async function cancelOrder(id: string, reason: string): Promise<Order> {
  return getPb().collection(COLLECTIONS.orders).update<Order>(id, {
    status: "cancelled",
    cancellationReason: reason,
  });
}
