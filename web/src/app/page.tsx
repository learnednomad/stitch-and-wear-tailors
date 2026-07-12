import Link from "next/link";

const CATEGORIES = [
  "Agbada",
  "Senator",
  "Kaftan",
  "Ankara Gown",
  "Iro & Buba",
  "Dashiki",
  "Suits",
  "Shirts",
];

const VALUE_PROPS = [
  {
    title: "Verified Nigerian tailors",
    body: "Browse trusted tailors with real reviews, from Lagos to Abuja. Every profile is vetted before it goes live.",
  },
  {
    title: "Track every stitch",
    body: "Follow your order from measuring to cutting, sewing, finishing and delivery — with photos at each stage.",
  },
  {
    title: "Payments made simple",
    body: "Record deposits and balances in Naira, confirm transfers, and keep a clean paper trail for every order.",
  },
  {
    title: "Your measurements, saved",
    body: "Store your full measurement profile once and reuse it on every order — no more repeat tape sessions.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-brand-900"
          >
            Stitch<span className="text-accent-500">&amp;</span>Wear
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-950">
          <div
            aria-hidden
            className="absolute -right-32 -top-32 size-96 rounded-full bg-brand-700/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -left-24 size-96 rounded-full bg-accent-500/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
            <p className="mb-4 inline-flex items-center rounded-full border border-brand-400/40 bg-brand-900/60 px-3 py-1 text-xs font-medium tracking-wide text-brand-200">
              Custom tailoring, made in Nigeria
            </p>
            <h1 className="font-display max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Bespoke Nigerian tailoring,{" "}
              <span className="text-accent-400">delivered.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-brand-100/90">
              Order custom agbada, senator, ankara and more from verified
              tailors. Share your measurements once, approve the price, and
              track your garment stage by stage.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-accent-400"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-brand-300/40 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-900"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Garment categories strip */}
        <section className="border-b border-neutral-200 bg-neutral-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-6 sm:px-6">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-center text-3xl font-bold tracking-tight text-neutral-900">
            Made to measure, end to end
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-neutral-500">
            One place for customers and tailors to run the whole order —
            measurements, invoices, fittings and payments.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {VALUE_PROPS.map((v) => (
              <div
                key={v.title}
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-neutral-900">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-900">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">
              Ready for a perfect fit?
            </h2>
            <p className="max-w-md text-brand-100/90">
              Join as a customer to order your next outfit, or as a tailor to
              manage orders, invoices and clients in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-accent-400"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-brand-300/40 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:px-6">
          <span className="font-display font-semibold text-neutral-700">
            Stitch<span className="text-accent-500">&amp;</span>Wear Tailors
          </span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-neutral-800">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-neutral-800">
              Register
            </Link>
          </div>
          <span>© {new Date().getFullYear()} Stitch &amp; Wear Tailors</span>
        </div>
      </footer>
    </div>
  );
}
