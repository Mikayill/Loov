import type { CSSProperties } from "react";

function Bar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`rounded-control u-skeleton ${className}`} style={style} />;
}

/** Matches the real card shape exactly: outer bg-canvas/border wrapper
 *  (CategoryFilter.tsx's grid) around a borderless aspect-square image well
 *  (ProductCard.tsx) — the old skeleton used a fixed h-44 image + its own
 *  bg-white/overflow-hidden card, which didn't match either. */
function SkeletonCard() {
  return (
    <div className="bg-canvas border border-line rounded-card p-2.5 sm:p-3">
      <Bar className="aspect-square w-full rounded-control mb-2.5" />
      <Bar className="h-2.5 w-14 rounded-full mb-2" />
      <Bar className="h-3.5 w-full rounded-full mb-1.5" />
      <Bar className="h-3.5 w-2/3 rounded-full mb-2.5" />
      <div className="flex items-center justify-between">
        <Bar className="h-4 w-12 rounded-full" />
        <Bar className="h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header — Loov / breadcrumb line, title, count line, desktop trust badges */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bar className="h-2.5 w-10 rounded-full" />
          <Bar className="h-2.5 w-16 rounded-full" />
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <Bar className="h-8 w-40 rounded-full mb-2" />
            <Bar className="h-3 w-48 rounded-full" />
          </div>
          <div className="hidden sm:flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <Bar key={i} className="h-8 w-24 rounded-control" />
            ))}
          </div>
        </div>
      </div>

      {/* Category pills + sort/view-toggle row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-2 flex-1">
          {[76, 92, 84, 96, 80, 88, 78].map((w) => (
            <Bar key={w} className="h-9 rounded-control flex-shrink-0" style={{ width: `${w}px` }} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Bar className="h-9 w-28 rounded-control" />
          <Bar className="h-9 w-20 rounded-control" />
        </div>
      </div>

      {/* Advanced filter chip row — desktop only, matches CategoryFilter's
          "always visible on sm+" advanced panel */}
      <div className="hidden sm:flex flex-wrap items-center gap-3 mb-4 py-3 px-4 bg-panel/60 rounded-card border border-line">
        {[1, 2, 3].map((group) => (
          <div key={group} className="flex items-center gap-2">
            <Bar className="h-2.5 w-10 rounded-full" />
            {[1, 2, 3].map((i) => (
              <Bar key={i} className="h-7 w-14 rounded-control" />
            ))}
          </div>
        ))}
      </div>

      {/* Result count line */}
      <Bar className="h-3 w-32 rounded-full mb-5" />

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
