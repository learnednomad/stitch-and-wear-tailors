import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b09] px-6 text-[#f5efe4]">
      <div className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#bd9154]">404</p>
        <h1 className="mt-5 font-display text-5xl font-semibold">This piece is not in the collection.</h1>
        <p className="mt-5 text-sm leading-7 text-[#aaa397]">
          The page may have moved, or the item is no longer available.
        </p>
        <Link
          href="/collections"
          className="mt-8 inline-flex border border-[#bd9154] bg-[#bd9154] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0b0b09] transition hover:bg-transparent hover:text-[#e2bc7f]"
        >
          Explore collections
        </Link>
      </div>
    </main>
  );
}
