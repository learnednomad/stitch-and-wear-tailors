"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { listMine, markAllRead, markRead } from "@/lib/api/notifications";
import { subscribe } from "@/lib/api/realtime";
import { useAuth } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { COLLECTIONS, pbErrorMessage } from "@/lib/pb";
import type { AppNotification } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [notifications, setNotifications] = useState<AppNotification[] | null>(
    null
  );
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    listMine(1, 100)
      .then((r) => setNotifications(r.items))
      .catch((err) => toast.show(pbErrorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  // Realtime: prepend new notifications, patch updated ones.
  // (The shell badge has its own subscription — this only feeds the page list.)
  useEffect(() => {
    if (!user) return;
    const off = subscribe<AppNotification>(
      COLLECTIONS.notifications,
      (e) => {
        if (e.action === "create") {
          setNotifications((prev) =>
            prev && !prev.some((n) => n.id === e.record.id)
              ? [e.record, ...prev]
              : prev
          );
        } else if (e.action === "update") {
          setNotifications((prev) =>
            prev ? prev.map((n) => (n.id === e.record.id ? e.record : n)) : prev
          );
        } else if (e.action === "delete") {
          setNotifications((prev) =>
            prev ? prev.filter((n) => n.id !== e.record.id) : prev
          );
        }
      },
      { filter: `user = "${user.id}"` }
    );
    return off;
  }, [user]);

  async function handleClick(n: AppNotification) {
    if (!n.isRead) {
      setNotifications((prev) =>
        prev
          ? prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
          : prev
      );
      markRead(n.id).catch(() => {});
    }
    const orderId = (n.data as { orderId?: string } | null)?.orderId;
    if (orderId) router.push(`/app/orders/${orderId}`);
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) =>
        prev ? prev.map((n) => ({ ...n, isRead: true })) : prev
      );
      toast.show("All notifications marked as read.", "success");
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const today = notifications?.filter((n) => isToday(n.created)) ?? [];
  const earlier = notifications?.filter((n) => !isToday(n.created)) ?? [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay on top of order updates, payments and appointments."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={markingAll}
              onClick={handleMarkAll}
            >
              Mark all read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      {!notifications ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Order updates, payment confirmations and appointment changes will show up here."
        />
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <NotificationSection title="Today" items={today} onClick={handleClick} />
          )}
          {earlier.length > 0 && (
            <NotificationSection
              title="Earlier"
              items={earlier}
              onClick={handleClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NotificationSection({
  title,
  items,
  onClick,
}: {
  title: string;
  items: AppNotification[];
  onClick: (n: AppNotification) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <Card flush>
        <ul className="divide-y divide-neutral-100">
          {items.map((n) => {
            const hasOrder = !!(n.data as { orderId?: string } | null)?.orderId;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onClick(n)}
                  className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 sm:px-6 ${
                    n.isRead ? "" : "bg-brand-50/40"
                  }`}
                >
                  <span
                    aria-label={n.isRead ? undefined : "Unread"}
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      n.isRead ? "bg-transparent" : "bg-brand-600"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${
                        n.isRead
                          ? "font-normal text-neutral-700"
                          : "font-semibold text-neutral-900"
                      }`}
                    >
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block text-sm text-neutral-500">
                        {n.body}
                      </span>
                    )}
                    <span
                      className="mt-1 block text-xs text-neutral-400"
                      title={formatDateTime(n.created)}
                    >
                      {relativeTime(n.created)}
                      {hasOrder && " · View order →"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
