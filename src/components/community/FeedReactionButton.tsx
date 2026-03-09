"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  itemType: "session" | "competition";
  itemId: string;
  initialCount: number;
  initialLiked: boolean;
}

export default function FeedReactionButton({ itemType, itemId, initialCount, initialLiked }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    // Optimistic update
    setLiked(!liked);
    setCount((c) => (liked ? c - 1 : c + 1));
    setLoading(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId }),
      });
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      // Revert on error
      setLiked(liked);
      setCount(initialCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all",
        liked
          ? "border-orange bg-orange-light text-orange"
          : "border-gray-200 text-gray-400 hover:border-orange hover:text-orange"
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", liked && "fill-orange")} />
      <span>{liked ? "Aimé" : "J'aime"}{count > 0 ? ` · ${count}` : ""}</span>
    </button>
  );
}
