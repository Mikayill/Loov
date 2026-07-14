export default function WishlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-36 bg-line rounded-control mb-2" />
          <div className="h-4 w-20 bg-panel rounded-lg" />
        </div>
        <div className="h-5 w-36 bg-panel rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="h-40 bg-panel" />
            <div className="p-3.5 space-y-2">
              <div className="h-3 w-16 bg-panel rounded" />
              <div className="h-4 w-full bg-line rounded" />
              <div className="h-4 w-2/3 bg-line rounded" />
              <div className="h-5 w-12 bg-line rounded mt-1" />
              <div className="h-9 bg-sage rounded-control mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
