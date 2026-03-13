import { cn } from "@/lib/utils";
import { LucideIcon, Check } from "lucide-react";

interface Step {
  label: string;
  done?: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  steps?: Step[];
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, steps, className }: EmptyStateProps) {
  const firstActiveIndex = steps ? steps.findIndex((s) => !s.done) : -1;

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange/60 flex items-center justify-center mb-4 shadow-orange">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-sm font-bold text-black mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 max-w-xs mb-5 leading-relaxed">{description}</p>
      )}
      {steps && steps.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-5 w-full max-w-xs text-left">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 text-xs",
                step.done ? "opacity-50" : i === firstActiveIndex ? "opacity-100" : "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-2xs",
                  step.done
                    ? "bg-green-100 text-green-600"
                    : i === firstActiveIndex
                    ? "bg-orange text-white"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {step.done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("font-medium", step.done ? "line-through text-gray-400" : "text-black")}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}
