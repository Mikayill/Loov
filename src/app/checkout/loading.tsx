export default function CheckoutLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="h-3 w-12 bg-panel rounded" />
            {i < 3 && <div className="h-3 w-2 bg-panel rounded" />}
          </div>
        ))}
      </div>

      <div className="h-8 w-32 bg-line rounded-control mb-8" />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-line" />
            {i < 3 && <div className="h-0.5 w-16 bg-panel" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2].map((section) => (
            <div key={section} className="bg-white rounded-card border border-line p-6">
              <div className="h-6 w-44 bg-line rounded mb-5" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((f) => (
                  <div key={f}>
                    <div className="h-3 w-20 bg-panel rounded mb-1.5" />
                    <div className="h-11 bg-panel rounded-control" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="h-14 bg-sage rounded-card" />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-card border border-line p-5 space-y-4">
            <div className="h-5 w-32 bg-line rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-panel flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 bg-line rounded" />
                  <div className="h-3 w-1/2 bg-panel rounded" />
                </div>
                <div className="h-4 w-12 bg-panel rounded" />
              </div>
            ))}
            <div className="h-px bg-line" />
            <div className="flex justify-between">
              <div className="h-5 w-10 bg-line rounded" />
              <div className="h-5 w-16 bg-line rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
