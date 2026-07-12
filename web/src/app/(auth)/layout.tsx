import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <Link
        href="/"
        className="font-display mb-8 text-xl font-bold tracking-tight text-brand-900"
      >
        Stitch<span className="text-accent-500">&amp;</span>Wear
      </Link>
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
      <p className="mt-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} Stitch &amp; Wear Tailors
      </p>
    </div>
  );
}
