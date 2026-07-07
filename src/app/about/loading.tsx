export default function AboutLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Hero */}
      <div className="rounded-3xl h-52 bg-[#EDE5D8] mb-16" />

      {/* Story section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-16">
        <div className="space-y-4">
          <div className="h-3 w-20 bg-[#C8DDD8] rounded" />
          <div className="h-9 w-64 bg-[#DDD5CC] rounded-xl" />
          <div className="h-9 w-48 bg-[#DDD5CC] rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-full bg-[#EDE5D8] rounded" />
                <div className="h-4 w-5/6 bg-[#EDE5D8] rounded" />
                <div className="h-4 w-4/6 bg-[#EDE5D8] rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl h-32 bg-[#EDE5D8]" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#DDD5CC] p-6 text-center">
            <div className="h-8 w-16 bg-[#C8DDD8] rounded mx-auto mb-2" />
            <div className="h-3 w-20 bg-[#EDE5D8] rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-6 border border-[#DDD5CC] bg-white flex gap-5">
            <div className="w-10 h-10 rounded-full bg-[#EDE5D8] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-[#DDD5CC] rounded" />
              <div className="h-3 w-full bg-[#EDE5D8] rounded" />
              <div className="h-3 w-5/6 bg-[#EDE5D8] rounded" />
              <div className="h-3 w-4/6 bg-[#EDE5D8] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
