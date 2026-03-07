import { cn } from "@/lib/utils";

type BadgeVariant = "orange" | "success" | "warning" | "danger" | "gray" | "black";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = "gray", children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    orange: "bg-orange-light text-orange",
    success: "bg-green-50 text-success",
    warning: "bg-amber-50 text-warning",
    danger: "bg-red-50 text-danger",
    gray: "bg-gray-100 text-gray-600",
    black: "bg-black text-white",
  };

  return (
    <span className={cn("badge", variants[variant], className)}>
      {children}
    </span>
  );
}
