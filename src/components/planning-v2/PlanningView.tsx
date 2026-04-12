"use client";

import { useState } from "react";
import { CalendarDays, LayoutList } from "lucide-react";
import { startOfWeek, differenceInWeeks } from "date-fns";
import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";
import type { ViewMode, PlanningHorse } from "./types";
import WeekTimeline from "./WeekTimeline";
import MonthCalendar from "./MonthCalendar";

interface Props {
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  horses: PlanningHorse[];
  /** Mode single-horse : masque le filtre chevaux */
  singleHorse?: boolean;
  horseId?: string;
  horseMode?: string | null;
}

export default function PlanningView({
  sessions,
  plannedSessions,
  horses,
  singleHorse = false,
  horseId,
  horseMode,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("semaine");
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>(
    horses.map((h) => h.id)
  );

  // Filtrage par cheval sélectionné
  const filteredSessions = singleHorse
    ? sessions
    : sessions.filter((s) => selectedHorseIds.includes(s.horse_id));
  const filteredPlanned = singleHorse
    ? plannedSessions
    : plannedSessions.filter((p) => selectedHorseIds.includes(p.horse_id));

  const toggleHorse = (id: string) => {
    setSelectedHorseIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleDayClick = (date: Date) => {
    setViewMode("semaine");
    // WeekTimeline gère son propre weekOffset — on pourrait le synchroniser
    // mais pour simplifier, on laisse l'utilisateur naviguer
  };

  return (
    <div className="space-y-4">
      {/* ── Header : toggle vue + filtre chevaux ──────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Toggle semaine / mois */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode("semaine")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "semaine"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Semaine
          </button>
          <button
            onClick={() => setViewMode("mois")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "mois"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Mois
          </button>
        </div>

        {/* Filtre chevaux (multi-cheval uniquement) */}
        {!singleHorse && horses.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedHorseIds(horses.map((h) => h.id))}
              className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-colors flex-shrink-0 ${
                selectedHorseIds.length === horses.length
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Tous
            </button>
            {horses.map((horse) => (
              <button
                key={horse.id}
                onClick={() => toggleHorse(horse.id)}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-colors flex-shrink-0 ${
                  selectedHorseIds.includes(horse.id)
                    ? "bg-orange text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {horse.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────── */}
      {viewMode === "semaine" ? (
        <WeekTimeline
          sessions={filteredSessions}
          plannedSessions={filteredPlanned}
          horses={horses}
          singleHorse={singleHorse}
          horseId={horseId}
          horseMode={horseMode}
        />
      ) : (
        <MonthCalendar
          sessions={filteredSessions}
          plannedSessions={filteredPlanned}
          onDayClick={handleDayClick}
        />
      )}
    </div>
  );
}
