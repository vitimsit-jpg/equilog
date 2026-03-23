"use client";

import { useState } from "react";
import { BADGE_DEFS, type BadgeDef } from "@/lib/badges";

const CATEGORY_LABELS: Record<string, string> = {
  regularite: "Régularité",
  volume: "Volume",
  concours: "Concours",
  sante: "Santé",
  special: "Spéciaux",
};

interface Props {
  earnedKeys: string[];
}

export default function BadgesDisplay({ earnedKeys }: Props) {
  const [tooltip, setTooltip] = useState<BadgeDef | null>(null);
  const earnedSet = new Set(earnedKeys);

  const categories = ["regularite", "volume", "concours", "sante", "special"] as const;

  if (earnedKeys.length === 0) {
    return (
      <div className="card py-8 text-center">
        <div className="text-3xl mb-2">🌱</div>
        <p className="text-sm font-semibold text-black mb-1">Débloquez vos premiers badges</p>
        <p className="text-xs text-gray-400">
          Enregistrez des séances, participez à des concours, soignez votre cheval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catBadges = BADGE_DEFS.filter((b) => b.category === cat);
        const earnedInCat = catBadges.filter((b) => earnedSet.has(b.key));
        if (earnedInCat.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="flex flex-wrap gap-2">
              {catBadges.map((badge) => {
                const isEarned = earnedSet.has(badge.key);
                return (
                  <button
                    key={badge.key}
                    onClick={() => setTooltip(tooltip?.key === badge.key ? null : badge)}
                    className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl border transition-all ${
                      isEarned
                        ? "border-orange/30 bg-orange-light hover:border-orange"
                        : "border-gray-100 bg-gray-50 opacity-30 grayscale"
                    }`}
                  >
                    <span className="text-2xl leading-none">{badge.emoji}</span>
                    <span className={`text-2xs font-semibold text-center leading-tight px-0.5 ${isEarned ? "text-orange" : "text-gray-400"}`}>
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center pb-8 px-4"
          onClick={() => setTooltip(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 max-w-xs w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{tooltip.emoji}</span>
              <div>
                <p className="font-bold text-black">{tooltip.label}</p>
                <p className="text-xs text-gray-400">{CATEGORY_LABELS[tooltip.category]}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">{tooltip.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
