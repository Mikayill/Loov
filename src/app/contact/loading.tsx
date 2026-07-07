export default function ContactLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-3 w-28 bg-[#C8DDD8] rounded mx-auto mb-3" />
        <div className="h-10 w-48 bg-[#DDD5CC] rounded-xl mx-auto mb-3" />
        <div className="h-4 w-72 bg-[#EDE5D8] rounded mx-auto" />
        <div className="h-4 w-60 bg-[#EDE5D8] rounded mx-auto mt-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16">
        {/* Form skeleton */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-[#DDD5CC] p-7">
          <div className="h-6 w-36 bg-[#DDD5CC] rounded mb-6" />
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-[#EDE5D8] rounded mb-1.5" />
                <div className="h-11 bg-[#EDE5D8] rounded-xl" />
              </div>
            ))}
            <div>
              <div className="h-3 w-20 bg-[#EDE5D8] rounded mb-1.5" />
              <div className="h-28 bg-[#EDE5D8] rounded-xl" />
            </div>
            <div className="h-12 bg-[#C8DDD8] rounded-2xl" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-3xl border border-[#DDD5CC] p-6 space-y-4">
            <div className="h-5 w-28 bg-[#DDD5CC] rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#EDE5D8]" />
                <div>
                  <div className="h-3 w-12 bg-[#EDE5D8] rounded mb-1" />
                  <div className="h-4 w-32 bg-[#DDD5CC] rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-20 bg-[#C8DDD8] rounded-2xl" />
          <div className="h-20 bg-[#EDE5D8] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
