export default function WishlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-36 bg-[#DDD5CC] rounded-xl mb-2" />
          <div className="h-4 w-20 bg-[#EDE5D8] rounded-lg" />
        </div>
        <div className="h-5 w-36 bg-[#EDE5D8] rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="h-40 bg-[#EDE5D8]" />
            <div className="p-3.5 space-y-2">
              <div className="h-3 w-16 bg-[#EDE5D8] rounded" />
              <div className="h-4 w-full bg-[#DDD5CC] rounded" />
              <div className="h-4 w-2/3 bg-[#DDD5CC] rounded" />
              <div className="h-5 w-12 bg-[#DDD5CC] rounded mt-1" />
              <div className="h-9 bg-[#C8DDD8] rounded-xl mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
