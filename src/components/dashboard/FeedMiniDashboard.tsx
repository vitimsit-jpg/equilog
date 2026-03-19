"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, X, Dumbbell, Trophy } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface FeedItem {
  id: string;
  type: "session" | "competition";
  horseName: string;
  label: string;
  date: string;
}

interface Props {
  items: FeedItem[];
}

const DISMISS_KEY = "equistra_feed_dashboard_dismissed";

export default function FeedMiniDashboard({ items }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem(DISMISS_KEY) === today) setDismissed(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().split("T")[0]);
    setDismissed(true);
  };

  if (dismissed || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <h2 className="font-bold text-black">À l&apos;écurie</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/communaute" className="text-xs text-orange hover:underline">Voir tout →</Link>
          <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="card divide-y divide-gray-50">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === "competition" ? "bg-orange-light" : "bg-gray-100"}`}>
              {item.type === "competition"
                ? <Trophy className="h-3.5 w-3.5 text-orange" />
                : <Dumbbell className="h-3.5 w-3.5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">{item.horseName}</p>
              <p className="text-xs text-gray-400 truncate">{item.label}</p>
            </div>
            <span className="text-xs text-gray-300 flex-shrink-0">{formatDate(item.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
