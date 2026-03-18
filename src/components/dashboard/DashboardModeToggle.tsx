"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bike, Building2 } from "lucide-react";

interface Props {
  currentMode: "cavalier" | "gerant";
}

export default function DashboardModeToggle({ currentMode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setMode = (mode: "cavalier" | "gerant") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-end">
      <button
        onClick={() => setMode("cavalier")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          currentMode === "cavalier"
            ? "bg-white text-black shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <Bike className="h-3.5 w-3.5" />
        Cavalier
      </button>
      <button
        onClick={() => setMode("gerant")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          currentMode === "gerant"
            ? "bg-white text-black shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
        Gérant
      </button>
    </div>
  );
}
