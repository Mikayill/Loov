export default function ProductDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-3 w-10 bg-panel rounded-full" />
        <div className="h-3 w-3 bg-panel rounded-full" />
        <div className="h-3 w-16 bg-panel rounded-full" />
        <div className="h-3 w-3 bg-panel rounded-full" />
        <div className="h-3 w-40 bg-panel rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="w-full aspect-square rounded-3xl bg-panel" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-card bg-panel" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div className="h-5 w-24 bg-panel rounded-full" />
          <div className="h-10 w-3/4 bg-panel rounded-control" />
          <div className="h-4 w-32 bg-panel rounded-full" />
          <div className="h-12 w-28 bg-panel rounded-control" />
          <div className="h-px bg-line" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-panel rounded-full" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-panel" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-panel rounded-full" />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-24 rounded-control bg-panel" />
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="h-12 w-32 rounded-control bg-panel" />
            <div className="flex-1 h-12 rounded-control bg-panel" />
          </div>
          <div className="h-12 rounded-control bg-panel" />
          <div className="h-32 rounded-card bg-panel" />
        </div>
      </div>
    </div>
  );
}
