import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero */}
      <Skeleton className="h-24" />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Horses section title */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />

        {/* Mobile carousel skeleton */}
        <div className="md:hidden -mx-4">
          <div className="flex gap-3 px-4">
            <Skeleton className="flex-shrink-0 w-[78vw] h-[220px] rounded-2xl" />
            <Skeleton className="flex-shrink-0 w-[78vw] h-[220px] rounded-2xl" />
          </div>
        </div>

        {/* Desktop grid skeleton */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      </div>

      {/* Widgets */}
      <Skeleton className="h-48" />
      <Skeleton className="h-36" />
    </div>
  );
}
