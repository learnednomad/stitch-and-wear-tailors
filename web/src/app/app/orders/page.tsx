"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ListResult } from "pocketbase";
import { listOrders } from "@/lib/api/orders";
import { subscribe } from "@/lib/api/realtime";
import { useAuth } from "@/lib/auth";
import { formatDate, formatNaira } from "@/lib/format";
import { COLLECTIONS, pbErrorMessage } from "@/lib/pb";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { firstItemsByOrder, garmentSummary } from "@/components/client/order-utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";

const STATUS_FILTERS: OrderStatus[] = [
  "pending",
  "accepted",
  "measuring",
  "cutting",
  "sewing",
  "finishing",
  "ready",
  "delivered",
  "cancelled",
];

const DATE_PRESETS = [
  { key: "all", label: "All time", days: 0 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
] as const;

const PAGE_SIZE = 20;

function dateFromForPreset(days: number): string | undefined {
  if (!days) return undefined;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ");
}

export default function OrdersPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [preset, setPreset] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [tick, setTick] = useState(0);

  const [result, setResult] = useState<ListResult<Order> | null>(null);
  const [firstItems, setFirstItems] = useState<Record<string, OrderItem>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Realtime: any change to this customer's orders re-runs the fetch.
  useEffect(() => {
    if (!user) return;
    const off = subscribe<Order>(
      COLLECTIONS.orders,
      () => setTick((t) => t + 1),
      { filter: `customer = "${user.id}"` }
    );
    return off;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const days = DATE_PRESETS.find((p) => p.key === preset)?.days ?? 0;
    listOrders({
      role: "customer",
      search: debouncedSearch || undefined,
      status: statuses.length > 0 ? statuses : undefined,
      dateFrom: dateFromForPreset(days),
      page: 1,
      perPage: limit,
    })
      .then(async (r) => {
        const items = await firstItemsByOrder(r.items);
        if (!active) return;
        setResult(r);
        setFirstItems(items);
      })
      .catch((err) => {
        if (active) toast.show(pbErrorMessage(err), "error");
      })
      .finally(() => {
        if (active) setLoadingMore(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debouncedSearch, statuses, preset, limit, tick]);

  function toggleStatus(status: OrderStatus) {
    setLimit(PAGE_SIZE);
    setStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  const orders = result?.items ?? [];
  const hasMore = !!result && result.totalItems > orders.length;
  const filtersActive =
    !!debouncedSearch || statuses.length > 0 || preset !== "all";

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track your custom garment orders from measurement to delivery."
        actions={
          <Link
            href="/app/orders/new"
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            New order
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-72">
            <Input
              type="search"
              placeholder="Search order number or instructions…"
              value={search}
              onChange={(e) => {
                setLimit(PAGE_SIZE);
                setSearch(e.target.value);
              }}
              aria-label="Search orders"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setLimit(PAGE_SIZE);
                  setPreset(p.key);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.key
                    ? "bg-brand-700 text-white"
                    : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => {
            const active = statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? "bg-brand-700 text-white"
                    : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {!result ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={filtersActive ? "No orders match your filters" : "No orders yet"}
          description={
            filtersActive
              ? "Try clearing the search or status filters."
              : "Start your first custom order from the catalog or the button above."
          }
          action={
            !filtersActive ? (
              <Link
                href="/app/orders/new"
                className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Start an order
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card flush>
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Garment</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/app/orders/${o.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {o.orderNumber || o.id}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-5 py-3.5 text-neutral-700">
                    {garmentSummary(o, firstItems[o.id])}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusChip kind="order" status={o.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-neutral-800">
                    {formatNaira(o.totalAmount || 0, o.currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-neutral-500">
                    {formatDate(o.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-neutral-100 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/app/orders/${o.id}`}
                  className="block px-5 py-4 hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-brand-700">
                      {o.orderNumber || o.id}
                    </span>
                    <StatusChip kind="order" status={o.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-700">
                    {garmentSummary(o, firstItems[o.id])}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatNaira(o.totalAmount || 0, o.currency)} ·{" "}
                    {formatDate(o.created)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center border-t border-neutral-100 p-4">
              <Button
                variant="secondary"
                size="sm"
                loading={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  setLimit((l) => l + PAGE_SIZE);
                }}
              >
                Load more ({orders.length} of {result.totalItems})
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
