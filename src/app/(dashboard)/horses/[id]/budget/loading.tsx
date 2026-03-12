import Skeleton from "@/components/ui/Skeleton";

export default function BudgetLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 mt-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-56" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}
