"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart2, Users, ShieldAlert, Activity } from "lucide-react";

const navItems = [
  { href: "/admin", icon: BarChart2, label: "Analytics" },
  { href: "/admin/users", icon: Users, label: "Utilisateurs" },
  { href: "/admin/audit", icon: ShieldAlert, label: "Audit logs" },
  { href: "/admin/events", icon: Activity, label: "Event logs" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              active
                ? "bg-orange text-white font-semibold"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
