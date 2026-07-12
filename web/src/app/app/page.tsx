"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listOrders } from "@/lib/api/orders";
import { listUpcoming } from "@/lib/api/appointments";
import { formatDateTime, formatNaira, relativeTime } from "@/lib/format";
import { ORDER_ACTIVE_STATUSES } from "@/lib/status";
import type { Appointment, Order } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";

interface HomeData {
  activeCount: number;
  outstanding: number;
  nextAppointment: Appointment | null;
  recentOrders: Order[];
}

export default function ClientHomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      listOrders({
        status: ORDER_ACTIVE_STATUSES,
        role: "customer",
        perPage: 100,
      }),
      listOrders({ role: "customer", perPage: 5 }),
      listUpcoming("customer", 1),
    ])
      .then(([activeOrders, recent, upcoming]) => {
        if (!active) return;
        setData({
          activeCount: activeOrders.totalItems,
          outstanding: activeOrders.items.reduce(
            (sum, o) => sum + (o.balanceAmount || 0),
            0
          ),
          nextAppointment: upcoming[0] ?? null,
          recentOrders: recent.items,
        });
      })
      .catch(() => {
        if (active) setError("Could not load your dashboard. Please refresh.");
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.firstName || "there"}`}
        description="Here's what's happening with your orders."
      />

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!data && !error ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-neutral-500">Active orders</p>
              <p className="font-display mt-1 text-3xl font-semibold text-neutral-900">
                {data.activeCount}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500">Outstanding balance</p>
              <p className="font-display mt-1 text-3xl font-semibold text-neutral-900">
                {formatNaira(data.outstanding)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500">Next appointment</p>
              {data.nextAppointment ? (
                <>
                  <p className="font-display mt-1 text-lg font-semibold capitalize text-neutral-900">
                    {data.nextAppointment.type}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {formatDateTime(data.nextAppointment.scheduledAt)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-400">
                  Nothing scheduled
                </p>
              )}
            </Card>
          </div>

          {/* Recent orders */}
          <Card
            title="Recent orders"
            actions={
              <Link
                href="/app/orders"
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                View all
              </Link>
            }
          >
            {data.recentOrders.length === 0 ? (
              <EmptyState
                title="No orders yet"
                description="When you place your first custom order it will show up here."
                action={
                  <Link
                    href="/app/catalog"
                    className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
                  >
                    Browse the catalog
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {data.recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {o.orderNumber || o.id}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {o.expand?.tailor
                          ? o.expand.tailor.businessName ||
                            `${o.expand.tailor.firstName} ${o.expand.tailor.lastName}`
                          : "Awaiting tailor"}{" "}
                        · {relativeTime(o.created)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-700">
                        {formatNaira(o.totalAmount || 0, o.currency)}
                      </span>
                      <StatusChip kind="order" status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
