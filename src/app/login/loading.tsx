export default function LoginLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 u-skeleton">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage mx-auto mb-4" />
          <div className="h-7 w-44 bg-line rounded-control mx-auto mb-2" />
          <div className="h-4 w-52 bg-panel rounded mx-auto" />
        </div>

        <div className="bg-canvas rounded-card border border-line p-7 space-y-5">
          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-11 bg-panel rounded-control" />
            <div className="h-11 bg-panel rounded-control" />
          </div>

          {/* Divider */}
          <div className="h-px bg-panel" />

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-panel rounded-control" />
            <div className="h-10 bg-panel rounded-control" />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-panel rounded mb-1.5" />
                <div className="h-11 bg-panel rounded-control" />
              </div>
            ))}
            <div className="h-11 bg-sage rounded-control" />
          </div>
        </div>

        <div className="h-4 w-56 bg-panel rounded mx-auto mt-5" />
      </div>
    </div>
  );
}
