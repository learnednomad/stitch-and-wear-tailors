"use client";

import { useEffect, useMemo, useState } from "react";
import {
  confirmedPaymentsForTailor,
  garmentType,
  itemsByOrders,
  paymentDate,
  reviewsForTailor,
} from "@/components/tailor/data";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { listOrders } from "@/lib/api/orders";
import { formatDate, formatNaira } from "@/lib/format";
import type { Order, OrderItem, Payment, Review } from "@/lib/types";

type PeriodKey = "week" | "month" | "3mo" | "year";

const PERIODS: Array<{ key: PeriodKey; label: string; days: number }> = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "3mo", label: "3 months", days: 90 },
  { key: "year", label: "Year", days: 365 },
];

interface Bucket {
  label: string;
  start: Date;
  end: Date;
  total: number;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Time buckets covering the period, sized to the period length. */
function makeBuckets(period: PeriodKey, from: Date, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay(new Date(now.getTime() - i * 86400000));
      const end = new Date(start.getTime() + 86400000);
      buckets.push({
        label: start.toLocaleDateString("en-NG", { weekday: "short" }),
        start,
        end,
        total: 0,
      });
    }
  } else if (period === "month") {
    for (let i = 0; i < 5; i++) {
      const start = new Date(from.getTime() + i * 7 * 86400000);
      if (start > now) break;
      const end = new Date(start.getTime() + 7 * 86400000);
      buckets.push({
        label: start.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        }),
        start,
        end,
        total: 0,
      });
    }
  } else {
    const months = period === "3mo" ? 3 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        label: start.toLocaleDateString("en-NG", { month: "short" }),
        start,
        end,
        total: 0,
      });
    }
  }
  return buckets;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-accent-500">
      {"★".repeat(Math.round(rating))}
      <span className="text-neutral-300">
        {"★".repeat(5 - Math.round(rating))}
      </span>
    </span>
  );
}

export default function TailorAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [items, setItems] = useState<Map<string, OrderItem[]>>(new Map());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [orderList, pays, revs] = await Promise.all([
          listOrders({ role: "tailor", perPage: 200 }),
          confirmedPaymentsForTailor(),
          reviewsForTailor(),
        ]);
        setOrders(orderList.items);
        setPayments(pays);
        setReviews(revs);
        setItems(await itemsByOrders(orderList.items.map((o) => o.id)));
      } catch {
        setError("Could not load analytics. Please try again.");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!orders) return null;
    const now = new Date();
    const days = PERIODS.find((p) => p.key === period)!.days;
    const from = startOfDay(new Date(now.getTime() - (days - 1) * 86400000));

    const received = orders.filter((o) => new Date(o.created) >= from);
    const completed = orders.filter(
      (o) => o.completedAt && new Date(o.completedAt) >= from
    );
    const periodPayments = payments.filter((p) => paymentDate(p) >= from);
    const revenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgOrderValue =
      received.length > 0
        ? received.reduce((sum, o) => sum + o.totalAmount, 0) / received.length
        : 0;

    const turnarounds = completed
      .filter((o) => o.acceptedAt)
      .map(
        (o) =>
          (new Date(o.completedAt).getTime() -
            new Date(o.acceptedAt).getTime()) /
          86400000
      );
    const avgCompletionDays =
      turnarounds.length > 0
        ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
        : null;

    const buckets = makeBuckets(period, from, now);
    for (const p of periodPayments) {
      const d = paymentDate(p);
      const bucket = buckets.find((b) => d >= b.start && d < b.end);
      if (bucket) bucket.total += p.amount;
    }

    const typeCounts = new Map<string, number>();
    for (const order of received) {
      for (const item of items.get(order.id) ?? []) {
        const type = garmentType(item).replace(/_/g, " ");
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + (item.quantity || 1));
      }
    }
    const garments = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      received: received.length,
      completed: completed.length,
      revenue,
      avgOrderValue,
      avgCompletionDays,
      buckets,
      garments,
    };
  }, [orders, payments, items, period]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  if (error) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <EmptyState title="Something went wrong" description={error} />
      </div>
    );
  }

  if (!orders || !stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const maxBucket = Math.max(...stats.buckets.map((b) => b.total), 1);
  const maxGarment = Math.max(...stats.garments.map(([, n]) => n), 1);

  const tiles = [
    { label: "Orders received", value: String(stats.received) },
    { label: "Completed", value: String(stats.completed) },
    { label: "Revenue", value: formatNaira(stats.revenue) },
    {
      label: "Avg order value",
      value: stats.avgOrderValue ? formatNaira(Math.round(stats.avgOrderValue)) : "—",
    },
    {
      label: "Avg completion",
      value:
        stats.avgCompletionDays !== null
          ? `${stats.avgCompletionDays.toFixed(1)} days`
          : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue, turnaround times and order trends for your business."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              period === p.key
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-neutral-500">{tile.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-neutral-900">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Revenue"
          description="Confirmed payments received in the period."
        >
          {stats.revenue === 0 ? (
            <EmptyState
              title="No revenue in this period"
              description="Confirmed payments will chart here."
            />
          ) : (
            <div className="flex h-48 items-end gap-2">
              {stats.buckets.map((b, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${b.label}: ${formatNaira(b.total)}`}
                >
                  {b.total > 0 && (
                    <span className="text-[10px] font-medium text-neutral-500">
                      {b.total >= 1000
                        ? `₦${Math.round(b.total / 1000)}k`
                        : `₦${b.total}`}
                    </span>
                  )}
                  <div
                    className="w-full max-w-12 rounded-t-md bg-brand-600"
                    style={{
                      height: `${Math.max((b.total / maxBucket) * 100, b.total > 0 ? 4 : 1)}%`,
                    }}
                  />
                  <span className="text-[10px] text-neutral-400">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Popular garment types">
            {stats.garments.length === 0 ? (
              <EmptyState
                title="No orders in this period"
                description="Garment types from your orders will rank here."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {stats.garments.slice(0, 6).map(([type, count]) => (
                  <li key={type}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize text-neutral-700">
                        {type}
                      </span>
                      <span className="font-medium text-neutral-900">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-2 rounded-full bg-accent-400"
                        style={{ width: `${(count / maxGarment) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Ratings">
            {avgRating === null ? (
              <EmptyState
                title="No reviews yet"
                description="Customer reviews of your work will appear here."
              />
            ) : (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl font-semibold text-neutral-900">
                    {avgRating.toFixed(1)}
                  </span>
                  <Stars rating={avgRating} />
                  <span className="text-sm text-neutral-500">
                    {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {reviews.slice(0, 3).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl bg-neutral-50 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-xs text-neutral-400">
                          {formatDate(r.created)}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-neutral-600">{r.comment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
