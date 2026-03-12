import { cn } from "@/lib/utils";

export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}
