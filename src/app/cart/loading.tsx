export default function CartLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 u-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-32 bg-line rounded-control mb-2" />
          <div className="h-4 w-20 bg-panel rounded-lg" />
        </div>
        <div className="h-5 w-32 bg-panel rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Item list */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-card border border-line p-4 sm:p-5 flex gap-4"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-control bg-panel flex-shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-4 w-3/4 bg-line rounded-lg" />
                <div className="h-3 w-1/3 bg-panel rounded-lg" />
                <div className="flex items-center justify-between">
                  <div className="h-9 w-28 bg-panel rounded-control" />
                  <div className="h-5 w-16 bg-line rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-line p-6 space-y-5">
            <div className="h-6 w-32 bg-line rounded-lg" />
            <div className="h-16 bg-panel rounded-card" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-panel rounded" />
                  <div className="h-4 w-14 bg-panel rounded" />
                </div>
              ))}
              <div className="h-px bg-line" />
              <div className="flex justify-between">
                <div className="h-5 w-12 bg-line rounded" />
                <div className="h-5 w-16 bg-line rounded" />
              </div>
            </div>
            <div className="h-12 bg-sage rounded-card" />
          </div>
        </div>
      </div>
    </div>
  );
}
