"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { COLLECTIONS } from "@/lib/pb";
import { subscribe } from "@/lib/api/realtime";
import { unreadCount } from "@/lib/api/notifications";
import type { AppNotification, User } from "@/lib/types";
import { Icon, type IconName } from "@/components/shell/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface DashboardShellProps {
  /** "/app" or "/tailor" — used for active-link matching and the logo link. */
  basePath: string;
  nav: NavItem[];
  /** href of the notifications page inside this shell (gets the badge). */
  notificationsHref: string;
  settingsHref: string;
  user: User;
  children: ReactNode;
}

function isActive(pathname: string, basePath: string, href: string): boolean {
  if (href === basePath) return pathname === basePath;
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardShell({
  basePath,
  nav,
  notificationsHref,
  settingsHref,
  user,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Live unread notifications badge.
  useEffect(() => {
    let active = true;
    const load = () =>
      unreadCount()
        .then((n) => {
          if (active) setUnread(n);
        })
        .catch(() => {});
    load();
    const off = subscribe<AppNotification>(COLLECTIONS.notifications, load, {
      filter: `user = "${user.id}"`,
    });
    return () => {
      active = false;
      off();
    };
  }, [user.id]);

  // Close the user menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "?";

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  const showVerifyBanner = !user.verified && !bannerDismissed;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="flex h-16 items-center px-5">
          <Link
            href={basePath}
            className="font-display text-lg font-bold tracking-tight text-brand-900"
          >
            Stitch<span className="text-accent-500">&amp;</span>Wear
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {nav.map((item) => {
            const active = isActive(pathname, basePath, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.href === notificationsHref && unread > 0 && (
                  <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 p-3 text-xs text-neutral-400">
          Signed in as{" "}
          <span className="font-medium text-neutral-600">
            {user.firstName} {user.lastName}
          </span>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <Link
            href={basePath}
            className="font-display text-base font-bold tracking-tight text-brand-900 md:hidden"
          >
            Stitch<span className="text-accent-500">&amp;</span>Wear
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={notificationsHref}
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              className="relative rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            >
              <Icon name="notifications" className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex size-9 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {initials}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="border-b border-neutral-100 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href={settingsHref}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Profile &amp; settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Verify email banner */}
        {showVerifyBanner && (
          <div className="flex items-center justify-between gap-3 bg-accent-100 px-4 py-2.5 text-sm text-accent-700 sm:px-6">
            <p>
              Please verify your email address — check your inbox for the
              confirmation link.
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss verification reminder"
              className="rounded-lg p-1 hover:bg-accent-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white md:hidden"
      >
        {nav.slice(0, 5).map((item) => {
          const active = isActive(pathname, basePath, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-brand-800" : "text-neutral-500"
              }`}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
              {item.href === notificationsHref && unread > 0 && (
                <span className="absolute right-1/4 top-1 size-2 rounded-full bg-brand-700" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
