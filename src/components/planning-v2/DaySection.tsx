"use client";

import { format, isToday, isFuture } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Calendar } from "lucide-react";
import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";
import type { DayState, AISuggestion, PlanningHorse } from "./types";
import { getLoadColor } from "./constants";
import SessionCard from "./SessionCard";
import InlineSuggestion from "./InlineSuggestion";

interface Props {
  date: Date;
  sessions: TrainingSession[];
  planned: TrainingPlannedSession[];
  dayState: DayState;
  horses?: PlanningHorse[];
  suggestion?: AISuggestion | null;
  onAddSession: (date: Date) => void;
  onPlanSession: (date: Date) => void;
  onCheckDone: (planned: TrainingPlannedSession) => void;
  onEditPlanned: (planned: TrainingPlannedSession) => void;
  onSkipPlanned: (planned: TrainingPlannedSession) => void;
  onEditDone: (session: TrainingSession) => void;
  onAcceptSuggestion?: (suggestion: AISuggestion) => void;
  onDragStart?: (e: React.DragEvent, planned: TrainingPlannedSession) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

function getHorseName(horseId: string, horses?: PlanningHorse[]): string | undefined {
  if (!horses || horses.length <= 1) return undefined;
  return horses.find((h) => h.id === horseId)?.name;
}

export default function DaySection({
  date,
  sessions,
  planned,
  dayState,
  horses,
  suggestion,
  onAddSession,
  onPlanSession,
  onCheckDone,
  onEditPlanned,
  onSkipPlanned,
  onEditDone,
  onAcceptSuggestion,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  const today = isToday(date);
  const future = isFuture(date);
  const dateLabel = format(date, "EEEE d MMMM", { locale: fr });
  const isEmpty = sessions.length === 0 && planned.length === 0;

  return (
    <div
      className={`rounded-2xl border transition-colors ${
        today ? "border-orange/30 bg-orange-light/10" : "border-gray-100 bg-white"
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-bold capitalize ${today ? "text-orange" : "text-black"}`}>
            {dateLabel}
          </p>
          {today && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-orange text-white">
              Aujourd&apos;hui
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Barre de charge */}
          {dayState.totalMinutes > 0 && (
            <div className="flex items-center gap-1">
              <div className={`w-8 h-1.5 rounded-full ${getLoadColor(dayState.totalMinutes)}`} />
              <span className="text-2xs text-gray-400">{dayState.totalMinutes}min</span>
            </div>
          )}
          {/* Boutons d'ajout */}
          <div className="flex items-center gap-1">
            {(today || future) && (
              <button
                onClick={() => onPlanSession(date)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Planifier"
              >
                <Calendar className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onAddSession(date)}
              className="p-1.5 rounded-lg text-orange hover:bg-orange-light transition-colors"
              title="Enregistrer une séance"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 py-3 space-y-2">
        {/* Séances planifiées */}
        {planned.map((p) => (
          <SessionCard
            key={p.id}
            data={{ source: "planned", planned: p, horseName: getHorseName(p.horse_id, horses) }}
            onCheckDone={() => onCheckDone(p)}
            onEdit={() => onEditPlanned(p)}
            onSkip={() => onSkipPlanned(p)}
            draggable
            onDragStart={onDragStart ? (e) => onDragStart(e, p) : undefined}
          />
        ))}

        {/* Séances réalisées */}
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            data={{ source: "done", session: s, horseName: getHorseName(s.horse_id, horses) }}
            onEdit={() => onEditDone(s)}
          />
        ))}

        {/* Suggestion IA si jour vide et futur */}
        {isEmpty && future && suggestion && onAcceptSuggestion && (
          <InlineSuggestion
            suggestion={suggestion}
            onAccept={() => onAcceptSuggestion(suggestion)}
          />
        )}

        {/* Empty state */}
        {isEmpty && !suggestion && (
          <p className="text-xs text-gray-300 text-center py-2">Repos</p>
        )}
      </div>
    </div>
  );
}
