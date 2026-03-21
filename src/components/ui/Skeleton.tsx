import { cn } from "@/lib/utils";

export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg h-3 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/3" />
        </div>
      </div>
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-4/5" />
    </div>
  );
}

export function SkeletonStatGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton h-8 w-12 rounded-lg" />
          <SkeletonLine className="w-16 mt-1" />
          <SkeletonLine className="w-12 mt-0.5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="w-1/3" />
      </div>
      <div className="skeleton w-16 h-4 rounded-full flex-shrink-0" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
