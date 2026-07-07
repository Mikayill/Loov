export default function AccountLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-36 bg-[#DDD5CC] rounded-xl mb-2" />
          <div className="h-4 w-44 bg-[#EDE5D8] rounded" />
        </div>
        <div className="h-10 w-28 bg-[#EDE5D8] rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#C8DDD8] mx-auto mb-4" />
          <div className="h-5 w-32 bg-[#DDD5CC] rounded mx-auto mb-2" />
          <div className="h-4 w-44 bg-[#EDE5D8] rounded mx-auto mb-3" />
          <div className="h-6 w-28 bg-[#EDE5D8] rounded-full mx-auto" />
        </div>

        {/* Stats + actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
                <div className="h-7 w-8 bg-[#EDE5D8] rounded mb-2" />
                <div className="h-8 w-10 bg-[#DDD5CC] rounded mb-1" />
                <div className="h-3 w-28 bg-[#EDE5D8] rounded" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#DDD5CC] divide-y divide-[#F5F0EB]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EDE5D8]" />
                  <div>
                    <div className="h-4 w-24 bg-[#DDD5CC] rounded mb-1" />
                    <div className="h-3 w-36 bg-[#EDE5D8] rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-[#EDE5D8] rounded-full" />
              </div>
            ))}
          </div>

          <div className="h-16 bg-[#C8DDD8] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
