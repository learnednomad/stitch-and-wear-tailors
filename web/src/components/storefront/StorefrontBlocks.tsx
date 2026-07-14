import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./storefront.module.css";

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className={styles.pageHero}>
      <div className={styles.pageHeroInner}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageDescription}>{description}</p>
      </div>
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionCopy}>{description}</p>}
      </div>
      {href && (
        <Link href={href} className={styles.textLink}>
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

export function CallToAction({
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className={styles.ctaBand}>
      <div className={styles.ctaInner}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className={styles.ctaActions}>
          <Link href={primaryHref} className={styles.buttonPrimary}>
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref} className={styles.buttonSecondary}>
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function StorefrontSection({ children, bordered = false, compact = false }: { children: ReactNode; bordered?: boolean; compact?: boolean }) {
  return (
    <section className={`${compact ? styles.sectionCompact : styles.section} ${bordered ? styles.sectionBorder : ""}`}>
      <div className={styles.container}>{children}</div>
    </section>
  );
}

