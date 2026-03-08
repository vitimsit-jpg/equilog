"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  disciplines: string[];
  regions: string[];
  disciplineLabels: Record<string, string>;
}

export default function ClassementsFilters({ disciplines, regions, disciplineLabels }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discipline = searchParams.get("discipline") || "";
  const region = searchParams.get("region") || "";

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/classements?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={discipline}
        onChange={(e) => update("discipline", e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-700 focus:outline-none focus:border-orange"
      >
        <option value="">Toutes disciplines</option>
        {disciplines.map((d) => (
          <option key={d} value={d}>{disciplineLabels[d] || d}</option>
        ))}
      </select>
      <select
        value={region}
        onChange={(e) => update("region", e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-700 focus:outline-none focus:border-orange"
      >
        <option value="">Toutes régions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {(discipline || region) && (
        <button
          onClick={() => router.push("/classements")}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-500 hover:text-black"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
