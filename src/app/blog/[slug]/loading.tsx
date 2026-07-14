export default function BlogPostLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-8">
        <div className="h-3 w-10 bg-panel rounded" />
        <div className="h-3 w-2 bg-panel rounded" />
        <div className="h-3 w-16 bg-panel rounded" />
        <div className="h-3 w-2 bg-panel rounded" />
        <div className="h-3 w-32 bg-panel rounded" />
      </div>

      {/* Article header */}
      <div className="mb-8">
        <div className="h-3 w-24 bg-sage rounded mb-4" />
        <div className="h-10 w-full bg-line rounded-control mb-3" />
        <div className="h-10 w-4/5 bg-line rounded-control mb-6" />
        <div className="h-4 w-48 bg-panel rounded" />
      </div>

      {/* Emoji hero */}
      <div className="h-48 rounded-card bg-panel mb-10" />

      {/* Body paragraphs */}
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-full bg-line rounded" />
            <div className="h-4 w-full bg-line rounded" />
            <div className="h-4 w-5/6 bg-line rounded" />
            <div className="h-4 w-4/6 bg-line rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
