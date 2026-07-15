export default function AccountLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 u-skeleton">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-36 bg-line rounded-control mb-2" />
          <div className="h-4 w-44 bg-panel rounded" />
        </div>
        <div className="h-10 w-28 bg-panel rounded-control" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-canvas rounded-card border border-line p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-panel mx-auto mb-4" />
          <div className="h-5 w-32 bg-line rounded mx-auto mb-2" />
          <div className="h-4 w-44 bg-panel rounded mx-auto mb-3" />
          <div className="h-6 w-28 bg-panel rounded-full mx-auto" />
        </div>

        {/* Stats + actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-canvas rounded-card border border-line p-5">
                <div className="h-7 w-8 bg-panel rounded mb-2" />
                <div className="h-8 w-10 bg-line rounded mb-1" />
                <div className="h-3 w-28 bg-panel rounded" />
              </div>
            ))}
          </div>

          <div className="bg-canvas rounded-card border border-line divide-y divide-canvas">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-panel" />
                  <div>
                    <div className="h-4 w-24 bg-line rounded mb-1" />
                    <div className="h-3 w-36 bg-panel rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-panel rounded-full" />
              </div>
            ))}
          </div>

          <div className="h-16 bg-panel rounded-card" />
        </div>
      </div>
    </div>
  );
}
