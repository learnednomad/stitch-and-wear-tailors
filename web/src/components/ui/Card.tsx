import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  description?: string;
  /** Rendered on the right of the title row. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Remove the default padding (e.g. for tables/lists). */
  flush?: boolean;
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  flush = false,
}: CardProps) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${
        flush ? "" : "p-5 sm:p-6"
      } ${className}`}
    >
      {(title || actions) && (
        <div
          className={`flex items-start justify-between gap-3 ${
            flush ? "p-5 pb-0 sm:p-6 sm:pb-0" : ""
          } ${children ? "mb-4" : ""}`}
        >
          <div>
            {title && (
              <h2 className="font-display text-base font-semibold text-neutral-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
