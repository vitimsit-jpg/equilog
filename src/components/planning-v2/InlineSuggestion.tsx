"use client";

import { Sparkles } from "lucide-react";
import { getTypeEmoji, getTypeLabel } from "./constants";
import type { AISuggestion } from "./types";

interface Props {
  suggestion: AISuggestion;
  onAccept: () => void;
}

export default function InlineSuggestion({ suggestion, onAccept }: Props) {
  const emoji = getTypeEmoji(suggestion.type);
  const label = getTypeLabel(suggestion.type);

  return (
    <button
      onClick={onAccept}
      className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-orange/30 bg-orange-light/10 px-3 py-2.5 text-left hover:border-orange/50 hover:bg-orange-light/20 transition-all group"
    >
      <Sparkles className="h-4 w-4 text-orange flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">
          L&apos;IA suggère :
          <span className="font-semibold text-gray-700 ml-1">
            {emoji} {label} · {suggestion.duration_min}min
          </span>
        </p>
      </div>
      <span className="text-2xs font-semibold text-orange opacity-0 group-hover:opacity-100 transition-opacity">
        Accepter
      </span>
    </button>
  );
}
