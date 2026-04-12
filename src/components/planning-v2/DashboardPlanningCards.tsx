"use client";

import { useState, useEffect } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  addDays,
  format,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";
import HorseAvatar from "@/components/ui/HorseAvatar";
import { getTypeEmoji, getTypeColor, isComplement } from "./constants";

interface HorseRow {
  id: string;
  name: string;
  avatar_url: string | null;
  horse_index_mode: string | null;
}

interface Props {
  horses: HorseRow[];
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export default function DashboardPlanningCards({ horses, sessions, plannedSessions }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  if (!now || horses.length === 0) return null;

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Indexer sessions et planned par horse+date
  const sessionIndex: Record<string, TrainingSession[]> = {};
  for (const s of sessions) {
    const key = `${s.horse_id}_${s.date.slice(0, 10)}`;
    if (!sessionIndex[key]) sessionIndex[key] = [];
    sessionIndex[key].push(s);
  }
  const plannedIndex: Record<string, TrainingPlannedSession[]> = {};
  for (const p of plannedSessions) {
    if (p.status !== "planned" || p.linked_session_id) continue;
    const key = `${p.horse_id}_${p.date.slice(0, 10)}`;
    if (!plannedIndex[key]) plannedIndex[key] = [];
    plannedIndex[key].push(p);
  }

  return (
    <div className="space-y-3">
      {horses.map((horse) => (
        <Link
          key={horse.id}
          href={`/horses/${horse.id}/training`}
          className="card card-hover flex flex-col gap-3"
        >
          {/* Header cheval */}
          <div className="flex items-center gap-3">
            <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" />
            <span className="flex-1 text-sm font-bold text-black">{horse.name}</span>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>

          {/* Grille semaine */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const key = `${horse.id}_${dateKey}`;
              const daySessions = sessionIndex[key] ?? [];
              const dayPlanned = plannedIndex[key] ?? [];
              const today = isToday(day);

              // Session principale (pas complement)
              const mainSession = daySessions.find((s) => !isComplement(s.type) && !s.est_complement);
              const mainPlanned = dayPlanned[0];
              const complement = daySessions.find((s) => isComplement(s.type) || s.est_complement);

              return (
                <div
                  key={dateKey}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg ${
                    today ? "bg-orange-light/30 ring-1 ring-orange/20" : ""
                  }`}
                >
                  <span className={`text-2xs font-bold ${today ? "text-orange" : "text-gray-400"}`}>
                    {DAY_LABELS[i]}
                  </span>

                  {/* Mini-barre séance */}
                  <div className="w-full px-0.5 h-5 flex items-center justify-center">
                    {mainSession ? (
                      <div className={`w-full h-4 rounded ${getTypeColor(mainSession.type).bg} flex items-center justify-center gap-0.5`}>
                        <span className="text-2xs leading-none">{getTypeEmoji(mainSession.type)}</span>
                        <span className={`text-2xs font-bold ${getTypeColor(mainSession.type).text} leading-none`}>
                          {mainSession.duration_min}′
                        </span>
                      </div>
                    ) : mainPlanned ? (
                      <div className="w-full h-4 rounded border border-dashed border-gray-300 flex items-center justify-center gap-0.5">
                        <span className="text-2xs leading-none">{getTypeEmoji(mainPlanned.type)}</span>
                        <span className="text-2xs text-gray-400 leading-none">
                          {mainPlanned.duration_min_target ?? 45}′
                        </span>
                      </div>
                    ) : complement ? (
                      <div className="w-full h-3 rounded bg-gray-100 flex items-center justify-center">
                        <span className="text-2xs leading-none">{getTypeEmoji(complement.type)}</span>
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Link>
      ))}
    </div>
  );
}
