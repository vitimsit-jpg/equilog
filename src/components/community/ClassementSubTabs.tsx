"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  activeClassement: string;
  isCompetitor: boolean;
}

export default function ClassementSubTabs({ activeClassement, isCompetitor }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "classements");
    params.set("classement", key);
    params.delete("discipline");
    params.delete("region");
    params.delete("periode");
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs = [
    { key: "horse_index", label: "Horse Index" },
    { key: "regularite", label: "Régularité" },
    ...(isCompetitor ? [{ key: "concours", label: "Concours" }] : []),
  ];

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.key)}
          className={cn(
            "flex-1 text-xs font-semibold py-2 rounded-lg transition-all",
            activeClassement === tab.key
              ? "bg-white text-black shadow-sm"
              : "text-gray-500 hover:text-black"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
