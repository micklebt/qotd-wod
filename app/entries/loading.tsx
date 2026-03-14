export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 space-y-4">
        <div className="h-8 w-32 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
        <div className="flex gap-2 flex-wrap">
          <div className="h-9 w-24 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
