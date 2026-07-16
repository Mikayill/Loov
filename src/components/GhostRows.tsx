/**
 * Account-area loading skeletons — one shape per real page, built by reading
 * that page's actual JSX (container width, header pattern, card layout,
 * responsive breakpoints) rather than one generic block reused everywhere.
 * Mobile is the primary target (most shoppers are on phones): every variant
 * below mirrors its real page's mobile behavior exactly — same container,
 * same breakpoint where a grid collapses to one column, same header pattern.
 */
type Variant =
  | "generic"
  | "account"
  | "rewards"
  | "security"
  | "notifications"
  | "list"
  | "addresses"
  | "orderDetail"
  | "returnRequest";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-control u-skeleton ${className}`} />;
}
function Circle({ className = "" }: { className?: string }) {
  return <div className={`rounded-full u-skeleton ${className}`} />;
}
function Card({ className = "" }: { className?: string }) {
  return <div className={`bg-canvas rounded-card border border-line u-skeleton ${className}`} />;
}

/* ── Shared header patterns (copied 1:1 from the real pages' markup) ── */

/** Small "‹ My Account" link above the title — Rewards & Returns use this. */
function BackLink() {
  return (
    <div className="inline-flex items-center gap-1.5 mb-5">
      <Bar className="w-3.5 h-3.5" />
      <Bar className="h-3 w-24" />
    </div>
  );
}

/** Home › My Account › Page breadcrumb trail — Orders/Reviews/Addresses/
 *  Security/Notifications/OrderDetail/ReturnRequest all open with this. */
function Breadcrumb({ crumbs = 3 }: { crumbs?: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: crumbs }).map((_, i) => (
        <Bar key={i} className={`h-3 ${i === crumbs - 1 ? "w-28" : "w-14"}`} />
      ))}
    </div>
  );
}

/** Title (left) + "‹ Back to account" link (right) — the row shared by
 *  Orders/Security/Notifications/Addresses/OrderDetail below their breadcrumb. */
function TitleRow() {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
      <div>
        <Bar className="h-6 w-40 mb-2" />
        <Bar className="h-3.5 w-52" />
      </div>
      <Bar className="h-3.5 w-28 hidden sm:block" />
    </div>
  );
}

/* ══════════════════════ /account ══════════════════════ */
function AccountGhost() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Identity header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-line mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Circle className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0" />
          <div className="min-w-0">
            <Bar className="h-5 w-32 mb-2" />
            <Bar className="h-3 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Bar className="h-9 w-24 hidden sm:block" />
          <Bar className="h-9 w-20" />
        </div>
      </div>

      {/* Stat cards — always 3 cols, even on mobile (matches the real page) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-canvas border border-line rounded-card px-3 py-4 sm:px-4 sm:py-5">
            <Bar className="h-4 w-4 mb-2" />
            <Bar className="h-5 w-10 mb-1.5" />
            <Bar className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* Baby info card */}
      <div className="border border-line rounded-card p-4 sm:p-5 mb-5">
        <Bar className="h-2.5 w-24 mb-3" />
        <div className="flex items-center gap-3">
          <Circle className="w-10 h-10 flex-shrink-0" />
          <Bar className="h-3.5 w-24" />
        </div>
      </div>

      {/* Two grouped menu lists */}
      <div className="space-y-5">
        {[4, 4].map((rows, g) => (
          <div key={g}>
            <Bar className="h-2.5 w-24 mb-2 ml-1" />
            <div className="border border-line rounded-card overflow-hidden divide-y divide-line">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-control u-skeleton flex-shrink-0" />
                    <div>
                      <Bar className="h-3.5 w-28 mb-1.5" />
                      <Bar className="h-2.5 w-36" />
                    </div>
                  </div>
                  <Bar className="h-3 w-3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════ /account/rewards ══════════════════════ */
function RewardsGhost() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <BackLink />
      <div className="flex items-center gap-3 mb-8">
        <Circle className="w-8 h-8 flex-shrink-0" />
        <div>
          <Bar className="h-6 w-36 mb-2" />
          <Bar className="h-3.5 w-48" />
        </div>
      </div>

      {/* Balance card — fixed dark-pine surface in the real page */}
      <div className="rounded-card p-6 sm:p-8 mb-6 bg-panel u-skeleton h-[168px] sm:h-[172px]" />

      {/* How-it-works — 1 col on mobile, 3 on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-canvas rounded-card border border-line p-5 h-28 u-skeleton" />
        ))}
      </div>

      {/* Tiers — 1 col on mobile, 3 on sm+ */}
      <div className="bg-canvas rounded-card border border-line p-6 mb-6">
        <Bar className="h-4 w-32 mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border-2 border-line p-5 h-36 u-skeleton" />
          ))}
        </div>
      </div>

      {/* History rows */}
      <div className="bg-canvas rounded-card border border-line p-6">
        <Bar className="h-4 w-32 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Circle className="w-9 h-9 flex-shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Bar className="h-3.5 w-1/3" />
                <Bar className="h-2.5 w-1/5" />
              </div>
              <Bar className="h-3.5 w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ /account/security ══════════════════════ */
function SecurityGhost() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Breadcrumb />
      <TitleRow />
      <div className="space-y-6">
        {/* Sign-in method */}
        <div className="bg-canvas rounded-card border border-line p-6">
          <Bar className="h-4 w-32 mb-4" />
          <div className="flex items-center gap-3 bg-canvas rounded-control p-4">
            <Circle className="w-8 h-8 flex-shrink-0" />
            <Bar className="h-3.5 w-40" />
          </div>
        </div>
        {/* Password field pairs */}
        <div className="bg-canvas rounded-card border border-line p-6 space-y-4">
          <Bar className="h-4 w-44 mb-1" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Bar className="h-3 w-28 mb-1.5" />
              <Bar className="h-10 w-full" />
            </div>
          ))}
          <Bar className="h-10 w-full" />
        </div>
        {/* Verification card */}
        <div className="bg-canvas rounded-card border border-line p-6">
          <Bar className="h-4 w-28 mb-3" />
          <Bar className="h-3.5 w-3/4" />
        </div>
        {/* 2FA card */}
        <div className="bg-canvas rounded-card border border-line p-6">
          <Bar className="h-4 w-36 mb-3" />
          <Bar className="h-3.5 w-3/4 mb-4" />
          <Bar className="h-9 w-40" />
        </div>
        {/* Danger zone */}
        <div className="bg-canvas rounded-card border-2 border-danger/25 p-6">
          <Bar className="h-4 w-32 mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <Bar className="h-3.5 w-32 mb-1.5" />
              <Bar className="h-2.5 w-44" />
            </div>
            <Bar className="h-8 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ /account/notifications ══════════════════════ */
function NotificationsGhost() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Breadcrumb />
      <TitleRow />
      <div className="mb-2">
        <Bar className="h-2.5 w-24 mb-3" />
        <div className="bg-canvas rounded-card border border-line divide-y divide-canvas">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-5 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 text-center flex-shrink-0"><Circle className="w-6 h-6 mx-auto" /></div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Bar className="h-3.5 w-1/3" />
                  <Bar className="h-2.5 w-2/3" />
                </div>
              </div>
              <div className="w-11 h-6 rounded-full u-skeleton flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 mb-8">
        <Bar className="h-2.5 w-20 mb-3" />
        <div className="bg-canvas rounded-card border border-line p-5 flex items-center gap-4">
          <div className="w-8 text-center flex-shrink-0"><Circle className="w-6 h-6 mx-auto" /></div>
          <div className="flex-1 space-y-1.5"><Bar className="h-3.5 w-1/3" /><Bar className="h-2.5 w-2/3" /></div>
          <div className="w-11 h-6 rounded-full u-skeleton flex-shrink-0" />
        </div>
      </div>
      <Bar className="h-12 w-full rounded-card" />
    </div>
  );
}

/* ══════════ shared order/return/review "card list" body ══════════ */

/** One order card: stat-pair header row + status pill, then item rows,
 *  then a footer row — matches OrdersClient exactly. */
function OrderCardGhost() {
  return (
    <div className="bg-canvas rounded-card border border-line overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-canvas flex-wrap gap-4 bg-surface">
        <div className="flex items-center gap-6 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Bar className="h-2 w-14 mb-1.5" />
              <Bar className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        <Bar className="h-6 w-20 rounded-full" />
      </div>
      <div className="divide-y divide-canvas">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 rounded-control u-skeleton flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Bar className="h-3.5 w-2/3" />
              <Bar className="h-2.5 w-1/3" />
            </div>
            <Bar className="h-3.5 w-12 flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="px-5 py-4 bg-[#F8F7F5] flex items-center justify-between flex-wrap gap-3">
        <Bar className="h-2.5 w-32" />
        <Bar className="h-7 w-24" />
      </div>
    </div>
  );
}

/** One return card: header (return# + date/order + status pill), product
 *  rows, footer (reason + refund) — matches ReturnsClient exactly. */
function ReturnCardGhost() {
  return (
    <div className="bg-canvas rounded-card border border-line overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-line bg-panel">
        <div>
          <Bar className="h-3.5 w-28 mb-1.5" />
          <Bar className="h-2.5 w-40" />
        </div>
        <Bar className="h-6 w-24 rounded-control" />
      </div>
      <div className="divide-y divide-line">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="w-14 h-14 rounded-control u-skeleton flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Bar className="h-3.5 w-1/2" />
            <Bar className="h-2.5 w-1/3" />
          </div>
        </div>
      </div>
      <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <Bar className="h-2.5 w-28" />
        <div className="text-right"><Bar className="h-2.5 w-16 mb-1.5 ml-auto" /><Bar className="h-4 w-14 ml-auto" /></div>
      </div>
    </div>
  );
}

/** One review card: photo + name/date row + action buttons, stars, body
 *  text — matches MyReviewsClient exactly (no header bar, unlike orders). */
function ReviewCardGhost() {
  return (
    <div className="bg-canvas rounded-card border border-line p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-control u-skeleton flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
            <div>
              <Bar className="h-3.5 w-32 mb-1.5" />
              <Bar className="h-2.5 w-24" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Bar className="h-6 w-14" />
              <Bar className="h-6 w-14" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => <Circle key={i} className="w-3.5 h-3.5" />)}
          </div>
          <Bar className="h-3 w-full mb-1.5" />
          <Bar className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function ListGhost({ rows, kind }: { rows: number; kind: "orders" | "returns" | "reviews" }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) =>
        kind === "orders" ? <OrderCardGhost key={i} /> : kind === "returns" ? <ReturnCardGhost key={i} /> : <ReviewCardGhost key={i} />
      )}
    </div>
  );
}

/* ══════════════════════ /account/addresses ══════════════════════ */
function AddressesGhost() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Breadcrumb />
      <TitleRow />
      <div className="space-y-4 mb-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-canvas rounded-card border-2 border-line p-5">
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-5 h-5" />
              <Bar className="h-3.5 w-20" />
            </div>
            <div className="space-y-1.5">
              <Bar className="h-3 w-40" />
              <Bar className="h-3 w-56" />
              <Bar className="h-3 w-48" />
              <Bar className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Bar className="h-12 w-full rounded-card" />
    </div>
  );
}

/* ══════════════════════ /account/orders/[id] ══════════════════════ */
function OrderDetailGhost() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Breadcrumb crumbs={4} />
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <Bar className="h-6 w-32 mb-2" />
          <Bar className="h-3.5 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Bar className="h-7 w-24 rounded-full" />
          <Bar className="h-3.5 w-24 hidden sm:block" />
        </div>
      </div>
      {/* grid-cols-1 lg:grid-cols-3 in the real page — single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas"><Bar className="h-3.5 w-28" /></div>
            <div className="divide-y divide-canvas">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-5">
                  <div className="w-16 h-16 rounded-control u-skeleton flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5"><Bar className="h-3.5 w-2/3" /><Bar className="h-2.5 w-1/3" /></div>
                  <Bar className="h-3.5 w-12 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas"><Bar className="h-3.5 w-36" /></div>
            <div className="p-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Circle className="w-5 h-5 flex-shrink-0" />
                  <Bar className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <Card className="h-40" />
          <Card className="h-32" />
          <Bar className="h-12 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}

/* ══════════════ /account/orders/[id]/return ══════════════ */
function ReturnRequestGhost() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumb />
      <Bar className="h-6 w-48 mb-2" />
      <Bar className="h-3.5 w-64 mb-6" />
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 flex items-center gap-2">
            <Circle className="w-7 h-7 flex-shrink-0" />
            <Bar className="h-3 w-16 hidden sm:block" />
            {n < 3 && <Bar className="flex-1 h-0.5 rounded" />}
          </div>
        ))}
      </div>
      {/* Step 1 shape: selectable item rows */}
      <div className="bg-canvas rounded-card border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-canvas"><Bar className="h-3.5 w-40" /></div>
        <div className="divide-y divide-canvas">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Circle className="w-5 h-5 flex-shrink-0" />
              <div className="w-12 h-12 rounded-control u-skeleton flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5"><Bar className="h-3.5 w-2/3" /><Bar className="h-2.5 w-1/2" /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <Bar className="h-11 w-24 rounded-control" />
        <Bar className="h-11 flex-1 rounded-full" />
      </div>
    </div>
  );
}

export default function GhostRows({
  rows = 3,
  variant = "generic",
  kind = "orders",
  className = "",
}: {
  rows?: number;
  variant?: Variant;
  /** "list" variant only — which page's card shape + header pattern to use. */
  kind?: "orders" | "returns" | "reviews";
  className?: string;
}) {
  if (variant === "account") return <AccountGhost />;
  if (variant === "rewards") return <RewardsGhost />;
  if (variant === "security") return <SecurityGhost />;
  if (variant === "notifications") return <NotificationsGhost />;
  if (variant === "addresses") return <AddressesGhost />;
  if (variant === "orderDetail") return <OrderDetailGhost />;
  if (variant === "returnRequest") return <ReturnRequestGhost />;

  if (variant === "list") {
    return (
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 ${className}`}>
        {kind === "orders" && (<><Breadcrumb /><TitleRow /></>)}
        {kind === "returns" && (<><BackLink /><Bar className="h-6 w-40 mb-2" /><Bar className="h-3.5 w-56 mb-8" /></>)}
        {kind === "reviews" && (<><Breadcrumb /><Bar className="h-6 w-40 mb-2" /><Bar className="h-3.5 w-56 mb-8" /></>)}
        <ListGhost rows={rows} kind={kind} />
      </div>
    );
  }

  // Generic fallback — addresses, and any future page without a dedicated shape.
  return (
    <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 ${className}`} aria-busy="true" aria-label="Loading">
      <Breadcrumb />
      <TitleRow />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
