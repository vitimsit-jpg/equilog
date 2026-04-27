"use client";

import { useState } from "react";
import type { BadgeDef, BadgeFamily } from "@/lib/badges";
import { BADGE_FAMILIES } from "@/lib/badges";
import { formatDate } from "@/lib/utils";

export interface EarnedBadge {
  key: string;
  earnedAt: string;
}

interface NextBadge {
  key: string;
  emoji: string;
  label: string;
  current: number;
  target: number;
}

interface Props {
  defs: BadgeDef[];
  earned: EarnedBadge[];
  total: number;
  next: NextBadge | null;
}

export default function BadgesSectionClient({ defs, earned, total, next }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const earnedMap = new Map(earned.map((e) => [e.key, e.earnedAt]));
  const earnedCount = earned.length;

  const toggle = (key: string) => setExpanded((curr) => (curr === key ? null : key));

  return (
    <div className="card bg-white border border-[#F5F5F5] shadow-none">
      <h2 className="font-bold text-black text-sm mb-4">Badges</h2>

      {/* Bloc résumé */}
      <div className="border border-[#F5F5F5] rounded-lg p-4 mb-5 bg-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xl font-bold text-black">
            {earnedCount}
            <span className="text-sm font-normal text-gray-400"> / {total}</span>
          </span>
          <span className="text-xs uppercase tracking-wider text-gray-500">obtenus</span>
        </div>
        {next ? (
          <p className="text-xs text-gray-600">
            <span className="text-gray-400">Prochain : </span>
            <span className="font-medium">{next.emoji} {next.label}</span>
            <span className="text-gray-400"> ({next.current}/{next.target})</span>
          </p>
        ) : earnedCount === total ? (
          <p className="text-xs text-orange font-medium">🎉 Tous les badges obtenus !</p>
        ) : null}
      </div>

      {/* Listes par famille */}
      {BADGE_FAMILIES.map((fam) => {
        const familyDefs = defs.filter((d) => d.family === fam.key);
        return (
          <div key={fam.key} className="mb-5 last:mb-0">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{fam.label}</p>
            <div className="border-t border-[#F5F5F5]">
              {familyDefs.map((def) => {
                const isEarned = earnedMap.has(def.key);
                const earnedAt = earnedMap.get(def.key);
                const isOpen = expanded === def.key;
                return (
                  <div key={def.key} className="border-b border-[#F5F5F5]">
                    <button
                      type="button"
                      onClick={() => toggle(def.key)}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={
                          "flex items-center justify-center w-10 h-10 rounded-full border-2 text-lg shrink-0 " +
                          (isEarned ? "border-orange bg-orange-light" : "border-gray-300 bg-white opacity-50")
                        }
                      >
                        {def.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={"text-sm font-medium " + (isEarned ? "text-black" : "text-gray-400")}>
                          {def.label}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{def.description}</p>
                      </div>
                      <span className="text-gray-400 text-xs">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="pl-13 pb-3 pr-2 ml-13 text-xs text-gray-600 space-y-1">
                        {isEarned ? (
                          <>
                            <p><span className="text-gray-400">Critère : </span>{def.description}</p>
                            <p><span className="text-gray-400">Obtenu le </span>{earnedAt ? formatDate(earnedAt) : "—"}</p>
                          </>
                        ) : (
                          <p><span className="text-gray-400">Comment l'obtenir : </span>{def.howTo}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
