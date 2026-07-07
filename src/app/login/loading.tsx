export default function LoginLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-pulse">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#C8DDD8] mx-auto mb-4" />
          <div className="h-7 w-44 bg-[#DDD5CC] rounded-xl mx-auto mb-2" />
          <div className="h-4 w-52 bg-[#EDE5D8] rounded mx-auto" />
        </div>

        <div className="bg-white rounded-3xl border border-[#DDD5CC] p-7 space-y-5">
          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-11 bg-[#EDE5D8] rounded-xl" />
            <div className="h-11 bg-[#EDE5D8] rounded-xl" />
          </div>

          {/* Divider */}
          <div className="h-px bg-[#EDE5D8]" />

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-[#EDE5D8] rounded-xl" />
            <div className="h-10 bg-[#EDE5D8] rounded-xl" />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-[#EDE5D8] rounded mb-1.5" />
                <div className="h-11 bg-[#EDE5D8] rounded-xl" />
              </div>
            ))}
            <div className="h-11 bg-[#C8DDD8] rounded-xl" />
          </div>
        </div>

        <div className="h-4 w-56 bg-[#EDE5D8] rounded mx-auto mt-5" />
      </div>
    </div>
  );
}
