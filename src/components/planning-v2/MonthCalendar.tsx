"use client";

import { useState, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isToday,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";
import { usePlanningData } from "./usePlanningData";
import { getLoadColor } from "./constants";

interface Props {
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  onDayClick: (date: Date) => void;
}

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MonthCalendar({ sessions, plannedSessions, onDayClick }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  useEffect(() => { setNow(new Date()); }, []);

  const { getDayState, getDayLoad } = usePlanningData(sessions, plannedSessions);

  if (!now) return null;

  const monthStart = startOfMonth(addMonths(now, monthOffset));
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const monthLabel = format(monthStart, "MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-3">
      {/* Navigation mois */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-black capitalize">{monthLabel}</p>
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="text-2xs text-orange hover:underline"
            >
              Mois courant
            </button>
          )}
        </div>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Grille calendrier */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center py-2">
              <span className="text-2xs font-bold text-gray-400 uppercase">{d}</span>
            </div>
          ))}
        </div>

        {/* Jours */}
        <div className="grid grid-cols-7">
          {allDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, monthStart);
            const today = isToday(day);
            const dayState = getDayState(dateKey);
            const load = getDayLoad(dateKey);
            const hasPlanned = dayState.plannedCount > 0;
            const hasDone = dayState.doneCount > 0 || dayState.complementCount > 0;

            // Hauteur barre proportionnelle (max 16px pour 120min+)
            const barHeight = load > 0 ? Math.min(16, Math.max(4, Math.round((load / 120) * 16))) : 0;

            return (
              <button
                key={dateKey}
                onClick={() => onDayClick(day)}
                className={`relative flex flex-col items-center justify-between py-2 px-1 min-h-[56px] border-b border-r border-gray-50 transition-colors hover:bg-gray-50 ${
                  !inMonth ? "opacity-30" : ""
                }`}
              >
                {/* Numéro du jour */}
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    today
                      ? "bg-orange text-white"
                      : "text-gray-700"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {/* Barre de charge */}
                <div className="w-full px-1 mt-1">
                  {barHeight > 0 ? (
                    <div
                      className={`w-full rounded-sm ${getLoadColor(load)} ${
                        hasDone ? "" : "opacity-40"
                      } ${hasPlanned && !hasDone ? "border border-dashed border-gray-400 bg-transparent" : ""}`}
                      style={{ height: `${barHeight}px` }}
                    />
                  ) : hasPlanned ? (
                    <div
                      className="w-full rounded-sm border border-dashed border-gray-300"
                      style={{ height: "4px" }}
                    />
                  ) : (
                    <div style={{ height: "4px" }} />
                  )}
                </div>

                {/* Minutes en texte (si > 0) */}
                {load > 0 && (
                  <span className="text-2xs text-gray-400 mt-0.5">{load}′</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 text-2xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-green-400" />
          <span>&lt; 45min</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-orange" />
          <span>45-90min</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-red-500" />
          <span>&gt; 90min</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm border border-dashed border-gray-400" />
          <span>Planifié</span>
        </div>
      </div>
    </div>
  );
}
