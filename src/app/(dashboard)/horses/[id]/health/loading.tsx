import Skeleton from "@/components/ui/Skeleton";

export default function HealthLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
