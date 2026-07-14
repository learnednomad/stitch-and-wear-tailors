import Link from "next/link";
import type { ReactNode } from "react";

export const luxuryInputClass =
  "w-full rounded-sm border border-white/15 bg-[#101210] px-3.5 py-3 text-sm text-[#f7f1e7] outline-none placeholder:text-[#8c887f] focus:border-[#c89b52] focus:ring-1 focus:ring-[#c89b52]";

export const luxuryLabelClass =
  "mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#c9bdab]";

export const goldButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm bg-[#b8873e] px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#0d0f0d] transition hover:bg-[#d4aa68] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-50";

export const outlineButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm border border-[#8f6d39] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#e4c995] transition hover:bg-[#b8873e]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-50";

export function CommercePage({
  eyebrow,
  title,
  description,
  children,
  width = "max-w-7xl",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-[70vh] bg-[#090b09] text-[#f4eee4]">
      <div className={`mx-auto ${width} px-4 py-10 sm:px-6 sm:py-14 lg:px-8`}>
        <header className="mb-9 border-b border-white/10 pb-7 text-center sm:mb-12">
          {eyebrow ? (
            <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#b8873e]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#aaa397]">
              {description}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function CommerceEmpty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <section className="mx-auto max-w-xl border border-white/10 bg-[#101210] px-6 py-14 text-center sm:px-10">
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-[#b8873e]/50 text-xl text-[#d4aa68]"
      >
        ◇
      </div>
      <h2 className="font-display text-2xl text-[#f7f1e7]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#9f998f]">
        {description}
      </p>
      <Link href={href} className={`${goldButtonClass} mt-7`}>
        {action}
      </Link>
    </section>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  return children ? (
    <p className="mt-1.5 text-xs text-red-300" role="alert">
      {children}
    </p>
  ) : null;
}
