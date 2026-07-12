"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  customerName,
  garmentSummary,
  itemsByOrders,
} from "@/components/tailor/data";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { listOrders } from "@/lib/api/orders";
import { subscribe } from "@/lib/api/realtime";
import { formatNaira, relativeTime } from "@/lib/format";
import { COLLECTIONS } from "@/lib/pb";
import type { Order, OrderItem, OrderPriority } from "@/lib/types";

type ColumnKey = "new" | "in_progress" | "ready" | "delivered";

const COLUMNS: Array<{ key: ColumnKey; title: string }> = [
  { key: "new", title: "New Requests" },
  { key: "in_progress", title: "In Progress" },
  { key: "ready", title: "Ready" },
  { key: "delivered", title: "Delivered" },
];

const IN_PROGRESS = ["accepted", "measuring", "cutting", "sewing", "finishing"];

function columnOf(order: Order): ColumnKey | null {
  if (order.status === "pending") return "new";
  if (IN_PROGRESS.includes(order.status)) return "in_progress";
  if (order.status === "ready") return "ready";
  if (order.status === "delivered") return "delivered";
  return null; // rejected / cancelled stay off the board
}

function OrderCard({
  order,
  items,
}: {
  order: Order;
  items?: OrderItem[];
}) {
  return (
    <Link
      href={`/tailor/orders/${order.id}`}
      className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">
          {order.orderNumber}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {order.priority !== "normal" && (
            <Badge tone={order.priority === "urgent" ? "danger" : "warning"}>
              {order.priority}
            </Badge>
          )}
          <StatusChip kind="order" status={order.status} />
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{customerName(order, items)}</p>
      <p className="mt-0.5 truncate text-xs capitalize text-neutral-500">
        {garmentSummary(items)}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span className="text-sm font-medium text-neutral-800">
          {formatNaira(order.totalAmount, order.currency)}
        </span>
        <span>{relativeTime(order.created)}</span>
      </div>
    </Link>
  );
}

export default function TailorOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [items, setItems] = useState<Map<string, OrderItem[]>>(new Map());
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"" | OrderPriority>("");
  const [activeColumn, setActiveColumn] = useState<ColumnKey>("new");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await listOrders({
        role: "tailor",
        includeUnassigned: true,
        search: search.trim() || undefined,
        perPage: 200,
      });
      setOrders(result.items);
      setItems(await itemsByOrders(result.items.map((o) => o.id)));
      setError("");
    } catch {
      setError("Could not load orders. Please try again.");
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    const off = subscribe<Order>(COLLECTIONS.orders, () => void load());
    return () => off();
  }, [load]);

  const buckets = useMemo(() => {
    const map: Record<ColumnKey, Order[]> = {
      new: [],
      in_progress: [],
      ready: [],
      delivered: [],
    };
    for (const order of orders ?? []) {
      if (priority && order.priority !== priority) continue;
      const col = columnOf(order);
      if (col) map[col].push(order);
    }
    return map;
  }, [orders, priority]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Accept new requests and move orders through each production stage."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search order number or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "" | OrderPriority)}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            <option value="normal">Normal</option>
            <option value="express">Express</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
      </div>

      {/* Mobile: segmented tabs */}
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1 lg:hidden">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => setActiveColumn(col.key)}
            className={`rounded-lg px-1 py-1.5 text-xs font-medium transition-colors ${
              activeColumn === col.key
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {col.title}
            <span className="ml-1 text-neutral-400">
              {buckets[col.key].length}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState title="Something went wrong" description={error} />
      ) : orders === null ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`${
                activeColumn === col.key ? "block" : "hidden"
              } lg:block`}
            >
              <div className="mb-2 hidden items-center justify-between px-1 lg:flex">
                <h2 className="text-sm font-semibold text-neutral-700">
                  {col.title}
                </h2>
                <span className="text-xs font-medium text-neutral-400">
                  {buckets[col.key].length}
                </span>
              </div>
              <div className="flex flex-col gap-3 rounded-xl bg-neutral-100/70 p-2">
                {buckets[col.key].length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-400">
                    Nothing here
                  </p>
                ) : (
                  buckets[col.key].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      items={items.get(order.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
