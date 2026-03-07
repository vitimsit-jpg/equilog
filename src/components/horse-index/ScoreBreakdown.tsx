import type { ScoreBreakdown } from "@/lib/supabase/types";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
}

const components = [
  { key: "regularite", label: "Régularité d'entraînement", max: 25, icon: "📅" },
  { key: "progression", label: "Progression & performance", max: 25, icon: "📈" },
  { key: "sante", label: "État de santé", max: 20, icon: "❤️" },
  { key: "recuperation", label: "Récupération & bien-être", max: 20, icon: "😴" },
  { key: "wearables", label: "Données wearables", max: 10, icon: "⌚" },
];

export default function ScoreBreakdownComponent({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      {components.map((comp) => {
        const value = breakdown[comp.key as keyof ScoreBreakdown] as number;
        const pct = Math.round((value / comp.max) * 100);
        const isNA = comp.key === "wearables" && !breakdown.has_wearables;

        return (
          <div key={comp.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{comp.icon}</span>
                <span className="text-xs font-medium text-gray-700">{comp.label}</span>
                {isNA && (
                  <span className="text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    Redistribué
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-black">
                {isNA ? "—" : `${value}/${comp.max}`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {!isNA && (
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      pct >= 80 ? "#16A34A" : pct >= 60 ? "#E8440A" : pct >= 40 ? "#D97706" : "#DC2626",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
