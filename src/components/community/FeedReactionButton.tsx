"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptic";

const REACTIONS = [
  { type: "like", emoji: "❤️", label: "J'aime" },
  { type: "fire", emoji: "🔥", label: "Impressionnant" },
  { type: "strong", emoji: "💪", label: "Force" },
  { type: "trophy", emoji: "🏆", label: "Bravo" },
] as const;

type ReactionType = (typeof REACTIONS)[number]["type"];

interface Props {
  itemType: "session" | "competition";
  itemId: string;
  initialCounts: Record<string, number>;
  initialMyReaction: string | null;
}

export default function FeedReactionButton({
  itemType,
  itemId,
  initialCounts,
  initialMyReaction,
}: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(
    REACTIONS.reduce((acc, r) => ({ ...acc, [r.type]: initialCounts[r.type] ?? 0 }), {} as Record<string, number>)
  );
  const [myReaction, setMyReaction] = useState<string | null>(initialMyReaction);
  const [loading, setLoading] = useState(false);

  const react = async (type: ReactionType) => {
    if (loading) return;
    haptic("light");

    // Optimistic update
    const prev = myReaction;
    const prevCounts = { ...counts };
    if (prev === type) {
      // Toggle off
      setMyReaction(null);
      setCounts((c) => ({ ...c, [type]: Math.max(0, (c[type] ?? 0) - 1) }));
    } else {
      // Switch or add
      if (prev) setCounts((c) => ({ ...c, [prev]: Math.max(0, (c[prev] ?? 0) - 1) }));
      setCounts((c) => ({ ...c, [type]: (c[type] ?? 0) + 1 }));
      setMyReaction(type);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, reaction_type: type }),
      });
      const data = await res.json();
      if (data.counts) setCounts(data.counts);
      setMyReaction(data.userReaction ?? null);
    } catch {
      // Revert
      setMyReaction(prev);
      setCounts(prevCounts);
    } finally {
      setLoading(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((r) => {
        const isActive = myReaction === r.type;
        const count = counts[r.type] ?? 0;
        return (
          <button
            key={r.type}
            onClick={() => react(r.type)}
            title={r.label}
            className={`flex items-center gap-0.5 text-xs px-1.5 py-1 rounded-full border transition-all active:scale-95 ${
              isActive
                ? "border-orange bg-orange-light"
                : "border-gray-100 hover:border-gray-200 bg-transparent"
            }`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            {count > 0 && (
              <span className={`text-xs font-medium leading-none ${isActive ? "text-orange" : "text-gray-400"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
      {total > 0 && (
        <span className="text-xs text-gray-300 ml-0.5">{total}</span>
      )}
    </div>
  );
}
