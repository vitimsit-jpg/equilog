"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "feed", label: "Feed" },
  { key: "classements", label: "Classements" },
  { key: "defis", label: "Défis" },
] as const;

interface Props {
  activeTab: string;
}

export default function CommunauteTabs({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(tab.key === "feed" ? pathname : `${pathname}?tab=${tab.key}`)}
          className={cn(
            "flex-1 text-sm font-semibold py-2 rounded-lg transition-all",
            activeTab === tab.key
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
