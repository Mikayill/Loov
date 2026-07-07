export default function BlogLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="h-4 w-24 bg-[#C8DDD8] rounded mx-auto mb-3" />
        <div className="h-10 w-64 bg-[#DDD5CC] rounded-xl mx-auto mb-3" />
        <div className="h-4 w-80 bg-[#EDE5D8] rounded mx-auto" />
      </div>

      {/* Featured article */}
      <div className="rounded-3xl overflow-hidden mb-8 grid grid-cols-1 md:grid-cols-2">
        <div className="h-64 md:h-72 bg-[#EDE5D8]" />
        <div className="bg-white p-8 space-y-4 flex flex-col justify-center">
          <div className="h-3 w-24 bg-[#EDE5D8] rounded" />
          <div className="h-8 w-4/5 bg-[#DDD5CC] rounded-lg" />
          <div className="h-8 w-3/5 bg-[#DDD5CC] rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#EDE5D8] rounded" />
            <div className="h-4 w-5/6 bg-[#EDE5D8] rounded" />
            <div className="h-4 w-4/6 bg-[#EDE5D8] rounded" />
          </div>
          <div className="h-10 w-32 bg-[#C8DDD8] rounded-full mt-2" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="h-40 bg-[#EDE5D8]" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-20 bg-[#EDE5D8] rounded" />
              <div className="h-5 w-4/5 bg-[#DDD5CC] rounded" />
              <div className="h-5 w-3/5 bg-[#DDD5CC] rounded" />
              <div className="h-4 w-full bg-[#EDE5D8] rounded" />
              <div className="h-4 w-4/6 bg-[#EDE5D8] rounded" />
              <div className="h-8 w-24 bg-[#C8DDD8] rounded-full mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
