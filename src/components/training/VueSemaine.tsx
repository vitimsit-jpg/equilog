"use client";

import { useState, useTransition, useRef } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  addWeeks,
  subWeeks,
  parseISO,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Check, X, Pencil, Copy, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { TrainingSession, TrainingPlannedSession, TrainingType } from "@/lib/supabase/types";
import { TRAINING_TYPE_LABELS, TRAINING_EMOJIS } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import QuickTrainingModal, { DISCIPLINE_ITEMS, INTENSITY_OPTIONS, RIDER_OPTIONS } from "./QuickTrainingModal";
import type { PrefillData } from "./QuickTrainingModal";

const HEALTH_DOT: Record<string, string> = {
  vaccin: "bg-green-400",
  vermifuge: "bg-teal-400",
  dentiste: "bg-blue-400",
  osteo: "bg-purple-400",
  ferrage: "bg-gray-400",
  veterinaire: "bg-red-400",
  masseuse: "bg-pink-400",
  autre: "bg-gray-300",
};

interface Props {
  horseId: string;
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  healthRecords?: { id: string; type: string; date: string }[];
  horseMode?: string | null;
}

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120, 150];

type DayState = "REPOS" | "PLANIFIE" | "AUJOURD_HUI" | "A_LOGGER" | "FAIT";

type PlanFormState = {
  type: TrainingType;
  duration_min_target: string;
  notes: string;
  date: string;
  qui_sen_occupe: string;
  intensity_target: string;
};

interface ConfirmToast {
  sessionId: string;
  type: string;
  dateKey: string;
  intensity: number;
  feeling: number;
}

function getDayState(isCurrentDay: boolean, isPast: boolean, hasSessions: boolean, hasActivePlanned: boolean): DayState {
  if (hasSessions) return "FAIT";
  if (isCurrentDay && hasActivePlanned) return "AUJOURD_HUI";
  if (isPast && hasActivePlanned) return "A_LOGGER";
  if (!isPast && !isCurrentDay && hasActivePlanned) return "PLANIFIE";
  return "REPOS";
}

