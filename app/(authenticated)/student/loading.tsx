export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
      <div className="rounded-xl border border-gray-200 bg-white p-8 mb-8 h-64 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 h-12" />
        ))}
      </div>
    </div>
  );
}
