"use client";

import { Flame } from "lucide-react";

interface Props {
  current: number;
  best: number;
  target: number;
  size?: "sm" | "md";
}

export default function StreakBadge({ current, best, target, size = "md" }: Props) {
  if (current === 0 && best === 0) return null;

  const isActive = current > 0;
  const isMilestone = current >= 4;

  if (size === "sm") {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isActive
            ? isMilestone
              ? "bg-orange text-white"
              : "bg-orange-light text-orange"
            : "bg-gray-100 text-gray-400"
        }`}
        title={`Streak actuel : ${current} sem. · Record : ${best} sem. · Objectif : ${target} séances/sem.`}
      >
        <Flame className={`h-3 w-3 ${isActive ? "" : "opacity-40"}`} />
        {current > 0 ? current : best > 0 ? `${best}` : "0"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Current streak */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          isActive
            ? isMilestone
              ? "border-orange bg-orange-light"
              : "border-orange/30 bg-orange-light"
            : "border-gray-100 bg-gray-50"
        }`}
      >
        <Flame
          className={`h-4 w-4 ${isActive ? "text-orange" : "text-gray-300"}`}
        />
        <div>
          <p className={`text-base font-black leading-none ${isActive ? "text-orange" : "text-gray-400"}`}>
            {current}
          </p>
          <p className="text-2xs text-gray-400 leading-tight">sem. consécutives</p>
        </div>
      </div>

      {/* Best streak */}
      {best > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50">
          <span className="text-base">🏆</span>
          <div>
            <p className="text-base font-black leading-none text-gray-600">{best}</p>
            <p className="text-2xs text-gray-400 leading-tight">record</p>
          </div>
        </div>
      )}

      {/* Target */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span>Objectif</span>
        <span className="font-bold text-gray-600">{target}×/sem.</span>
      </div>
    </div>
  );
}
