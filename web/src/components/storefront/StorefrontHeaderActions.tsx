"use client";

import Link from "next/link";
import { homePathFor, useAuth } from "@/lib/auth";
import { useStorefrontCommerce } from "@/components/storefront/commerce/StorefrontProviders";
import styles from "./storefront.module.css";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.25 4.25" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1A5.5 5.5 0 0 0 3.1 12.6L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

export function StorefrontHeaderActions() {
  const { user } = useAuth();
  const { hydrated, cartCount, wishlist } = useStorefrontCommerce();
  const accountHref = user ? homePathFor(user) : "/login";

  return (
    <>
      <Link href="/marketplace" className={styles.iconLink} aria-label="Search the marketplace">
        <SearchIcon />
      </Link>
      <Link
        href="/wishlist"
        className={styles.iconLink}
        aria-label={`Wishlist${hydrated && wishlist.length ? ` (${wishlist.length} saved)` : ""}`}
      >
        <HeartIcon />
        {hydrated && wishlist.length > 0 && <span className={styles.iconBadge}>{wishlist.length > 9 ? "9+" : wishlist.length}</span>}
      </Link>
      <Link
        href="/cart"
        className={styles.iconLink}
        aria-label={`Shopping bag${hydrated && cartCount ? ` (${cartCount} items)` : ""}`}
      >
        <BagIcon />
        {hydrated && cartCount > 0 && <span className={styles.iconBadge}>{cartCount > 9 ? "9+" : cartCount}</span>}
      </Link>
      <Link href={accountHref} className={styles.accountLink}>
        {user ? "Account" : "Sign in"}
      </Link>
    </>
  );
}

export function StorefrontAccountMenuLink() {
  const { user } = useAuth();
  return <Link href={user ? homePathFor(user) : "/login"}>{user ? "My account" : "Sign in"}</Link>;
}
