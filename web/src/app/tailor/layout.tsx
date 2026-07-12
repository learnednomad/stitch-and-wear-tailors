"use client";

import type { ReactNode } from "react";
import { useRequireAuth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/shell/DashboardShell";
import { Spinner } from "@/components/ui/Spinner";

const NAV: NavItem[] = [
  { href: "/tailor", label: "Dashboard", icon: "home" },
  { href: "/tailor/orders", label: "Orders", icon: "orders" },
  { href: "/tailor/invoices", label: "Invoices", icon: "invoices" },
  { href: "/tailor/measurements", label: "Measurements", icon: "measurements" },
  { href: "/tailor/analytics", label: "Analytics", icon: "analytics" },
  {
    href: "/tailor/notifications",
    label: "Notifications",
    icon: "notifications",
  },
  { href: "/tailor/settings", label: "Settings", icon: "settings" },
];

export default function TailorShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, ready } = useRequireAuth("tailor");

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardShell
      basePath="/tailor"
      nav={NAV}
      notificationsHref="/tailor/notifications"
      settingsHref="/tailor/settings"
      user={user}
    >
      {children}
    </DashboardShell>
  );
}
