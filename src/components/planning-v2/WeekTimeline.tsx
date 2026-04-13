"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  addWeeks,
  addDays,
  format,
  isToday,
  isSameWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { TrainingSession, TrainingPlannedSession, TrainingType, HorseIndexMode } from "@/lib/supabase/types";
import type { PlanningHorse, AISuggestion } from "./types";
import { buildPlanningData } from "./usePlanningData";
import DaySection from "./DaySection";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import type { PrefillData } from "@/components/training/QuickTrainingModal";

interface Props {
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  horses: PlanningHorse[];
  singleHorse?: boolean;
  horseId?: string;
  horseMode?: string | null;
}

export default function WeekTimeline({
  sessions,
  plannedSessions,
  horses,
  singleHorse = false,
  horseId,
  horseMode,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Date ────────────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  useEffect(() => { setNow(new Date()); }, []);

  // ── Modals ───────────────────────────────────────────────────────────────
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalHorseId, setQuickModalHorseId] = useState<string>("");
  const [quickPrefill, setQuickPrefill] = useState<PrefillData | null>(null);

  // ── Suggestions IA ─────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ── Drag & drop ────────────────────────────────────────────────────────
  const dragRef = useRef<{ id: string; horseId: string } | null>(null);

  // ── Swipe ──────────────────────────────────────────────────────────────
  const touchRef = useRef<number | null>(null);

  const { getDayState, getSessionsForDay, getPlannedForDay } = buildPlanningData(sessions, plannedSessions);

  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const isCurrentWeek = isSameWeek(now, weekStart, { weekStartsOn: 1 });

  const weekLabel = isCurrentWeek
    ? "Cette semaine"
    : `${format(weekStart, "d MMM", { locale: fr })} — ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;

  // ── Résumé semaine ─────────────────────────────────────────────────────
  const weekSessions = days.flatMap((d) => getSessionsForDay(format(d, "yyyy-MM-dd")));
  const weekPlanned = days.flatMap((d) => getPlannedForDay(format(d, "yyyy-MM-dd")));
  const totalSessions = weekSessions.filter((s) => s.type !== "marcheur" && s.type !== "paddock" && !s.est_complement).length;
  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.duration_min, 0);
  const completionDenom = totalSessions + weekPlanned.length;
  const completionPct = completionDenom > 0 ? Math.round((totalSessions / completionDenom) * 100) : null;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleAddSession = (_date: Date) => {
    const targetHorse = singleHorse && horseId ? horseId : horses[0]?.id;
    if (!targetHorse) return;
    setQuickModalHorseId(targetHorse);
    setQuickPrefill(null);
    setQuickModalOpen(true);
  };

  const handlePlanSession = (_date: Date) => {
    const targetHorse = singleHorse && horseId ? horseId : horses[0]?.id;
    if (!targetHorse) return;
    setQuickModalHorseId(targetHorse);
    setQuickPrefill(null);
    setQuickModalOpen(true);
  };

  const handleCheckDone = async (planned: TrainingPlannedSession) => {
    const { data: newSession, error: insertErr } = await supabase
      .from("training_sessions")
      .insert({
        horse_id: planned.horse_id,
        date: planned.date,
        type: planned.type,
        duration_min: planned.duration_min_target ?? 45,
        intensity: planned.intensity_target ?? 3,
        feeling: 3,
        rider: planned.qui_sen_occupe ?? null,
        notes: planned.notes ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !newSession) {
      toast.error("Erreur lors de l'enregistrement");
      return;
    }

    await supabase
      .from("training_planned_sessions")
      .update({ linked_session_id: newSession.id })
      .eq("id", planned.id);

    toast.success("Séance cochée !");
    startTransition(() => router.refresh());
  };

  const handleEditPlanned = (planned: TrainingPlannedSession) => {
    setQuickModalHorseId(planned.horse_id);
    setQuickPrefill({
      type: planned.type,
      rider: planned.qui_sen_occupe ?? null,
      duration: planned.duration_min_target ?? null,
    });
    setQuickModalOpen(true);
  };

  const handleSkipPlanned = async (planned: TrainingPlannedSession) => {
    await supabase
      .from("training_planned_sessions")
      .update({ status: "skipped" })
      .eq("id", planned.id);
    toast.success("Séance reportée");
    startTransition(() => router.refresh());
  };

  const handleEditDone = (session: TrainingSession) => {
    setQuickModalHorseId(session.horse_id);
    setQuickPrefill({
      type: session.type,
      rider: session.rider ?? null,
      duration: session.duration_min,
    });
    setQuickModalOpen(true);
  };

  const handleSuggestAI = async () => {
    if (!horseId) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggest-training-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId, weekStart: format(weekStart, "yyyy-MM-dd") }),
      });
      if (res.ok) {
        const { count } = await res.json();
        toast.success(`${count} séance(s) suggérée(s) par l'IA !`);
        startTransition(() => router.refresh());
      }
    } catch {
      toast.error("Erreur IA");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    const targetHorse = singleHorse && horseId ? horseId : horses[0]?.id;
    if (!targetHorse) return;
    await supabase.from("training_planned_sessions").insert({
      horse_id: targetHorse,
      date: suggestion.date,
      type: suggestion.type as TrainingType,
      duration_min_target: suggestion.duration_min,
      intensity_target: suggestion.intensity,
      notes: suggestion.notes ?? null,
    } as Partial<TrainingPlannedSession>);
    toast.success("Suggestion acceptée !");
    startTransition(() => router.refresh());
  };

  // ── Drag & drop handlers ──────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, planned: TrainingPlannedSession) => {
    dragRef.current = { id: planned.id, horseId: planned.horse_id };
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!dragRef.current) return;
    const newDate = format(targetDate, "yyyy-MM-dd");
    await supabase
      .from("training_planned_sessions")
      .update({ date: newDate })
      .eq("id", dragRef.current.id);
    dragRef.current = null;
    toast.success("Séance déplacée");
    startTransition(() => router.refresh());
  };

  // ── Swipe handlers ─────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchRef.current;
    if (Math.abs(delta) > 50) {
      setWeekOffset((o) => o + (delta < 0 ? 1 : -1));
    }
    touchRef.current = null;
  };

  return (
    <div
      className="space-y-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Navigation semaine ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>

        <div className="text-center">
          <p className="text-sm font-bold text-black">{weekLabel}</p>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-2xs text-orange hover:underline"
            >
              Revenir à cette semaine
            </button>
          )}
        </div>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* ── Résumé semaine ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 py-2">
        <span className="text-xs text-gray-500">
          <span className="font-bold text-black">{totalSessions}</span> séance{totalSessions > 1 ? "s" : ""}
        </span>
        <span className="text-xs text-gray-300">|</span>
        <span className="text-xs text-gray-500">
          <span className="font-bold text-black">{totalMinutes}</span> min
        </span>
        {completionPct !== null && (
          <>
            <span className="text-xs text-gray-300">|</span>
            <span className={`text-xs font-bold ${completionPct >= 80 ? "text-green-600" : completionPct >= 50 ? "text-orange" : "text-red-500"}`}>
              {completionPct}%
            </span>
          </>
        )}
        {singleHorse && (
          <>
            <span className="text-xs text-gray-300">|</span>
            <button
              onClick={handleSuggestAI}
              disabled={loadingSuggestions}
              className="text-xs text-orange hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {loadingSuggestions ? "..." : "Suggérer IA"}
            </button>
          </>
        )}
      </div>

      {/* ── Timeline verticale ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const daySessions = getSessionsForDay(dateKey);
          const dayPlanned = getPlannedForDay(dateKey);
          const dayState = getDayState(dateKey);
          const daySuggestion = suggestions.find((s) => s.date === dateKey) ?? null;

          return (
            <DaySection
              key={dateKey}
              date={day}
              sessions={daySessions}
              planned={dayPlanned}
              dayState={dayState}
              horses={singleHorse ? undefined : horses}
              suggestion={daySuggestion}
              onAddSession={handleAddSession}
              onPlanSession={handlePlanSession}
              onCheckDone={handleCheckDone}
              onEditPlanned={handleEditPlanned}
              onSkipPlanned={handleSkipPlanned}
              onEditDone={handleEditDone}
              onAcceptSuggestion={handleAcceptSuggestion}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            />
          );
        })}
      </div>

      {/* ── QuickTrainingModal ──────────────────────────────────────────── */}
      {quickModalOpen && (
        <QuickTrainingModal
          horseId={quickModalHorseId}
          open={quickModalOpen}
          onClose={() => setQuickModalOpen(false)}
          onSaved={() => {
            setQuickModalOpen(false);
            startTransition(() => router.refresh());
          }}
          prefill={quickPrefill ?? undefined}
          horseMode={(horseMode as HorseIndexMode) ?? undefined}
        />
      )}
    </div>
  );
}
