"use client";

import { useState, useTransition } from "react";
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
import { TRAINING_TYPE_LABELS } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import QuickTrainingModal, { DISCIPLINE_ITEMS, INTENSITY_OPTIONS, RIDER_OPTIONS } from "./QuickTrainingModal";
import type { PrefillData } from "./QuickTrainingModal";

const TYPE_COLORS: Record<string, string> = {
  dressage: "bg-blue-100 text-blue-700",
  cso: "bg-purple-100 text-purple-700",
  cross: "bg-amber-100 text-amber-700",
  galop: "bg-green-100 text-green-700",
  endurance: "bg-cyan-100 text-cyan-700",
  longe: "bg-indigo-100 text-indigo-700",
  travail_a_pied: "bg-teal-100 text-teal-700",
  marcheur: "bg-gray-100 text-gray-600",
  saut: "bg-pink-100 text-pink-700",
  plat: "bg-blue-50 text-blue-600",
  autre: "bg-gray-100 text-gray-500",
};

// Health type dot colors
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

}

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90];

type PlanFormState = {
  type: TrainingType;
  duration_min_target: string;
  notes: string;
  date: string;
  complement: string[];
  qui_monte: string;
  intensity_target: string;
};

export default function VueSemaine({ horseId, sessions, plannedSessions, healthRecords }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editPlanned, setEditPlanned] = useState<TrainingPlannedSession | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>({
    type: "dressage",
    duration_min_target: "45",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    complement: [],
    qui_monte: "",
    intensity_target: "",
  });
  const [logPrefill, setLogPrefill] = useState<PrefillData | null>(null);
  const [durationOther, setDurationOther] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [copyingPrev, setCopyingPrev] = useState(false);
  const [suggestingIA, setSuggestingIA] = useState(false);

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

  const isWeekPast = weekOffset < 0;
  const isWeekFutureOrCurrent = weekOffset >= 0;

  const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Index sessions by date
  const sessionsByDate: Record<string, TrainingSession[]> = {};
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  }

  // Index planned by date
  const plannedByDate: Record<string, TrainingPlannedSession[]> = {};
  for (const p of plannedSessions) {
    const key = p.date.slice(0, 10);
    if (!plannedByDate[key]) plannedByDate[key] = [];
    plannedByDate[key].push(p);
  }

  // Index health records by date
  const healthByDate: Record<string, { type: string }[]> = {};
  for (const h of (healthRecords || [])) {
    const key = h.date.slice(0, 10);
    if (!healthByDate[key]) healthByDate[key] = [];
    healthByDate[key].push({ type: h.type });
  }

  // Week stats
  const weekSessionsList = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= weekStart && d <= weekEnd;
  });
  const weekPlannedList = plannedSessions.filter((p) => {
    const d = parseISO(p.date);
    return d >= weekStart && d <= weekEnd && p.status === "planned";
  });
  const weekMinutes = weekSessionsList.reduce((acc, s) => acc + s.duration_min, 0);
  const completionDenom = weekSessionsList.length + weekPlannedList.length;
  const completion = completionDenom > 0
    ? Math.round((weekSessionsList.length / completionDenom) * 100)
    : null;

  // "Copier sem. précédente" — copy planned sessions from prev week offset
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

  // First-use: no planned sessions ever
  const hasEverPlanned = plannedSessions.length > 0;

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
        complement: (planned as any).complement ?? [],
        qui_monte: (planned as any).qui_monte ?? "",
        intensity_target: planned.intensity_target ? String(planned.intensity_target) : "",
      });
    } else {
      setEditPlanned(null);
      setDurationOther(false);
      setPlanForm({ type: "dressage", duration_min_target: "45", notes: "", date: dateStr, complement: [], qui_monte: "", intensity_target: "" });
    }
    setShowPlanModal(true);
  };

  const openLogModal = (dateStr: string, fromPlanned?: TrainingPlannedSession) => {
    setSelectedDate(dateStr);
    if (fromPlanned) {
      setLogPrefill({
        type: fromPlanned.type,
        complement: (fromPlanned as any).complement ?? null,
        rider: (fromPlanned as any).qui_monte ?? null,
        duration: fromPlanned.duration_min_target ?? null,
        intensity: fromPlanned.intensity_target ? fromPlanned.intensity_target : null,
      });
    } else {
      setLogPrefill(null);
    }
    setShowLogModal(true);
  };

  const savePlanned = async () => {
    setSavingPlan(true);
    try {
      const payload = {
        horse_id: horseId,
        date: planForm.date,
        type: planForm.type,
        duration_min_target: parseInt(planForm.duration_min_target) || 45,
        notes: planForm.notes || null,
        complement: planForm.complement.length > 0 ? planForm.complement : null,
        qui_monte: planForm.qui_monte || null,
        intensity_target: planForm.intensity_target ? parseInt(planForm.intensity_target) as (1|2|3|4|5) : null,
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

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
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
            {isWeekPast && (
              <span className="ml-2 text-2xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                lecture seule
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {format(weekStart, "d", { locale: fr })}–{format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
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
            className="flex items-center gap-1.5 text-2xs font-semibold text-orange hover:text-white px-3 py-1.5 rounded-lg border border-orange/30 hover:bg-orange bg-orange-light transition-colors disabled:opacity-50"
            title={currentWeekHasPlanned ? "Des séances sont déjà planifiées cette semaine" : undefined}
          >
            <Sparkles className="h-3 w-3" />
            {suggestingIA ? "Génération..." : "Suggérer IA"}
          </button>
        </div>
      )}

      {/* First-use empty state */}
      {!hasEverPlanned && isWeekFutureOrCurrent && (
        <div className="card text-center py-8">
          <div className="text-3xl mb-3">📅</div>
          <p className="text-sm font-bold text-black mb-1">Planifiez votre programme</p>
          <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
            Aucune séance planifiée pour l&apos;instant. Ajoutez des séances manuellement ou laissez l&apos;IA construire un plan adapté à votre cheval.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => openPlanModal(format(new Date(), "yyyy-MM-dd"))}
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

      {/* Week summary banner */}
      {(weekSessionsList.length > 0 || weekPlannedList.length > 0) && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-beige border border-gray-100 text-xs">
          <span className="font-semibold text-black">
            {weekSessionsList.length} séance{weekSessionsList.length !== 1 ? "s" : ""} réalisée{weekSessionsList.length !== 1 ? "s" : ""}
          </span>
          {weekMinutes > 0 && (
            <span className="text-gray-500">
              {weekMinutes >= 60
                ? `${Math.floor(weekMinutes / 60)}h${weekMinutes % 60 > 0 ? `${weekMinutes % 60}min` : ""}`
                : `${weekMinutes}min`}
            </span>
          )}
          {completion !== null && (
            <span className={`font-semibold ${completion >= 80 ? "text-success" : completion >= 50 ? "text-orange" : "text-danger"}`}>
              {completion}% du programme
            </span>
          )}
          {weekPlannedList.length > 0 && (
            <span className="text-gray-400">{weekPlannedList.length} prévu{weekPlannedList.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}

      {/* Day columns */}
      <div className="space-y-2">
        {days.map((day, i) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDate[dateKey] || [];
          const dayPlanned = plannedByDate[dateKey] || [];
          const isCurrentDay = isToday(day);
          const isPast = isPastDay(day);
          const dayHealth = healthByDate[dateKey] || [];

          return (
            <div
              key={dateKey}
              className={`rounded-xl border p-3 transition-colors ${
                isCurrentDay
                  ? "border-orange/30 bg-orange-light/30"
                  : isPast
                  ? "border-gray-100 bg-gray-50/50"
                  : "border-gray-100 bg-white"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isCurrentDay ? "text-orange" : isPast ? "text-gray-300" : "text-gray-400"}`}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className={`text-sm font-black ${isCurrentDay ? "text-orange" : isPast ? "text-gray-400" : "text-black"}`}>
                    {format(day, "d")}
                  </span>
                  {isCurrentDay && (
                    <span className="text-2xs font-semibold bg-orange text-white px-1.5 py-0.5 rounded-full">Aujourd&apos;hui</span>
                  )}
                  {/* Health dots */}
                  {dayHealth.length > 0 && (
                    <div className="flex items-center gap-0.5" title={`${dayHealth.length} soin${dayHealth.length > 1 ? "s" : ""} ce jour`}>
                      {dayHealth.slice(0, 3).map((h, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[h.type] || HEALTH_DOT.autre}`}
                        />
                      ))}
                      {dayHealth.length > 3 && (
                        <span className="text-2xs text-gray-400">+{dayHealth.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons — hidden for past days */}
                {!isPast && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openLogModal(dateKey)}
                      className="flex items-center gap-1 text-2xs font-semibold text-gray-400 hover:text-black px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Logger une séance"
                    >
                      <Check className="h-3 w-3" />
                      Logger
                    </button>
                    <button
                      onClick={() => openPlanModal(dateKey)}
                      className="flex items-center gap-1 text-2xs font-semibold text-gray-400 hover:text-orange px-2 py-1 rounded-lg hover:bg-orange-light transition-colors"
                      title="Planifier"
                    >
                      <Plus className="h-3 w-3" />
                      Planifier
                    </button>
                  </div>
                )}
              </div>

              {/* Planned sessions */}
              {dayPlanned.map((p) => {
                const isSkipped = p.status === "skipped";
                // In past days: planned sessions not completed = crossed out
                const isMissed = isPast && !isSkipped && !daySessions.length;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 mb-1.5 px-2.5 py-2 rounded-lg border ${
                      isSkipped
                        ? "border-gray-100 bg-gray-50 opacity-40"
                        : isMissed
                        ? "border-dashed border-gray-200 bg-gray-50 opacity-50"
                        : "border-dashed border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSkipped || isMissed ? "bg-gray-200" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold text-gray-500 ${isMissed || isSkipped ? "line-through" : ""}`}>
                        {TRAINING_TYPE_LABELS[p.type] || p.type}
                      </span>
                      {p.duration_min_target && (
                        <span className={`text-xs text-gray-400 ml-1.5 ${isMissed || isSkipped ? "line-through" : ""}`}>
                          {p.duration_min_target}min
                        </span>
                      )}
                      {p.notes && <p className="text-2xs text-gray-400 truncate">{p.notes}</p>}
                    </div>

                    {/* Actions — only for non-past, non-skipped */}
                    {!isPast && !isSkipped && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openLogModal(dateKey, p)}
                          title="Marquer comme réalisée"
                          className="p-1 hover:bg-green-50 rounded text-gray-300 hover:text-success transition-colors"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => openPlanModal(dateKey, p)}
                          title="Modifier"
                          className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-black transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => skipPlanned(p.id)}
                          title="Passer"
                          className="p-1 hover:bg-orange-light rounded text-gray-300 hover:text-orange transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {isSkipped && (
                      <button
                        onClick={() => deletePlanned(p.id)}
                        title="Supprimer"
                        className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-danger transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Done sessions */}
              {daySessions.map((s) => (
                <div key={s.id} className="flex items-center gap-2 mb-1 px-2.5 py-2 rounded-lg bg-white border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-orange flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type] || "bg-gray-100 text-gray-600"}`}>
                        {TRAINING_TYPE_LABELS[s.type] || s.type}
                      </span>
                      <span className="text-2xs text-gray-400">{s.duration_min}min</span>
                      {s.coach_present && (
                        <span className="text-2xs bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">Coach</span>
                      )}
                    </div>
                    {s.objectif && <p className="text-2xs text-gray-500 truncate mt-0.5">{s.objectif}</p>}
                    {s.notes && !s.objectif && <p className="text-2xs text-gray-400 truncate mt-0.5">{s.notes}</p>}
                  </div>
                  {/* Intensity dots */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-3 rounded-full ${idx < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Day empty line */}
              {daySessions.length === 0 && dayPlanned.length === 0 && (
                <p className="text-2xs text-gray-200 text-center py-1">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan modal */}
      <Modal
        open={showPlanModal}
        onClose={() => { setShowPlanModal(false); setEditPlanned(null); }}
        title={editPlanned ? "Modifier la séance prévue" : "Planifier une séance"}
      >
        <div className="space-y-4">
          {/* Day buttons for current week (new only) OR date picker for other weeks */}
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

          {/* Type de travail */}
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

          {/* En complément */}
          <div>
            <label className="label mb-2">En complément</label>
            <div className="flex gap-2">
              {[{ value: "marcheur", emoji: "🔄", label: "Marcheur" }, { value: "paddock", emoji: "🌿", label: "Paddock" }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlanForm({
                    ...planForm,
                    complement: planForm.complement.includes(opt.value)
                      ? planForm.complement.filter(x => x !== opt.value)
                      : [...planForm.complement, opt.value],
                  })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    planForm.complement.includes(opt.value)
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Qui monte — hidden if complement-only */}
          {(planForm.type || planForm.complement.length === 0) && (
            <div>
              <label className="label mb-2">Qui monte</label>
              <div className="grid grid-cols-3 gap-2">
                {RIDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, qui_monte: planForm.qui_monte === opt.value ? "" : opt.value })}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      planForm.qui_monte === opt.value
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
          )}

          {/* Intensité cible — hidden if complement-only */}
          {(planForm.type || planForm.complement.length === 0) && (
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
          )}

          {/* Duration presets */}
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
                  {d < 60 ? `${d} min` : d === 60 ? "1h" : "1h30"}
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

          {/* Notes */}
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
