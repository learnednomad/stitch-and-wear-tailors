import Link from "next/link";
import type { ReactNode } from "react";
import {
  StorefrontAccountMenuLink,
  StorefrontHeaderActions,
} from "./StorefrontHeaderActions";
import styles from "./storefront.module.css";

const PRIMARY_NAV = [
  { href: "/collections", label: "Collections" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/design", label: "Design your own" },
  { href: "/designers", label: "Designers" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Wordmark({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={styles.brand} aria-label="Stitch and Wear home">
      <span>
        Stitch <span className={styles.brandMark}>&amp;</span> Wear
      </span>
      {!footer && <span className={styles.brandSub}>Tailors &amp; marketplace</span>}
    </Link>
  );
}

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.storefront}>
      <a href="#storefront-content" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.announcement}>
        Complimentary delivery across Nigeria on orders over ₦250,000
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Wordmark />
          <nav className={styles.desktopNav} aria-label="Primary navigation">
            {PRIMARY_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <StorefrontHeaderActions />
            <details className={styles.mobileMenu}>
              <summary aria-label="Open navigation menu">
                <MenuIcon />
              </summary>
              <nav className={styles.mobileMenuPanel} aria-label="Mobile navigation">
                {PRIMARY_NAV.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
                <Link href="/wishlist">Wishlist</Link>
                <Link href="/cart">Shopping bag</Link>
                <StorefrontAccountMenuLink />
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="storefront-content" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerIntro}>
            <Wordmark footer />
            <p>
              Connecting discerning clients with Nigeria&apos;s most thoughtful tailors,
              designers and textile stories.
            </p>
          </div>
          <div>
            <p className={styles.footerHeading}>Discover</p>
            <div className={styles.footerLinks}>
              <Link href="/collections">Collections</Link>
              <Link href="/marketplace">Marketplace</Link>
              <Link href="/designers">Our designers</Link>
              <Link href="/journal">Journal</Link>
            </div>
          </div>
          <div>
            <p className={styles.footerHeading}>Bespoke services</p>
            <div className={styles.footerLinks}>
              <Link href="/design">Design your own</Link>
              <Link href="/appointments">Book an appointment</Link>
              <Link href="/measurements-guide">Measurements guide</Link>
              <Link href="/app/orders">Track an order</Link>
            </div>
          </div>
          <div>
            <p className={styles.footerHeading}>Stitch &amp; Wear</p>
            <div className={styles.footerLinks}>
              <Link href="/about">About us</Link>
              <Link href="/register">Create an account</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/tailor">Tailor dashboard</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Stitch &amp; Wear Tailors</span>
          <span>Made in Nigeria · Delivered worldwide</span>
        </div>
      </footer>
    </div>
  );
}
