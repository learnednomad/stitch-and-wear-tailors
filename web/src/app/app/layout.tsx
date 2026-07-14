"use client";

import type { ReactNode } from "react";
import { useRequireAuth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/shell/DashboardShell";
import { Spinner } from "@/components/ui/Spinner";

const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/orders", label: "Orders", icon: "orders" },
  { href: "/app/catalog", label: "Catalog", icon: "catalog" },
  { href: "/app/payments", label: "Payments", icon: "payments" },
  { href: "/app/appointments", label: "Appointments", icon: "appointments" },
  { href: "/app/purchases", label: "Purchases", icon: "payments" },
  { href: "/app/notifications", label: "Notifications", icon: "notifications" },
  { href: "/app/settings", label: "Settings", icon: "settings" },
];

export default function ClientShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, ready } = useRequireAuth("client");

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardShell
      basePath="/app"
      nav={NAV}
      notificationsHref="/app/notifications"
      settingsHref="/app/settings"
      user={user}
    >
      {children}
    </DashboardShell>
  );
}
