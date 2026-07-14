export default function ProductLoading() {
  return (
    <div className="min-h-[75vh] bg-[#090b09] px-4 py-10 text-[#f4eee4] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl animate-pulse gap-10 lg:grid-cols-2">
        <div className="aspect-[4/5] bg-white/[0.04]" />
        <div className="space-y-5 pt-8">
          <div className="h-3 w-32 bg-white/[0.06]" />
          <div className="h-12 w-3/4 bg-white/[0.06]" />
          <div className="h-8 w-40 bg-white/[0.06]" />
          <div className="h-32 bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
