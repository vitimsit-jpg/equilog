"use client";

/**
 * TRAV-23 — Historique des transitions de mode de vie
 * Affiche une timeline des changements de mode sur la fiche cheval.
 */

import type { HorseModeHistory, HorseIndexMode } from "@/lib/supabase/types";
import { HORSE_MODE_LABELS, HORSE_MODE_EMOJIS } from "@/hooks/useHorseMode";

interface Props {
  history: HorseModeHistory[];
  currentMode: HorseIndexMode | null;
}

export default function ModeHistoryTimeline({ history, currentMode }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="card">
      <h2 className="font-bold text-black text-sm mb-4">Historique des modes de vie</h2>
      <div className="relative pl-5">
        {/* vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />

        {history.map((entry, i) => {
          const isFirst = i === 0;
          const toMode = entry.mode_to as HorseIndexMode;
          const fromMode = entry.mode_from as HorseIndexMode | null;
          return (
            <div key={entry.id} className="relative mb-4 last:mb-0">
              {/* dot */}
              <div className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                isFirst ? "border-orange bg-orange" : "border-gray-200 bg-white"
              }`}>
                <span className="text-[8px]">{isFirst ? "●" : ""}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {fromMode && (
                      <>
                        <span className="text-2xs text-gray-400 font-mono">{fromMode}</span>
                        <span className="text-2xs text-gray-300">→</span>
                      </>
                    )}
                    <span className={`text-2xs font-bold font-mono ${isFirst ? "text-orange" : "text-gray-600"}`}>
                      {toMode}
                    </span>
                    <span className="text-sm">{HORSE_MODE_EMOJIS[toMode]}</span>
                    <span className="text-xs font-semibold text-black">
                      {HORSE_MODE_LABELS[toMode]}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-2xs text-gray-400 mt-0.5 leading-snug italic">{entry.reason}</p>
                  )}
                </div>
                <span className="text-2xs text-gray-400 flex-shrink-0 mt-0.5">
                  {new Date(entry.changed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