function getCompletionColor(pct: number | null, weekOffset: number): string {
  if (pct === null) return "text-gray-400";
  if (weekOffset !== 0) return pct >= 80 ? "text-success" : pct >= 50 ? "text-orange" : "text-danger";
  const dow = new Date().getDay();
  if (dow >= 1 && dow <= 3) return "text-gray-500";
  if (dow === 4 || dow === 5) return pct < 50 ? "text-orange" : "text-success";
  return pct < 80 ? "text-danger" : "text-success";
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function VueSemaine({ horseId, sessions, plannedSessions, healthRecords, horseMode }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editPlanned, setEditPlanned] = useState<TrainingPlannedSession | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>({
    type: "dressage",
    duration_min_target: "45",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    qui_sen_occupe: "",
    intensity_target: "",
  });
  const [logPrefill, setLogPrefill] = useState<PrefillData | null>(null);
  const [durationOther, setDurationOther] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [copyingPrev, setCopyingPrev] = useState(false);
  const [suggestingIA, setSuggestingIA] = useState(false);
  const [confirmToast, setConfirmToast] = useState<ConfirmToast | null>(null);

  // Swipe refs
  const stripSwipeRef = useRef<number | null>(null);
  const zoneSwipeRef = useRef<number | null>(null);

  // ── Week computation ──────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekBase =
    weekOffset === 0 ? new Date() :
    weekOffset > 0 ? addWeeks(new Date(), weekOffset) :
    subWeeks(new Date(), -weekOffset);

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekBase, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const isPastDay = (day: Date): boolean => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isWeekFutureOrCurrent = weekOffset >= 0;

  // selectedDateKey — always valid within current week
  const selectedDateKey = days.some(d => format(d, "yyyy-MM-dd") === selectedDayKey)
    ? selectedDayKey
    : format(days[0], "yyyy-MM-dd");

  // ── Navigate week / day ───────────────────────────────────────────
  const navigateWeek = (dir: -1 | 1) => {
    const newOffset = weekOffset + dir;
    setWeekOffset(newOffset);
    if (newOffset === 0) {
      setSelectedDayKey(format(new Date(), "yyyy-MM-dd"));
    } else {
      const newBase = dir > 0 ? addWeeks(weekBase, 1) : subWeeks(weekBase, 1);
      const newStart = startOfWeek(newBase, { weekStartsOn: 1 });
      setSelectedDayKey(format(newStart, "yyyy-MM-dd"));
    }
  };

  const navigateDay = (dir: -1 | 1) => {
    const idx = days.findIndex(d => format(d, "yyyy-MM-dd") === selectedDateKey);
    const newIdx = Math.max(0, Math.min(6, idx + dir));
    setSelectedDayKey(format(days[newIdx], "yyyy-MM-dd"));
  };

  // ── Index by date ─────────────────────────────────────────────────
  const sessionsByDate: Record<string, TrainingSession[]> = {};
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  }

  const plannedByDate: Record<string, TrainingPlannedSession[]> = {};
  for (const p of plannedSessions) {
    const key = p.date.slice(0, 10);
    if (!plannedByDate[key]) plannedByDate[key] = [];
    plannedByDate[key].push(p);
  }

  const healthByDate: Record<string, { type: string }[]> = {};
  for (const h of (healthRecords || [])) {
    const key = h.date.slice(0, 10);
    if (!healthByDate[key]) healthByDate[key] = [];
    healthByDate[key].push({ type: h.type });
  }

  // ── Week stats ────────────────────────────────────────────────────
  const weekSessionsList = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= weekStart && d <= weekEnd;
  });
  const weekPlannedList = plannedSessions.filter((p) => {
    const d = parseISO(p.date);
    return d >= weekStart && d <= weekEnd && p.status === "planned";
  });
  const weekMainSessionsList = weekSessionsList.filter((s) => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock");
  const weekMinutes = weekMainSessionsList.reduce((acc, s) => acc + s.duration_min, 0);
  const completionDenom = weekMainSessionsList.length + weekPlannedList.length;
  const completion = completionDenom > 0
    ? Math.round((weekMainSessionsList.length / completionDenom) * 100)
    : null;

  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);
  const prevWeekPlanned = plannedSessions.filter((p) => {
    const d = parseISO(p.date);
    return d >= prevWeekStart && d <= prevWeekEnd && p.status === "planned";
  });
  const currentWeekHasPlanned = plannedSessions.some((p) => {
    const d = parseISO(p.date);
    return d >= weekStart && d <= weekEnd;
  });
  const canCopyPrev = isWeekFutureOrCurrent && !currentWeekHasPlanned && prevWeekPlanned.length > 0;
  const hasEverPlanned = plannedSessions.length > 0;
  // Considérer aussi les sessions loggées (incluant paddock) pour masquer l'état first-use
  const hasEverAnyActivity = hasEverPlanned || sessions.length > 0;

  // ── Presence circle helper ────────────────────────────────────────
  const getPresence = (dateKey: string) => {
    const activePlanned = (plannedByDate[dateKey] || []).filter(p => p.status === "planned");
    const doneSessions = (sessionsByDate[dateKey] || []).filter(
      s => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock"
    );

    let hasOwner = false;
    let hasCoach = false;

    for (const p of activePlanned) {
      if (p.qui_sen_occupe === "owner" || p.qui_sen_occupe === "longe" || p.qui_sen_occupe === "travail_a_pied") hasOwner = true;
      if (p.qui_sen_occupe === "owner_with_coach") { hasOwner = true; hasCoach = true; }
      if (p.qui_sen_occupe === "coach") hasCoach = true;
    }
    for (const s of doneSessions) {
      if (s.rider === "owner" || s.rider === "longe" || s.rider === "travail_a_pied") hasOwner = true;
      if (s.rider === "owner_with_coach") { hasOwner = true; hasCoach = true; }
      if (s.rider === "coach") hasCoach = true;
    }

    const hasAnySessions = (sessionsByDate[dateKey] || []).length > 0;
    const complementOnly = hasAnySessions && doneSessions.length === 0 && activePlanned.length === 0;

    return { hasOwner, hasCoach, complementOnly };
  };

  // ── Business logic ────────────────────────────────────────────────
  const openPlanModal = (dateStr: string, planned?: TrainingPlannedSession) => {
    if (planned) {
      setEditPlanned(planned);
      const dur = planned.duration_min_target ? String(planned.duration_min_target) : "45";
      setDurationOther(!DURATION_PRESETS.includes(planned.duration_min_target ?? 0));
      setPlanForm({
        type: planned.type,
        duration_min_target: dur,
        notes: planned.notes || "",
        date: planned.date,
        qui_sen_occupe: planned.qui_sen_occupe ?? "",
        intensity_target: planned.intensity_target ? String(planned.intensity_target) : "",
      });
    } else {
      setEditPlanned(null);
      setDurationOther(false);
      setPlanForm({ type: "dressage", duration_min_target: "45", notes: "", date: dateStr, qui_sen_occupe: "", intensity_target: "" });
    }
    setShowPlanModal(true);
  };

  const openLogModal = (dateStr: string, fromPlanned?: TrainingPlannedSession) => {
    setSelectedDate(dateStr);
    if (fromPlanned) {
      setLogPrefill({
        type: fromPlanned.type,
        rider: fromPlanned.qui_sen_occupe ?? null,
        duration: fromPlanned.duration_min_target ?? null,
        intensity: fromPlanned.intensity_target ? fromPlanned.intensity_target : null,
        duree_planifiee: fromPlanned.duration_min_target ?? null,
      });
    } else {
      setLogPrefill(null);
    }
    setShowLogModal(true);
  };

  const handleConfirmSession = async (planned: TrainingPlannedSession, dateKey: string) => {
    const intensity = planned.intensity_target ?? 3;
    const payload = {
      horse_id: horseId,
      date: dateKey,
      type: planned.type,
      duration_min: planned.duration_min_target ?? 45,
      intensity: intensity as 1 | 2 | 3 | 4 | 5,
      feeling: 3 as const,
      notes: null,
      rider: planned.qui_sen_occupe ?? null,
      coach_present: null,
      mode_entree: "planifie" as const,
      est_complement: planned.type === "marcheur" || planned.type === "paddock",
      duree_planifiee: planned.duration_min_target ?? null,
    };
    const { data, error } = await supabase.from("training_sessions").insert(payload).select("id").single();
    if (error) { toast.error("Erreur"); return; }
    setConfirmToast({ sessionId: data.id, type: planned.type, dateKey, intensity, feeling: 3 });
    startTransition(() => router.refresh());
  };

  const updateConfirmToast = async (field: "intensity" | "feeling", value: number) => {
    if (!confirmToast) return;
    const updated = { ...confirmToast, [field]: value };
    setConfirmToast(updated);
    await supabase.from("training_sessions")
      .update({ [field]: value })
      .eq("id", confirmToast.sessionId);
  };

  const dismissConfirmToast = () => setConfirmToast(null);

  const savePlanned = async () => {
    setSavingPlan(true);
    try {
      const payload = {
        horse_id: horseId,
        date: planForm.date,
        type: planForm.type,
        duration_min_target: parseInt(planForm.duration_min_target) || 45,
        notes: planForm.notes || null,
        qui_sen_occupe: planForm.qui_sen_occupe || null,
        intensity_target: planForm.intensity_target ? parseInt(planForm.intensity_target) as (1 | 2 | 3 | 4 | 5) : null,
      };
      const { error } = editPlanned
        ? await supabase.from("training_planned_sessions").update(payload).eq("id", editPlanned.id)
        : await supabase.from("training_planned_sessions").insert(payload);
      if (error) {
        toast.error("Erreur lors de l'enregistrement");
      } else {
        toast.success(editPlanned ? "Séance mise à jour" : "Séance planifiée !");
        setShowPlanModal(false);
        setEditPlanned(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setSavingPlan(false);
    }
  };

  const skipPlanned = async (id: string) => {
    const { error } = await supabase
      .from("training_planned_sessions")
      .update({ status: "skipped" })
      .eq("id", id);
    if (error) toast.error("Erreur");
    else startTransition(() => router.refresh());
  };

  const deletePlanned = async (id: string) => {
    const { error } = await supabase.from("training_planned_sessions").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Séance supprimée"); startTransition(() => router.refresh()); }
  };

  const copyPrevWeek = async () => {
    if (!canCopyPrev) return;
    setCopyingPrev(true);
    const toInsert = prevWeekPlanned.map((p) => ({
      horse_id: horseId,
      date: format(addDays(parseISO(p.date), 7), "yyyy-MM-dd"),
      type: p.type,
      duration_min_target: p.duration_min_target,
      intensity_target: p.intensity_target,
      notes: p.notes,
    }));
    const { error } = await supabase.from("training_planned_sessions").insert(toInsert);
    if (error) toast.error("Erreur lors de la copie");
    else {
      toast.success(`${toInsert.length} séance${toInsert.length > 1 ? "s" : ""} copiée${toInsert.length > 1 ? "s" : ""} !`);
      startTransition(() => router.refresh());
    }
    setCopyingPrev(false);
  };

  const suggestIA = async () => {
    setSuggestingIA(true);
    try {
      const res = await fetch("/api/suggest-training-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId, weekStart: format(weekStart, "yyyy-MM-dd") }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Erreur");
      }
      const { count } = await res.json();
      toast.success(`${count} séance${count > 1 ? "s" : ""} suggérée${count > 1 ? "s" : ""} par l'IA !`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suggestion IA");
    }
    setSuggestingIA(false);
  };

  const toggleComplement = async (type: "marcheur" | "paddock") => {
    const allDaySessions = sessionsByDate[selectedDateKey] || [];
    const existing = allDaySessions.find(s => s.type === type);
    if (existing) {
      const { error } = await supabase.from("training_sessions").delete().eq("id", existing.id);
      if (error) toast.error("Erreur");
      else startTransition(() => router.refresh());
    } else {
      const { error } = await supabase.from("training_sessions").insert({
        horse_id: horseId,
        date: selectedDateKey,
        type,
        duration_min: 30,
        intensity: 1 as const,
        feeling: 3 as const,
        est_complement: true,
        notes: null,
        rider: null,
      });
      if (error) toast.error("Erreur");
      else startTransition(() => router.refresh());
    }
  };

  // ── Selected day data ─────────────────────────────────────────────
  const selectedDay = days.find(d => format(d, "yyyy-MM-dd") === selectedDateKey) || days[0];
  const selectedDaySessions = sessionsByDate[selectedDateKey] || [];
  const selectedDayPlanned = plannedByDate[selectedDateKey] || [];
  const selectedDayActivePlanned = selectedDayPlanned.filter(p => p.status === "planned");
  const selectedDaySkipped = selectedDayPlanned.filter(p => p.status === "skipped");
  const selectedDayIsToday = isToday(selectedDay);
  const selectedDayIsPast = isPastDay(selectedDay);
  const selectedDayHealth = healthByDate[selectedDateKey] || [];
  const selectedDayState = getDayState(
    selectedDayIsToday, selectedDayIsPast,
    selectedDaySessions.filter(s => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock").length > 0,
    selectedDayActivePlanned.length > 0
  );

  const selectedDayMainSessions = selectedDaySessions.filter(
    s => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock"
  );
  const selectedDayComplements = selectedDaySessions.filter(
    s => s.est_complement || s.type === "marcheur" || s.type === "paddock"
  );

  const hasPaddock = selectedDayComplements.some(s => s.type === "paddock");
  const hasMarcheur = selectedDayComplements.some(s => s.type === "marcheur");

  const hasAnything = selectedDayMainSessions.length > 0 || selectedDayActivePlanned.length > 0 || selectedDaySkipped.length > 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-black">
            {weekOffset === 0 ? "Cette semaine" :
             weekOffset === 1 ? "Semaine prochaine" :
             weekOffset === -1 ? "Semaine passée" :
             format(weekStart, "'Semaine du' d MMM", { locale: fr })}
          </p>
          <p className="text-xs text-gray-400">
            {format(weekStart, "d", { locale: fr })}–{format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Action bar — only for current/future weeks */}
      {isWeekFutureOrCurrent && (
        <div className="flex items-center gap-2 justify-end">
          {canCopyPrev && (
            <button
              onClick={copyPrevWeek}
              disabled={copyingPrev || isPending}
              className="flex items-center gap-1.5 text-2xs font-semibold text-gray-500 hover:text-black px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors disabled:opacity-50"
            >
              <Copy className="h-3 w-3" />
              {copyingPrev ? "Copie..." : "Copier sem. précédente"}
            </button>
          )}
          <button
            onClick={suggestIA}
            disabled={suggestingIA || isPending || currentWeekHasPlanned}
            className="flex items-center gap-1.5 text-2xs font-semibold text-orange hover:text-white px-3 py-1.5 rounded-lg border border-orange/30 hover:bg-orange bg-orange-light transition-colors disabled:opacity-40"
            title={currentWeekHasPlanned ? "Des séances sont déjà planifiées cette semaine" : undefined}
          >
            <Sparkles className="h-3 w-3" />
            {suggestingIA ? "Génération..." : "Suggérer IA"}
          </button>
        </div>
      )}

      {/* ── ZONE A: Strip horizontal ────────────────────────────────── */}
      <div
        className="bg-[#F5F5F5] rounded-2xl p-2 select-none"
        onTouchStart={(e) => { if (e.touches[0]) stripSwipeRef.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (stripSwipeRef.current === null || !e.changedTouches[0]) return;
          const delta = e.changedTouches[0].clientX - stripSwipeRef.current;
          stripSwipeRef.current = null;
          if (Math.abs(delta) > 50) navigateWeek(delta > 0 ? -1 : 1);
        }}
      >
        <div className="flex gap-1">
          {days.map((day, i) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const isSelected = dateKey === selectedDateKey;
            const isCurrentDay = isToday(day);
            const isPast = isPastDay(day);
            const daySessions = sessionsByDate[dateKey] || [];
            const dayPlanned = plannedByDate[dateKey] || [];
            const activePlanned = dayPlanned.filter(p => p.status === "planned");
            const dayMainSessions = daySessions.filter(s => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock");
            const dayState = getDayState(isCurrentDay, isPast, dayMainSessions.length > 0, activePlanned.length > 0);
            const { hasOwner, hasCoach, complementOnly } = getPresence(dateKey);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDayKey(dateKey)}
                className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all flex-1 gap-1 ${
                  isSelected ? "bg-white shadow-sm" : "hover:bg-white/60"
                }`}
              >
                {/* Day label */}
                <span className={`text-2xs font-semibold leading-none ${
                  isSelected ? "text-orange" : isCurrentDay ? "text-gray-600" : "text-gray-400"
                }`}>
                  {DAY_LABELS[i]}
                </span>
                {/* Day number */}
                <span className={`text-sm font-black leading-none ${
                  isSelected ? "text-orange" : isCurrentDay ? "text-black" : isPast ? "text-gray-400" : "text-gray-600"
                }`}>
                  {format(day, "d")}
                </span>
                {/* Presence indicator */}
                <div className="h-5 flex items-center justify-center">
                  {(hasOwner || hasCoach || complementOnly) ? (
                    complementOnly ? (
                      <div className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
                        <span className="text-[8px] text-green-600 font-bold leading-none">■</span>
                      </div>
                    ) : hasOwner && hasCoach ? (
                      <div className="relative w-6 h-4 flex-shrink-0">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-orange flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold leading-none">M</span>
                        </div>
                        <div className="absolute right-0 w-4 h-4 rounded-full bg-blue-400 flex items-center justify-center border border-white">
                          <span className="text-[8px] text-white font-bold leading-none">C</span>
                        </div>
                      </div>
                    ) : hasOwner ? (
                      <div className="w-4 h-4 rounded-full bg-orange/20 border-2 border-orange flex items-center justify-center">
                        <span className="text-[8px] text-orange font-bold leading-none">M</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center">
                        <span className="text-[8px] text-blue-500 font-bold leading-none">C</span>
                      </div>
                    )
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </div>
                {/* Status dot */}
                <div className="h-2 flex items-center justify-center">
                  {dayState === "FAIT" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  {(dayState === "AUJOURD_HUI" || dayState === "PLANIFIE") && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange" />
                  )}
                  {dayState === "A_LOGGER" && (
                    <div className="w-1.5 h-1.5 rounded-full border-2 border-orange border-dashed" />
                  )}
                  {dayState === "REPOS" && (
                    <div className="w-1.5 h-1.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bande résumé semaine (~32px) ──────────────────────────── */}
      {(weekMainSessionsList.length > 0 || weekPlannedList.length > 0) && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-beige border border-gray-100 text-xs">
          <span className="font-semibold text-black">
            {weekMainSessionsList.length} séance{weekMainSessionsList.length !== 1 ? "s" : ""}
          </span>
          {weekMinutes > 0 && (
            <span className="text-gray-500">
              {weekMinutes >= 60
                ? `${Math.floor(weekMinutes / 60)}h${weekMinutes % 60 > 0 ? `${weekMinutes % 60}min` : ""}`
                : `${weekMinutes}min`}
            </span>
          )}
          {completion !== null && (
            <span className={`font-semibold ${getCompletionColor(completion, weekOffset)}`}>
              {completion}% du programme
            </span>
          )}
          {weekPlannedList.length > 0 && (
            <span className="ml-auto text-gray-400 text-2xs">{weekPlannedList.length} prévu{weekPlannedList.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}

      {/* ── ZONE B: Vue du jour ────────────────────────────────────── */}
      <div
        className="card space-y-0 p-4"
        onTouchStart={(e) => { if (e.touches[0]) zoneSwipeRef.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (zoneSwipeRef.current === null || !e.changedTouches[0]) return;
          const delta = e.changedTouches[0].clientX - zoneSwipeRef.current;
          zoneSwipeRef.current = null;
          if (Math.abs(delta) > 50) navigateDay(delta > 0 ? -1 : 1);
        }}
      >
        {/* Day header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-black capitalize">
                {format(selectedDay, "EEEE d MMMM", { locale: fr })}
              </h3>
              {selectedDayIsToday && (
                <span className="text-2xs font-semibold text-orange">Aujourd&apos;hui</span>
              )}
              {!selectedDayIsToday && selectedDayState === "A_LOGGER" && (
                <span className="text-2xs font-semibold text-orange">À enregistrer</span>
              )}
            </div>
            <button
              onClick={() => navigateDay(1)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {/* Health dots */}
            {selectedDayHealth.length > 0 && (
              <div className="flex items-center gap-0.5 mr-1" title={`${selectedDayHealth.length} soin${selectedDayHealth.length > 1 ? "s" : ""} ce jour`}>
                {selectedDayHealth.slice(0, 3).map((h, idx) => (
                  <span key={idx} className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[h.type] || HEALTH_DOT.autre}`} />
                ))}
              </div>
            )}
            <button
              onClick={() => openLogModal(selectedDateKey)}
              className="flex items-center gap-1 text-2xs font-semibold text-gray-400 hover:text-black px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
            {isWeekFutureOrCurrent && (
              <button
                onClick={() => openPlanModal(selectedDateKey)}
                className="flex items-center gap-1 text-2xs font-semibold text-orange px-2 py-1 rounded-lg hover:bg-orange-light transition-colors"
              >
                Planifier
              </button>
            )}
          </div>
        </div>

        {/* First-use empty state */}
        {!hasEverAnyActivity && isWeekFutureOrCurrent && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">📅</div>
            <p className="text-sm font-bold text-black mb-1">Planifiez votre programme</p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
              Aucune séance planifiée pour l&apos;instant. Ajoutez des séances manuellement ou laissez l&apos;IA construire un plan adapté à votre cheval.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => openPlanModal(selectedDateKey)}
                className="flex items-center gap-1.5 text-xs font-semibold btn-secondary px-4 py-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Planifier manuellement
              </button>
              <button
                onClick={suggestIA}
                disabled={suggestingIA}
                className="flex items-center gap-1.5 text-xs font-semibold btn-primary px-4 py-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {suggestingIA ? "Génération..." : "Suggérer IA"}
              </button>
            </div>
          </div>
        )}

        {/* Day content — REPOS empty (seulement si aucun complément non plus) */}
        {hasEverAnyActivity && !hasAnything && selectedDayMainSessions.length === 0 && selectedDayComplements.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-300 mb-3">
              {horseMode === "ICr" ? "Journée libre — rien de prévu" : "Repos — rien de prévu"}
            </p>
            <button
              onClick={() => openPlanModal(selectedDateKey)}
              className="text-xs text-orange hover:underline font-semibold"
            >
              + Ajouter une séance
            </button>
          </div>
        )}

        {/* Planned sessions */}
        {selectedDayActivePlanned.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 mb-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-50"
          >
            <span className="text-base leading-none flex-shrink-0">{TRAINING_EMOJIS[p.type] || "🏇"}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-gray-700">
                {TRAINING_TYPE_LABELS[p.type] || p.type}
              </span>
              {p.duration_min_target && (
                <span className="text-xs text-gray-400 ml-1.5">{p.duration_min_target}min</span>
              )}
              {p.intensity_target && (
                <span className="text-2xs text-gray-400 ml-1.5">· intensité {p.intensity_target}/5</span>
              )}
              {p.notes && <p className="text-2xs text-gray-400 truncate mt-0.5">{p.notes}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => handleConfirmSession(p, selectedDateKey)}
                title="Confirmer réalisée"
                className="p-1.5 hover:bg-green-50 rounded-lg text-gray-300 hover:text-success transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => openLogModal(selectedDateKey, p)}
                title="Enregistrer avec détails"
                className="p-1.5 hover:bg-orange-light rounded-lg text-gray-300 hover:text-orange transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => openPlanModal(selectedDateKey, p)}
                title="Modifier la planification"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-gray-600 transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => skipPlanned(p.id)}
                title="Passer"
                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-danger transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Skipped planned */}
        {selectedDaySkipped.map((p) => (
          <div key={p.id} className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 rounded-lg opacity-40">
            <span className="text-sm leading-none flex-shrink-0">{TRAINING_EMOJIS[p.type] || "🏇"}</span>
            <span className="text-xs text-gray-400 line-through flex-1">{TRAINING_TYPE_LABELS[p.type] || p.type}</span>
            <button
              onClick={() => deletePlanned(p.id)}
              className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-danger transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Done sessions — main */}
        {selectedDayMainSessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2 mb-2 px-3 py-2.5 rounded-xl bg-white border border-green-100">
            <span className="text-base leading-none flex-shrink-0">{TRAINING_EMOJIS[s.type] || "🏇"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">{TRAINING_TYPE_LABELS[s.type] || s.type}</span>
                <span className="text-2xs text-gray-400">{s.duration_min}min</span>
                {s.coach_present && (
                  <span className="text-2xs bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">Coach</span>
                )}
                <span className="text-2xs bg-green-50 text-green-600 font-semibold px-1.5 py-0.5 rounded-full">✓ Réalisée</span>
              </div>
              {s.objectif && <p className="text-2xs text-gray-500 truncate mt-0.5">{s.objectif}</p>}
              {s.notes && !s.objectif && <p className="text-2xs text-gray-400 truncate mt-0.5">{s.notes}</p>}
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className={`w-1.5 h-3 rounded-full ${idx < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
              ))}
            </div>
          </div>
        ))}

        {/* ── Compléments section ──────────────────────────────────── */}
        <div className={`${hasAnything || selectedDayMainSessions.length > 0 ? "mt-3 pt-3 border-t border-gray-100" : "mt-1"}`}>
          <p className="text-2xs text-gray-400 font-semibold mb-2">Compléments</p>
          <div className="flex gap-2">
            <button
              onClick={() => toggleComplement("paddock")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all flex-1 justify-center ${
                hasPaddock
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              <span>🌿</span>
              <span>Paddock</span>
              {hasPaddock && <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={() => toggleComplement("marcheur")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all flex-1 justify-center ${
                hasMarcheur
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              <span>🚶</span>
              <span>Marcheur</span>
              {hasMarcheur && <Check className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirm toast snackbar (Level 2) ──────────────────────── */}
      {confirmToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TRAINING_EMOJIS[confirmToast.type] || "🏇"}</span>
                <span className="text-sm font-bold text-black">{TRAINING_TYPE_LABELS[confirmToast.type] || confirmToast.type}</span>
                <span className="text-2xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">Confirmée</span>
              </div>
              <button onClick={dismissConfirmToast} className="text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-2xs text-gray-400 mb-1">Intensité</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateConfirmToast("intensity", v)}
                      className={`flex-1 h-5 rounded-full transition-colors ${v <= confirmToast.intensity ? "bg-orange" : "bg-gray-100"}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-2xs text-gray-400 mb-1">État cheval</p>
                <div className="flex gap-1">
                  {["😴", "😕", "😐", "🙂", "😄"].map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateConfirmToast("feeling", idx + 1)}
                      className={`flex-1 text-center text-sm rounded-lg py-0.5 transition-colors ${idx + 1 === confirmToast.feeling ? "bg-orange-light" : ""}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => { dismissConfirmToast(); openLogModal(confirmToast.dateKey); }}
              className="w-full text-2xs text-gray-400 hover:text-gray-600 underline text-center"
            >
              Ajouter des détails →
            </button>
          </div>
        </div>
      )}

      {/* ── Plan modal ────────────────────────────────────────────── */}
      <Modal
        open={showPlanModal}
        onClose={() => { setShowPlanModal(false); setEditPlanned(null); }}
        title={editPlanned ? "Modifier la séance prévue" : "Planifier une séance"}
      >
        <div className="space-y-4">
          <div>
            <label className="label mb-2">Jour</label>
            {!editPlanned && weekOffset === 0 ? (
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const key = format(day, "yyyy-MM-dd");
                  const isCurrentDay = isToday(day);
                  const isSelected = planForm.date === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, date: key })}
                      className={`flex flex-col items-center py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-orange text-white"
                          : isCurrentDay
                          ? "border-2 border-orange text-orange"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-2xs">{DAY_LABELS[i]}</span>
                      <span>{format(day, "d")}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="date"
                value={planForm.date}
                onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            )}
          </div>

          <div>
            <label className="label mb-2">Type de travail</label>
            <div className="grid grid-cols-3 gap-2">
              {DISCIPLINE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setPlanForm({ ...planForm, type: item.type })}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all min-h-[56px] ${
                    planForm.type === item.type
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Qui s&apos;en occupe</label>
            <div className="grid grid-cols-3 gap-2">
              {RIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlanForm({ ...planForm, qui_sen_occupe: planForm.qui_sen_occupe === opt.value ? "" : opt.value })}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    planForm.qui_sen_occupe === opt.value
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="leading-tight text-center">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Intensité cible</label>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlanForm({ ...planForm, intensity_target: planForm.intensity_target === String(opt.value) ? "" : String(opt.value) })}
                  className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                    planForm.intensity_target === String(opt.value) ? opt.active : opt.inactive
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Durée cible</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setPlanForm({ ...planForm, duration_min_target: String(d) }); setDurationOther(false); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    !durationOther && planForm.duration_min_target === String(d)
                      ? "bg-orange text-white border-orange"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {d < 60 ? `${d} min` : d === 60 ? "1h" : d === 90 ? "1h30" : d === 120 ? "2h" : "2h30"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setDurationOther(true); setPlanForm({ ...planForm, duration_min_target: "" }); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  durationOther
                    ? "bg-orange text-white border-orange"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                Autre
              </button>
            </div>
            {durationOther && (
              <input
                type="number"
                value={planForm.duration_min_target}
                onChange={(e) => setPlanForm({ ...planForm, duration_min_target: e.target.value })}
                min="1" max="300"
                placeholder="Durée en minutes"
                className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={planForm.notes}
              onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              rows={2}
              placeholder="Focus, objectif, remarques..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
            />
          </div>

          {editPlanned && (
            <button
              type="button"
              onClick={() => { deletePlanned(editPlanned.id); setShowPlanModal(false); setEditPlanned(null); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-danger hover:bg-red-50 py-2 rounded-xl transition-colors"
            >
              Supprimer cette séance prévue
            </button>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowPlanModal(false); setEditPlanned(null); }} className="flex-1 btn-secondary">
              Annuler
            </button>
            <button type="button" onClick={savePlanned} disabled={savingPlan} className="flex-1 btn-primary">
              {savingPlan ? "..." : editPlanned ? "Mettre à jour" : "Planifier"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Log session modal */}
      <QuickTrainingModal
        open={showLogModal && !!selectedDate}
        onClose={() => { setShowLogModal(false); setLogPrefill(null); }}
        horseId={horseId}
        onSaved={() => { setShowLogModal(false); setLogPrefill(null); startTransition(() => router.refresh()); }}
        prefill={logPrefill}
      />
    </div>
  );
}
