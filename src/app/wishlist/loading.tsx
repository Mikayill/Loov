function CardGhost() {
  return (
    <div>
      {/* Image well — aspect-square rounded-control, matches ProductCard */}
      <div className="aspect-square rounded-control u-skeleton" />
      {/* Info block — typographic, no card chrome (matches ProductCard) */}
      <div className="pt-3 pb-1 px-1 space-y-1.5">
        <div className="h-2.5 w-16 rounded-control u-skeleton" />
        <div className="h-3.5 w-full rounded-control u-skeleton" />
        <div className="h-3.5 w-2/3 rounded-control u-skeleton" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-12 rounded-control u-skeleton" />
          <div className="w-9 h-9 rounded-full u-skeleton flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

// Must match WishlistClient's real grid (ProductCard cells, gap-x-4 gap-y-6
// sm:gap-x-5 sm:gap-y-8) — see the note in account/orders/loading.tsx.
export default function WishlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <div className="h-8 w-36 rounded-control u-skeleton mb-2" />
          <div className="h-3.5 w-28 rounded-control u-skeleton" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-control u-skeleton" />
          <div className="h-8 w-36 rounded-control u-skeleton hidden sm:block" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardGhost key={i} />
        ))}
      </div>
    </div>
  );
}
