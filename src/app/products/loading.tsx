function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden animate-pulse">
      <div className="h-44 bg-[#EDE5D8]" />
      <div className="p-4 space-y-2.5">
        <div className="h-2.5 w-16 bg-[#EDE5D8] rounded-full" />
        <div className="h-4 w-full bg-[#EDE5D8] rounded-full" />
        <div className="h-4 w-3/4 bg-[#EDE5D8] rounded-full" />
        <div className="flex items-center justify-between mt-3">
          <div className="h-5 w-14 bg-[#EDE5D8] rounded-full" />
          <div className="h-5 w-16 bg-[#EDE5D8] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-3 w-32 bg-[#EDE5D8] rounded-full mb-3" />
        <div className="h-8 w-48 bg-[#EDE5D8] rounded-full mb-2" />
        <div className="h-3 w-36 bg-[#EDE5D8] rounded-full" />
      </div>

      {/* Filter pills skeleton */}
      <div className="flex gap-2 mb-6">
        {[100, 90, 80, 95, 85, 75, 88].map((w) => (
          <div
            key={w}
            className="h-9 rounded-full bg-[#EDE5D8] animate-pulse flex-shrink-0"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
