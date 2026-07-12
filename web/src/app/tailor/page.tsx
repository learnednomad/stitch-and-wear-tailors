"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  confirmedPaymentsForTailor,
  customerName,
  paymentDate,
} from "@/components/tailor/data";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { listUpcoming } from "@/lib/api/appointments";
import { listOrders } from "@/lib/api/orders";
import { pendingClaims } from "@/lib/api/payments";
import { formatDateTime, formatNaira, relativeTime } from "@/lib/format";
import type { Appointment, Order } from "@/lib/types";

interface DashboardData {
  newRequests: number;
  inProgress: number;
  ready: number;
  revenueThisMonth: number;
  claimCount: number;
  recentOrders: Order[];
  appointments: Appointment[];
}

const IN_PROGRESS = ["accepted", "measuring", "cutting", "sewing", "finishing"];

export default function TailorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [orders, payments, claims, appointments] = await Promise.all([
        listOrders({ role: "tailor", includeUnassigned: true, perPage: 200 }),
        confirmedPaymentsForTailor(),
        pendingClaims(),
        listUpcoming("tailor", 5),
      ]);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const revenueThisMonth = payments
        .filter((p) => paymentDate(p) >= monthStart)
        .reduce((sum, p) => sum + p.amount, 0);

      setData({
        newRequests: orders.items.filter((o) => o.status === "pending").length,
        inProgress: orders.items.filter((o) => IN_PROGRESS.includes(o.status))
          .length,
        ready: orders.items.filter((o) => o.status === "ready").length,
        revenueThisMonth,
        claimCount: claims.length,
        recentOrders: orders.items.slice(0, 5),
        appointments,
      });
    } catch {
      setError("Could not load your dashboard. Please try again.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState title="Something went wrong" description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const tiles = [
    { label: "New requests", value: String(data.newRequests) },
    { label: "In progress", value: String(data.inProgress) },
    { label: "Ready for pickup", value: String(data.ready) },
    {
      label: "Revenue this month",
      value: formatNaira(data.revenueThisMonth),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your workload at a glance — orders, payments and upcoming fittings."
      />

      {data.claimCount > 0 && (
        <Link
          href="/tailor/invoices"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-700 hover:bg-accent-100"
        >
          <span>
            <span className="font-semibold">
              {data.claimCount} payment claim{data.claimCount === 1 ? "" : "s"}
            </span>{" "}
            awaiting your confirmation.
          </span>
          <span className="font-medium">Review →</span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="text-sm text-neutral-500">{tile.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-neutral-900">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Recent orders"
          className="lg:col-span-2"
          actions={
            <Link
              href="/tailor/orders"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="New requests from customers will show up here."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/tailor/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {order.orderNumber}
                        <span className="ml-2 font-normal text-neutral-500">
                          {customerName(order)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {relativeTime(order.created)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium text-neutral-700">
                        {formatNaira(order.totalAmount, order.currency)}
                      </span>
                      <StatusChip kind="order" status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming appointments">
          {data.appointments.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Confirmed fittings and pickups will appear here."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.appointments.map((appt) => (
                <li key={appt.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize text-neutral-900">
                      {appt.type.replace(/_/g, " ")}
                    </p>
                    <StatusChip kind="appointment" status={appt.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatDateTime(appt.scheduledAt)}
                    {appt.location ? ` · ${appt.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
