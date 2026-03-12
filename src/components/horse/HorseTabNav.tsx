"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptic";

const TABS = [
  { suffix: "", label: "Aperçu" },
  { suffix: "/health", label: "Santé" },
  { suffix: "/training", label: "Travail" },
  { suffix: "/competitions", label: "Concours" },
  { suffix: "/budget", label: "Budget" },
];

export default function HorseTabNav({ horseId }: { horseId: string }) {
  const pathname = usePathname();
  const base = `/horses/${horseId}`;

  return (
    <div className="flex overflow-x-auto bg-white border-b border-gray-100 sticky top-14 z-20 px-4 md:px-6" style={{ scrollbarWidth: "none" }}>
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const isActive =
          tab.suffix === ""
            ? pathname === base
            : pathname.startsWith(`${base}${tab.suffix}`);
        return (
          <Link
            key={tab.suffix}
            href={href}
            onClick={() => !isActive && haptic("light")}
            className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "text-orange border-orange"
                : "text-gray-400 border-transparent hover:text-black"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
