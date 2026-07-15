/**
 * Shared account-area loading skeleton — shimmer rows on token surfaces
 * (replaces the old spinning circle so route transitions and client loading
 * states match the site's `.u-skeleton` shimmer in both themes).
 */
export default function GhostRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 ${className}`} aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded-control u-skeleton mb-2" />
      <div className="h-4 w-56 rounded-control u-skeleton mb-8" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-20 rounded-card border border-line u-skeleton" />
        ))}
      </div>
    </div>
  );
}
