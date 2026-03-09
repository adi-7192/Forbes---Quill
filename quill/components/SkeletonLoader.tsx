export function SkeletonLoader() {
  return (
    <div className="relative p-6 bg-white border border-gray-100 shadow-sm rounded-lg mb-4 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-6 bg-gray-100 rounded w-6"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}
