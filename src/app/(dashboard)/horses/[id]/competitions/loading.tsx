import Skeleton from "@/components/ui/Skeleton";

export default function CompetitionsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 mt-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}
