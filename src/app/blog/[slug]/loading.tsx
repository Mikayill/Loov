export default function BlogPostLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-8">
        <div className="h-3 w-10 bg-[#EDE5D8] rounded" />
        <div className="h-3 w-2 bg-[#EDE5D8] rounded" />
        <div className="h-3 w-16 bg-[#EDE5D8] rounded" />
        <div className="h-3 w-2 bg-[#EDE5D8] rounded" />
        <div className="h-3 w-32 bg-[#EDE5D8] rounded" />
      </div>

      {/* Article header */}
      <div className="mb-8">
        <div className="h-3 w-24 bg-[#C8DDD8] rounded mb-4" />
        <div className="h-10 w-full bg-[#DDD5CC] rounded-xl mb-3" />
        <div className="h-10 w-4/5 bg-[#DDD5CC] rounded-xl mb-6" />
        <div className="h-4 w-48 bg-[#EDE5D8] rounded" />
      </div>

      {/* Emoji hero */}
      <div className="h-48 rounded-3xl bg-[#EDE5D8] mb-10" />

      {/* Body paragraphs */}
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-full bg-[#DDD5CC] rounded" />
            <div className="h-4 w-full bg-[#DDD5CC] rounded" />
            <div className="h-4 w-5/6 bg-[#DDD5CC] rounded" />
            <div className="h-4 w-4/6 bg-[#DDD5CC] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
