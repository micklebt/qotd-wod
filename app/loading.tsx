export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
        <div className="h-24 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
        <div className="h-24 bg-gray-200 dark:bg-[#333333] rounded animate-pulse" />
      </div>
    </div>
  );
}
