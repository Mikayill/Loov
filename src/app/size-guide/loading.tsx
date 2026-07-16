function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-control u-skeleton ${className}`} />;
}

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true" aria-label="Loading">
      {/* Header */}
      <div className="text-center mb-10">
        <Bar className="w-10 h-10 rounded-full mx-auto mb-3" />
        <Bar className="h-7 w-56 mx-auto mb-3" />
        <Bar className="h-3.5 w-72 mx-auto" />
      </div>

      {/* Tip banner */}
      <Bar className="h-16 w-full rounded-card mb-8" />

      {/* Clothing size chart — mobile cards */}
      <div className="sm:hidden space-y-2.5 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-canvas rounded-card border border-line p-4">
            <div className="flex items-center justify-between mb-2.5">
              <Bar className="h-4 w-20" />
              <Bar className="h-3 w-14" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((c) => (
                <Bar key={c} className="h-11 rounded-control" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Clothing size chart — desktop table */}
      <Bar className="hidden sm:block h-64 w-full rounded-card mb-10" />

      {/* Blankets + towels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <Bar className="h-40 w-full rounded-card" />
        <Bar className="h-40 w-full rounded-card" />
      </div>

      {/* How to measure */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <Bar key={i} className="h-24 rounded-card" />
        ))}
      </div>

      {/* TOG guide */}
      <Bar className="h-48 w-full rounded-card" />
    </div>
  );
}
