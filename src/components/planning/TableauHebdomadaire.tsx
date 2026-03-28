"use client";

import { useState, useCallback } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  addWeeks,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QuickTrainingModal, {
  DISCIPLINE_ITEMS,
  RIDER_OPTIONS,
} from "@/components/training/QuickTrainingModal";
import Modal from "@/components/ui/Modal";
import type {
  TrainingSession,
  TrainingPlannedSession,
  HorseIndexMode,
  TrainingType,
  TrainingRider,
  ProfileType,
} from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorseRow {
  id: string;
  name: string;
  avatar_url: string | null;
  horse_index_mode: HorseIndexMode | null;
  ecurie?: string | null;
}

interface Props {
  horses: HorseRow[];
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  userId: string;
  userName: string;
  moduleGerant: boolean;
  moduleCoach: boolean;
  profileType: ProfileType | null;
}

type CellSheet =
  | { kind: "empty"; horse: HorseRow; date: Date }
  | { kind: "planned"; horse: HorseRow; date: Date; planned: TrainingPlannedSession }
  | { kind: "done"; horse: HorseRow; date: Date; session: TrainingSession };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(weekOffset: number): Date[] {
  const base = addWeeks(new Date(), weekOffset);
  const start = startOfWeek(base, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

function weekLabel(days: Date[]): string {
  const first = days[0];
  const last = days[6];
  if (first.getMonth() === last.getMonth()) {
    return `${format(first, "d")} – ${format(last, "d MMMM yyyy", { locale: fr })}`;
  }
  return `${format(first, "d MMM", { locale: fr })} – ${format(last, "d MMM yyyy", { locale: fr })}`;
}

const RESTRICTED_MODES: HorseIndexMode[] = ["IR", "IS"];

function isRestricted(mode: HorseIndexMode | null, date: Date): boolean {
  if (!RESTRICTED_MODES.includes(mode as HorseIndexMode)) return false;
  return !isBefore(startOfDay(date), startOfDay(new Date())); // today or future
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Badges de mode de vie ────────────────────────────────────────────────────

const MODE_BADGE: Record<
  HorseIndexMode,
  { bg: string; text: string; label: string }
> = {
  IC:  { bg: "bg-orange",       text: "text-white",       label: "IC" },
  IE:  { bg: "bg-blue-100",     text: "text-blue-700",    label: "IE" },
  IP:  { bg: "bg-gray-100",     text: "text-gray-500",    label: "IP" },
  IR:  { bg: "bg-gray-200",     text: "text-gray-500",    label: "IR" },
  IS:  { bg: "bg-red-100",      text: "text-red-500",     label: "IS" },
  ICr: { bg: "bg-purple-100",   text: "text-purple-600",  label: "ICr" },
};

// ─── Pastille ─────────────────────────────────────────────────────────────────

interface PastilleConfig {
  bg: string;
  text: string;
  border: string;
  initials: string;
  isPhantom: boolean;
  coachBadge: boolean;
}

function getPastilleConfig(
  rider: TrainingRider | null,
  type: TrainingType,
  userName: string,
  isPhantom: boolean
): PastilleConfig {
  const initials = getInitials(userName);

  if (type === "marcheur" || type === "paddock") {
    const letter = type === "marcheur" ? "M" : "P";
    return {
      bg: isPhantom ? "bg-transparent" : "bg-green-200",
      text: "text-green-800",
      border: "border-green-400",
      initials: letter,
      isPhantom,
      coachBadge: false,
    };
  }

  if (rider === "owner_with_coach") {
    return {
      bg: isPhantom ? "bg-transparent" : "bg-blue-700",
      text: isPhantom ? "text-blue-700" : "text-white",
      border: "border-blue-700",
      initials,
      isPhantom,
      coachBadge: true,
    };
  }

  if (rider === "coach") {
    return {
      bg: isPhantom ? "bg-transparent" : "bg-orange/30",
      text: "text-orange-800",
      border: "border-orange-400",
      initials: "É",
      isPhantom,
      coachBadge: false,
    };
  }

  if (rider === "longe") {
    return {
      bg: isPhantom ? "bg-transparent" : "bg-orange/30",
      text: "text-orange-800",
      border: "border-orange-400",
      initials: "L",
      isPhantom,
      coachBadge: false,
    };
  }

  if (rider === "travail_a_pied") {
    return {
      bg: isPhantom ? "bg-transparent" : "bg-orange/30",
      text: "text-orange-800",
      border: "border-orange-400",
      initials: "P",
      isPhantom,
      coachBadge: false,
    };
  }

  // owner ou null → bleu clair
  return {
    bg: isPhantom ? "bg-transparent" : "bg-blue-200",
    text: "text-blue-800",
    border: "border-blue-400",
    initials,
    isPhantom,
    coachBadge: false,
  };
}

function Pastille({
  config,
}: {
  config: PastilleConfig;
}) {
  const borderClass = config.isPhantom
    ? `border-2 border-dashed ${config.border}`
    : "border-0";

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${config.bg} ${config.text} ${borderClass}`}
      >
        {config.initials}
      </div>
      {config.coachBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange text-white text-[8px] font-bold flex items-center justify-center">
          C
        </span>
      )}
    </div>
  );
}

// ─── Composant cellule ────────────────────────────────────────────────────────

interface CellProps {
  horse: HorseRow;
  date: Date;
  daySessions: TrainingSession[];
  dayPlanned: TrainingPlannedSession[];
  userName: string;
  onTap: (sheet: CellSheet) => void;
  isTodayCol: boolean;
}

function Cell({ horse, date, daySessions, dayPlanned, userName, onTap, isTodayCol }: CellProps) {
  const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
  const isCurrent = isToday(date);
  const restricted = isRestricted(horse.horse_index_mode, date);

  // Pastilles depuis séances réalisées
  const donePastilles: PastilleConfig[] = daySessions.map((s) =>
    getPastilleConfig(s.rider, s.type, userName, false)
  );

  // Pastilles fantômes = séances planifiées sans linked_session_id
  const phantomPastilles: PastilleConfig[] = dayPlanned
    .filter((p) => p.status === "planned" && !p.linked_session_id)
    .map((p) => getPastilleConfig(p.qui_sen_occupe, p.type, userName, true));

  const allPastilles = [...donePastilles, ...phantomPastilles];
  const visible = allPastilles.slice(0, 3);
  const overflow = allPastilles.length - 3;

  const isEmpty = daySessions.length === 0 && dayPlanned.filter((p) => !p.linked_session_id).length === 0;
  const canAct = isCurrent || !isPast;

  const handleClick = () => {
    if (isPast && isEmpty) return; // cellule passée vide → pas d'action

    // Cherche d'abord une planned sans linked
    const unlinkedPlanned = dayPlanned.find(
      (p) => p.status === "planned" && !p.linked_session_id
    );

    if (unlinkedPlanned) {
      onTap({ kind: "planned", horse, date, planned: unlinkedPlanned });
      return;
    }

    if (daySessions.length > 0) {
      // Affichage seulement pour MVP — tap sur pastille done
      return;
    }

    if (canAct) {
      onTap({ kind: "empty", horse, date });
    }
  };

  const bgClass = isTodayCol ? "bg-orange/5" : "";
  const restrictedClass = restricted ? "opacity-50" : "";

  return (
    <td
      className={`px-1 py-2 text-center align-middle ${bgClass} ${restrictedClass}`}
      style={{ minWidth: "52px" }}
    >
      <div
        className={`flex flex-wrap gap-1 justify-center items-center min-h-[36px] ${canAct || !isEmpty ? "cursor-pointer" : ""}`}
        onClick={handleClick}
      >
        {visible.map((cfg, i) => (
          <Pastille key={i} config={cfg} />
        ))}

        {overflow > 0 && (
          <span className="text-[10px] font-bold text-gray-400 ml-0.5">+{overflow}</span>
        )}

        {isEmpty && canAct && !restricted && (
          <Plus className="h-4 w-4 text-gray-300 hover:text-gray-500 transition-colors" />
        )}

        {isEmpty && canAct && restricted && (
          <span className="text-[10px] text-gray-300">—</span>
        )}
      </div>
    </td>
  );
}

// ─── Bottom Sheet — cellule vide ──────────────────────────────────────────────

interface EmptySheetProps {
  horse: HorseRow;
  date: Date;
  onClose: () => void;
  onLogNow: () => void;
  onPlan: () => void;
  onQuickMarcheur: () => void;
  isRestricted: boolean;
}

function EmptySheet({ horse, date, onClose, onLogNow, onPlan, onQuickMarcheur, isRestricted }: EmptySheetProps) {
  const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
  const isCurrent = isToday(date);
  const dateLabel = format(date, "EEEE d MMMM", { locale: fr });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[300] bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[301] bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-black text-base">{horse.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {!isRestricted && (isPast || isCurrent) && (
            <button
              onClick={onLogNow}
              className="btn-primary w-full justify-center"
            >
              Enregistrer maintenant
            </button>
          )}

          {!isRestricted && !isPast && !isCurrent && (
            <button
              onClick={onPlan}
              className="btn-primary w-full justify-center"
            >
              Planifier une séance
            </button>
          )}

          <button
            onClick={onQuickMarcheur}
            className="btn-secondary w-full justify-center"
          >
            ⚙️ Marcheur / Liberté
          </button>

          <button
            onClick={onClose}
            className="btn-ghost w-full justify-center text-gray-500"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Bottom Sheet — validation planned ────────────────────────────────────────

interface PlannedSheetProps {
  horse: HorseRow;
  date: Date;
  planned: TrainingPlannedSession;
  onClose: () => void;
  onCheckDone: () => Promise<void>;
  onCompleteSession: () => void;
  onDeletePlanned: () => Promise<void>;
}

function PlannedSheet({
  horse,
  date,
  planned,
  onClose,
  onCheckDone,
  onCompleteSession,
  onDeletePlanned,
}: PlannedSheetProps) {
  const [loading, setLoading] = useState(false);
  const dateLabel = format(date, "EEEE d MMMM", { locale: fr });
  const typeLabel =
    DISCIPLINE_ITEMS.find((d) => d.type === planned.type)?.label ??
    planned.type.replace(/_/g, " ");

  const handleCheck = async () => {
    setLoading(true);
    await onCheckDone();
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    await onDeletePlanned();
    setLoading(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[300] bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-[301] bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-black text-base capitalize">{typeLabel} planifié</h3>
            <p className="text-sm text-gray-500 capitalize">
              {horse.name} — {dateLabel}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {planned.duration_min_target && (
          <p className="text-xs text-gray-400 mb-3">
            Durée cible : {planned.duration_min_target} min
            {planned.notes && ` · ${planned.notes}`}
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={handleCheck}
            disabled={loading}
            className="btn-primary w-full justify-center gap-2 flex items-center"
          >
            <Check className="h-4 w-4" />
            Cocher Fait
          </button>

          <button
            onClick={onCompleteSession}
            className="btn-secondary w-full justify-center"
          >
            📝 Compléter la séance
          </button>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer la planification
          </button>

          <button onClick={onClose} className="btn-ghost w-full justify-center text-gray-500">
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────

const DURATION_PICKS = [15, 20, 30, 45, 60, 90];

interface PlanModalProps {
  horse: HorseRow;
  date: Date;
  onClose: () => void;
  onSaved: () => void;
}

function PlanModal({ horse, date, onClose, onSaved }: PlanModalProps) {
  const supabase = createClient();
  const [type, setType] = useState<TrainingType | null>(null);
  const [duration, setDuration] = useState<number | null>(45);
  const [rider, setRider] = useState<TrainingRider | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!type) {
      toast.error("Sélectionnez un type de séance");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("training_planned_sessions").insert({
      horse_id: horse.id,
      date: format(date, "yyyy-MM-dd"),
      type,
      duration_min_target: duration,
      qui_sen_occupe: rider,
      notes: notes.trim() || null,
      status: "planned",
      linked_session_id: null,
    });

    if (error) {
      toast.error("Erreur lors de la planification");
      setLoading(false);
      return;
    }

    toast.success("Séance planifiée !");
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Planifier — ${horse.name}`}
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-500 capitalize">
          {format(date, "EEEE d MMMM yyyy", { locale: fr })}
        </p>

        {/* Type */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type de travail</p>
          <div className="grid grid-cols-3 gap-2">
            {DISCIPLINE_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setType(type === item.type ? null : item.type)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold min-h-[64px] transition-all ${
                  type === item.type
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="leading-tight text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Durée cible */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Durée cible</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_PICKS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(duration === d ? null : d)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  duration === d
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                {d < 60 ? `${d} min` : `${d / 60}h`}
              </button>
            ))}
          </div>
        </div>

        {/* Qui monte */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Qui monte</p>
          <div className="grid grid-cols-3 gap-2">
            {RIDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRider(rider === opt.value ? null : opt.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                  rider === opt.value
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                <span className="text-base">{opt.emoji}</span>
                <span className="leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
            Notes <span className="font-normal normal-case text-gray-300">(optionnel)</span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Objectifs, consignes..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Enregistrement..." : "Planifier"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TableauHebdomadaire({
  horses,
  sessions,
  plannedSessions,
  userId,
  userName,
  moduleGerant: _moduleGerant,
  moduleCoach: _moduleCoach,
  profileType: _profileType,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [weekOffset, setWeekOffset] = useState(0);
  const [cellSheet, setCellSheet] = useState<CellSheet | null>(null);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalHorse, setQuickModalHorse] = useState<HorseRow | null>(null);
  const [quickPrefill, setQuickPrefill] = useState<{
    type?: TrainingType | null;
    rider?: TrainingRider | null;
    duration?: number | null;
  } | null>(null);
  const [planModalData, setPlanModalData] = useState<{ horse: HorseRow; date: Date } | null>(null);

  const days = getWeekDays(weekOffset);

  // ── Lookup helpers ──────────────────────────────────────────────────────────

  const getSessionsForCell = useCallback(
    (horseId: string, date: Date): TrainingSession[] => {
      const dateStr = format(date, "yyyy-MM-dd");
      return sessions.filter((s) => s.horse_id === horseId && s.date.slice(0, 10) === dateStr);
    },
    [sessions]
  );

  const getPlannedForCell = useCallback(
    (horseId: string, date: Date): TrainingPlannedSession[] => {
      const dateStr = format(date, "yyyy-MM-dd");
      return plannedSessions.filter((p) => p.horse_id === horseId && p.date.slice(0, 10) === dateStr);
    },
    [plannedSessions]
  );

  // ── Actions cellule vide ────────────────────────────────────────────────────

  const handleLogNow = () => {
    if (cellSheet?.kind !== "empty") return;
    setQuickModalHorse(cellSheet.horse);
    setQuickPrefill(null);
    setCellSheet(null);
    setQuickModalOpen(true);
  };

  const handlePlan = () => {
    if (cellSheet?.kind !== "empty") return;
    const data = { horse: cellSheet.horse, date: cellSheet.date };
    setCellSheet(null);
    setPlanModalData(data);
  };

  const handleQuickMarcheur = async () => {
    if (!cellSheet || cellSheet.kind !== "empty") return;
    const { horse, date } = cellSheet;
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
    const isCurrent = isToday(date);
    const dateStr = format(date, "yyyy-MM-dd");

    setCellSheet(null);

    if (isPast || isCurrent) {
      const { error } = await supabase.from("training_sessions").insert({
        horse_id: horse.id,
        date: dateStr,
        type: "marcheur" as TrainingType,
        duration_min: 30,
        intensity: 1,
        feeling: 3,
        rider: null,
        notes: null,
      });
      if (error) { toast.error("Erreur"); return; }
    } else {
      const { error } = await supabase.from("training_planned_sessions").insert({
        horse_id: horse.id,
        date: dateStr,
        type: "marcheur" as TrainingType,
        duration_min_target: 30,
        qui_sen_occupe: null,
        notes: null,
        status: "planned",
        linked_session_id: null,
      });
      if (error) { toast.error("Erreur"); return; }
    }

    toast.success("Marcheur ajouté !");
    router.refresh();
  };

  // ── Actions validation planned ──────────────────────────────────────────────

  const handleCheckDone = async () => {
    if (cellSheet?.kind !== "planned") return;
    const { planned, horse, date } = cellSheet;

    const { data: newSession, error: insertErr } = await supabase
      .from("training_sessions")
      .insert({
        horse_id: horse.id,
        date: format(date, "yyyy-MM-dd"),
        type: planned.type,
        duration_min: planned.duration_min_target ?? 45,
        intensity: planned.intensity_target ?? (3 as 1 | 2 | 3 | 4 | 5),
        feeling: 3 as 1 | 2 | 3 | 4 | 5,
        rider: planned.qui_sen_occupe ?? null,
        notes: planned.notes ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !newSession) {
      toast.error("Erreur lors de l'enregistrement");
      return;
    }

    const { error: updateErr } = await supabase
      .from("training_planned_sessions")
      .update({ linked_session_id: newSession.id })
      .eq("id", planned.id);

    if (updateErr) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    toast.success("Séance cochée !");
    setCellSheet(null);
    router.refresh();
  };

  const handleCompleteSession = () => {
    if (cellSheet?.kind !== "planned") return;
    const { planned, horse } = cellSheet;
    setQuickModalHorse(horse);
    setQuickPrefill({
      type: planned.type,
      rider: planned.qui_sen_occupe ?? null,
      duration: planned.duration_min_target ?? null,
    });
    setCellSheet(null);
    setQuickModalOpen(true);
  };

  const handleDeletePlanned = async () => {
    if (cellSheet?.kind !== "planned") return;
    const { planned } = cellSheet;

    const { error } = await supabase
      .from("training_planned_sessions")
      .delete()
      .eq("id", planned.id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Planification supprimée");
    setCellSheet(null);
    router.refresh();
  };

  // ── Badge "À vérifier" — séances planifiées passées non validées ───────────

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const unvalidatedByHorse: Record<string, number> = {};
  for (const p of plannedSessions) {
    if (!p.linked_session_id && p.status === "planned" && p.date.slice(0, 10) < todayStr) {
      unvalidatedByHorse[p.horse_id] = (unvalidatedByHorse[p.horse_id] || 0) + 1;
    }
  }

  // ── Semaine badge ───────────────────────────────────────────────────────────

  const weekBadge =
    weekOffset === 0
      ? { label: "Cette semaine", cls: "bg-orange text-white" }
      : weekOffset < 0
      ? { label: "Historique", cls: "bg-gray-100 text-gray-500" }
      : { label: "Planifié", cls: "bg-blue-100 text-blue-600" };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-black">Tableau de la semaine</h1>
          <p className="text-sm text-gray-500">Vue multi-chevaux</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${weekBadge.cls}`}>
            {weekBadge.label}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-semibold text-gray-700 min-w-[160px] text-center">
              {weekLabel(days)}
            </span>

            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-semibold text-orange hover:underline"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: "500px" }}>
            <thead>
              <tr className="border-b border-gray-100">
                {/* Colonne cheval */}
                <th
                  className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-2xs font-bold uppercase tracking-widest text-gray-400"
                  style={{ minWidth: "140px" }}
                >
                  Cheval
                </th>

                {days.map((day) => {
                  const todayCol = isToday(day);
                  return (
                    <th
                      key={day.toISOString()}
                      className={`px-1 py-2 text-center text-2xs font-bold text-gray-500 ${
                        todayCol ? "bg-orange/5" : ""
                      }`}
                      style={{ minWidth: "52px" }}
                    >
                      <div className={`${todayCol ? "text-orange font-black" : ""}`}>
                        {format(day, "EEE", { locale: fr }).slice(0, 3)}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          todayCol
                            ? "w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center mx-auto font-black"
                            : "text-gray-400"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {horses.map((horse, rowIdx) => {
                const mode = horse.horse_index_mode;
                const modeBadge = mode ? MODE_BADGE[mode] : null;

                return (
                  <tr
                    key={horse.id}
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    {/* Colonne cheval sticky */}
                    <td
                      className="sticky left-0 z-10 px-3 py-2 align-middle"
                      style={{
                        minWidth: "140px",
                        backgroundColor: rowIdx % 2 === 0 ? "white" : "rgb(249 250 251 / 0.5)",
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-black truncate max-w-[90px]">
                            {horse.name}
                          </span>
                          {modeBadge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${modeBadge.bg} ${modeBadge.text} flex-shrink-0`}
                            >
                              {modeBadge.label}
                            </span>
                          )}
                        </div>
                        {mode === "IC" && (
                          <span className="text-[10px] text-orange font-medium">Saison active</span>
                        )}
                        {(mode === "IR" || mode === "IS") && (
                          <span className="text-[10px] text-gray-400">
                            {mode === "IR" ? "Restrictions" : "Stop travail"}
                          </span>
                        )}
                        {unvalidatedByHorse[horse.id] > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            ⚠ {unvalidatedByHorse[horse.id]} à vérifier
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cellules jours */}
                    {days.map((day) => {
                      const daySessions = getSessionsForCell(horse.id, day);
                      const dayPlanned = getPlannedForCell(horse.id, day);
                      const todayCol = isToday(day);

                      return (
                        <Cell
                          key={day.toISOString()}
                          horse={horse}
                          date={day}
                          daySessions={daySessions}
                          dayPlanned={dayPlanned}
                          userName={userName}
                          onTap={setCellSheet}
                          isTodayCol={todayCol}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-blue-200" />
          <span>Propriétaire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-blue-700" />
          <span>Cours coach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-orange/30" />
          <span>Coach / Longe / À pied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-200" />
          <span>Marcheur / Paddock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full border-2 border-dashed border-blue-400" />
          <span>Planifié</span>
        </div>
      </div>

      {/* ── Bottom Sheets ─────────────────────────────────────────────────── */}

      {cellSheet?.kind === "empty" && (
        <EmptySheet
          horse={cellSheet.horse}
          date={cellSheet.date}
          onClose={() => setCellSheet(null)}
          onLogNow={handleLogNow}
          onPlan={handlePlan}
          onQuickMarcheur={handleQuickMarcheur}
          isRestricted={isRestricted(cellSheet.horse.horse_index_mode, cellSheet.date)}
        />
      )}

      {cellSheet?.kind === "planned" && (
        <PlannedSheet
          horse={cellSheet.horse}
          date={cellSheet.date}
          planned={cellSheet.planned}
          onClose={() => setCellSheet(null)}
          onCheckDone={handleCheckDone}
          onCompleteSession={handleCompleteSession}
          onDeletePlanned={handleDeletePlanned}
        />
      )}

      {/* ── Plan Modal ─────────────────────────────────────────────────────── */}

      {planModalData && (
        <PlanModal
          horse={planModalData.horse}
          date={planModalData.date}
          onClose={() => setPlanModalData(null)}
          onSaved={() => {
            setPlanModalData(null);
            router.refresh();
          }}
        />
      )}

      {/* ── QuickTrainingModal ─────────────────────────────────────────────── */}

      {quickModalHorse && (
        <QuickTrainingModal
          open={quickModalOpen}
          onClose={() => {
            setQuickModalOpen(false);
            setQuickModalHorse(null);
            setQuickPrefill(null);
          }}
          horseId={quickModalHorse.id}
          horseName={quickModalHorse.name}
          onSaved={() => {
            setQuickModalOpen(false);
            setQuickModalHorse(null);
            setQuickPrefill(null);
            router.refresh();
          }}
          prefill={quickPrefill}
        />
      )}

      {/* Attribut pour satisfaire userId (évite unused warning) */}
      <span data-userid={userId} className="hidden" />
    </div>
  );
}
