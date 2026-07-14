export default function BlogLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="h-4 w-24 bg-sage rounded mx-auto mb-3" />
        <div className="h-10 w-64 bg-line rounded-control mx-auto mb-3" />
        <div className="h-4 w-80 bg-panel rounded mx-auto" />
      </div>

      {/* Featured article */}
      <div className="rounded-card overflow-hidden mb-8 grid grid-cols-1 md:grid-cols-2">
        <div className="h-64 md:h-72 bg-panel" />
        <div className="bg-canvas p-8 space-y-4 flex flex-col justify-center">
          <div className="h-3 w-24 bg-panel rounded" />
          <div className="h-8 w-4/5 bg-line rounded-lg" />
          <div className="h-8 w-3/5 bg-line rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-panel rounded" />
            <div className="h-4 w-5/6 bg-panel rounded" />
            <div className="h-4 w-4/6 bg-panel rounded" />
          </div>
          <div className="h-10 w-32 bg-sage rounded-full mt-2" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="h-40 bg-panel" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-20 bg-panel rounded" />
              <div className="h-5 w-4/5 bg-line rounded" />
              <div className="h-5 w-3/5 bg-line rounded" />
              <div className="h-4 w-full bg-panel rounded" />
              <div className="h-4 w-4/6 bg-panel rounded" />
              <div className="h-8 w-24 bg-sage rounded-full mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
