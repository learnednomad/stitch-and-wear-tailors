import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Usually a Button or Link. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-12 text-center ${className}`}
    >
      {icon && <div className="mb-1 text-neutral-400">{icon}</div>}
      <h3 className="font-display text-base font-semibold text-neutral-800">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
