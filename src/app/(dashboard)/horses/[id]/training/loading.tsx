import Skeleton from "@/components/ui/Skeleton";

export default function TrainingLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}
