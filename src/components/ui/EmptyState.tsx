import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-14 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-gray-300" />
      </div>
      <h3 className="text-sm font-semibold text-black mb-1.5">{title}</h3>
      {description && <p className="text-xs text-gray-400 max-w-xs mb-5 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
