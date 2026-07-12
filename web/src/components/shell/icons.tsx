/** Minimal inline icon set for navigation (24px stroke icons). */

export type IconName =
  | "home"
  | "orders"
  | "catalog"
  | "payments"
  | "appointments"
  | "notifications"
  | "settings"
  | "invoices"
  | "measurements"
  | "analytics";

const paths: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  orders:
    "M9 3h6l1 3h4v15H4V6h4l1-3zM8 11l2.5 2.5L16 8",
  catalog:
    "M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5zm9-2h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5V3z",
  payments:
    "M3 7h18v10H3V7zm0 4h18M7 14h3",
  appointments:
    "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM12 12v4m-2-2h4",
  notifications:
    "M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6zm4 9a2 2 0 0 0 4 0",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z",
  invoices:
    "M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 6h6m-6 4h6",
  measurements:
    "M3 8h18v8H3V8zm4 0v3m4-3v5m4-5v3m4-3v5",
  analytics: "M4 20V10m6 10V4m6 16v-7m4 7H2",
};

export function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
