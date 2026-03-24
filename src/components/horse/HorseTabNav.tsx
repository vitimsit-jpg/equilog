"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { haptic } from "@/lib/haptic";

const BASE_TABS: {
  suffix: string;
  label: string;
  hideForModes?: string[];
  labelForMode?: Partial<Record<string, string>>;
}[] = [
  { suffix: "", label: "Aperçu" },
  { suffix: "/health", label: "Santé" },
  { suffix: "/training", label: "Travail", hideForModes: ["IS", "ICr"], labelForMode: { IR: "Rééducation" } },
  { suffix: "/competitions", label: "Concours", hideForModes: ["IP", "IR", "IS", "ICr"], labelForMode: { IE: "Allégé" } },
  { suffix: "/budget", label: "Budget" },
  { suffix: "/historique", label: "Historique" },
  { suffix: "/genealogie", label: "Généalogie" },
  { suffix: "/video", label: "Analyse IA" },
  { suffix: "/documents", label: "Documents" },
];

export default function HorseTabNav({ horseId, horseIndexMode, moduleNutrition }: { horseId: string; horseIndexMode?: string | null; moduleNutrition?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/horses/${horseId}`;
  const storageKey = `last_tab_${horseId}`;

  useEffect(() => {
    if (pathname === base) {
      const saved = localStorage.getItem(storageKey);
      if (saved) router.replace(`${base}${saved}`);
    }
  }, []);

  const TABS = moduleNutrition
    ? [BASE_TABS[0], BASE_TABS[1], { suffix: "/nutrition", label: "Nutrition" }, ...BASE_TABS.slice(2)]
    : BASE_TABS;

  const visibleTabs = TABS.filter(
    (tab) => !tab.hideForModes || !horseIndexMode || !tab.hideForModes.includes(horseIndexMode)
  );

  return (
    <div className="flex overflow-x-auto bg-white border-b border-gray-100 sticky top-14 z-20 px-4 md:px-6" style={{ scrollbarWidth: "none" }}>
      {visibleTabs.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const isActive =
          tab.suffix === ""
            ? pathname === base
            : pathname.startsWith(`${base}${tab.suffix}`);
        const label = (horseIndexMode && tab.labelForMode?.[horseIndexMode]) || tab.label;
        return (
          <Link
            key={tab.suffix}
            href={href}
            onClick={() => {
              if (!isActive) haptic("light");
              if (tab.suffix === "") {
                localStorage.removeItem(storageKey);
              } else {
                localStorage.setItem(storageKey, tab.suffix);
              }
            }}
            className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "text-orange border-orange"
                : "text-gray-400 border-transparent hover:text-black"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
