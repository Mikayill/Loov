/**
 * Shared account-area loading skeleton — shimmer blocks on token surfaces
 * (`.u-skeleton`, matches both themes). `variant` shapes the blocks after the
 * real layout of the page that's loading, instead of one generic card list.
 */
type Variant = "generic" | "rewards" | "security" | "notifications" | "list";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-control u-skeleton ${className}`} />;
}

function RewardsGhost() {
  return (
    <>
      {/* Balance card */}
      <div className="rounded-card p-6 sm:p-8 mb-6 bg-panel u-skeleton h-[172px]" />
      {/* How-it-works 3-up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-canvas rounded-card border border-line p-5 h-28 u-skeleton" />
        ))}
      </div>
      {/* Tiers */}
      <div className="bg-canvas rounded-card border border-line p-6 mb-6">
        <Bar className="h-5 w-40 mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border-2 border-line p-5 h-36 u-skeleton" />
          ))}
        </div>
      </div>
      {/* History rows */}
      <div className="bg-canvas rounded-card border border-line p-6">
        <Bar className="h-5 w-32 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full u-skeleton flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bar className="h-3.5 w-1/3" />
                <Bar className="h-2.5 w-1/5" />
              </div>
              <Bar className="h-3.5 w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SecurityGhost() {
  return (
    <div className="space-y-6">
      {/* Sign-in method */}
      <div className="bg-canvas rounded-card border border-line p-6">
        <Bar className="h-4 w-32 mb-4" />
        <div className="flex items-center gap-3 bg-canvas rounded-control p-4">
          <div className="w-8 h-8 rounded-full u-skeleton flex-shrink-0" />
          <Bar className="h-3.5 w-40" />
        </div>
      </div>
      {/* Password field pairs */}
      <div className="bg-canvas rounded-card border border-line p-6 space-y-4">
        <Bar className="h-4 w-44 mb-1" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Bar className="h-3 w-28 mb-1.5" />
            <Bar className="h-10 w-full" />
          </div>
        ))}
        <Bar className="h-10 w-full" />
      </div>
      {/* 2FA card */}
      <div className="bg-canvas rounded-card border border-line p-6">
        <Bar className="h-4 w-36 mb-3" />
        <Bar className="h-3.5 w-3/4 mb-4" />
        <Bar className="h-9 w-40" />
      </div>
    </div>
  );
}

function NotificationsGhost() {
  return (
    <div>
      <Bar className="h-3 w-24 mb-3" />
      <div className="bg-canvas rounded-card border border-line divide-y divide-canvas mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-5 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full u-skeleton flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bar className="h-3.5 w-1/3" />
                <Bar className="h-2.5 w-2/3" />
              </div>
            </div>
            <div className="w-11 h-6 rounded-full u-skeleton flex-shrink-0" />
          </div>
        ))}
      </div>
      <Bar className="h-12 w-full rounded-card" />
    </div>
  );
}

function ListGhost({ rows, header }: { rows: number; header: boolean }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-canvas rounded-card border border-line overflow-hidden">
          {header && (
            <div className="flex items-center gap-6 p-5 border-b border-canvas bg-surface flex-wrap">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <Bar className="h-2.5 w-14" />
                  <Bar className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 p-5">
            <div className="w-14 h-14 rounded-control u-skeleton flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bar className="h-3.5 w-2/3" />
              <Bar className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GhostRows({
  rows = 4,
  variant = "generic",
  listHeader = true,
  className = "",
}: {
  rows?: number;
  variant?: Variant;
  /** "list" variant only — hide the order/return header bar for flatter cards (e.g. reviews). */
  listHeader?: boolean;
  className?: string;
}) {
  const maxWidth = variant === "rewards" || variant === "list" ? "max-w-4xl" : variant === "generic" ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 ${className}`} aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded-control u-skeleton mb-2" />
      <div className="h-4 w-56 rounded-control u-skeleton mb-8" />
      {variant === "rewards" && <RewardsGhost />}
      {variant === "security" && <SecurityGhost />}
      {variant === "notifications" && <NotificationsGhost />}
      {variant === "list" && <ListGhost rows={rows} header={listHeader} />}
      {variant === "generic" && (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-20 rounded-card border border-line u-skeleton" />
          ))}
        </div>
      )}
    </div>
  );
}
