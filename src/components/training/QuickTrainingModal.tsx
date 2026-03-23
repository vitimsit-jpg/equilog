"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { TrainingType, TrainingRider, TrainingPlannedSession, RehabProtocol, HorseIndexMode } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import VoiceButton from "./VoiceButton";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, HeartPulse, AlertTriangle, Link2 } from "lucide-react";

const DISCIPLINE_ITEMS: { type: TrainingType; emoji: string; label: string }[] = [
  { type: "dressage",              emoji: "🎯", label: "Dressage" },
  { type: "plat",                  emoji: "🏇", label: "Plat" },
  { type: "stretching",            emoji: "🤸", label: "Stretching" },
  { type: "barres_sol",            emoji: "📏", label: "Barres au sol" },
  { type: "cavalettis",            emoji: "🔲", label: "Cavalettis" },
  { type: "meca_obstacles",        emoji: "🚧", label: "Méca obstacles" },
  { type: "obstacles_enchainement",emoji: "🏁", label: "Obstacles enchaînés" },
  { type: "cross_entrainement",    emoji: "🌲", label: "Cross entraîn." },
  { type: "longe",                 emoji: "🌀", label: "Longe" },
  { type: "longues_renes",         emoji: "🪢", label: "Longues rênes" },
  { type: "travail_a_pied",        emoji: "🦶", label: "Trav. à pied" },
  { type: "balade",                emoji: "🌿", label: "Balade" },
  { type: "trotting",              emoji: "🏃", label: "Trotting" },
  { type: "galop",                 emoji: "💨", label: "Galop" },
  { type: "marcheur",              emoji: "⚙️", label: "Marcheur" },
  { type: "concours",              emoji: "🏆", label: "Concours" },
  { type: "autre",                 emoji: "✳️", label: "Autre" },
];

const INTENSITY_OPTIONS = [
  { value: 2, label: "Léger",   inactive: "bg-green-50 text-green-600 border-green-200",  active: "bg-green-500 text-white border-green-500" },
  { value: 3, label: "Normal",  inactive: "bg-gray-50 text-gray-600 border-gray-200",     active: "bg-gray-700 text-white border-gray-700" },
  { value: 5, label: "Intense", inactive: "bg-red-50 text-red-600 border-red-200",        active: "bg-red-500 text-white border-red-500" },
];

const FEELING_OPTIONS = [
  { value: 5, emoji: "😄", label: "Très bien" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 3, emoji: "😐", label: "Neutre" },
  { value: 2, emoji: "😕", label: "Tendu" },
  { value: 2, emoji: "😴", label: "Fatigué" },
  { value: 1, emoji: "🤕", label: "Douleur" },
];

const RIDER_OPTIONS: { value: TrainingRider; label: string; emoji: string }[] = [
  { value: "owner",             emoji: "🧑", label: "Moi seule" },
  { value: "owner_with_coach",  emoji: "🎓", label: "Cours coach" },
  { value: "coach",             emoji: "👤", label: "Coach seul·e" },
  { value: "longe",             emoji: "🌀", label: "Longe" },
  { value: "travail_a_pied",    emoji: "🧘", label: "À pied" },
];

const DURATION_PICKS = [20, 30, 45, 60, 90];

type DateMode = "today" | "yesterday" | "custom";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName?: string;
  onSaved: () => void;
  todayPlanned?: TrainingPlannedSession | null;
  rehabProtocol?: RehabProtocol | null;
  horseMode?: HorseIndexMode | null;
  competitions?: { id: string; event_name: string; date: string }[] | null;
  riderLog?: { forme: string | null; douleurs: string[] | null; douleur_intensite: string | null } | null;
}

export default function QuickTrainingModal({ open, onClose, horseId, horseName, onSaved, todayPlanned, rehabProtocol, horseMode, competitions, riderLog }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"quick" | "detail">("quick");
  const [loading, setLoading] = useState(false);
  const [showHealthBridge, setShowHealthBridge] = useState(false);
  const [showCoachMsg, setShowCoachMsg] = useState(false);
  const [coachMsg, setCoachMsg] = useState("");

  // Form state
  const [discipline, setDiscipline] = useState<TrainingType | null>(null);
  const [riderIdx, setRiderIdx] = useState(0); // default: "Moi seule"
  const [intensityIdx, setIntensityIdx] = useState(1); // default Normal
  const [feelingIdx, setFeelingIdx] = useState(1);     // default Bien
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [linkedCompetitionId, setLinkedCompetitionId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const effectiveDuration = showCustom && customDuration ? parseInt(customDuration) || 45 : duration;

  const effectiveDate = dateMode === "today"
    ? format(new Date(), "yyyy-MM-dd")
    : dateMode === "yesterday"
    ? format(subDays(new Date(), 1), "yyyy-MM-dd")
    : customDate;

  const handleVoiceResult = (data: {
    type?: TrainingType | null;
    duration_min?: number | null;
    intensity?: 1|2|3|4|5 | null;
    feeling?: 1|2|3|4|5 | null;
    notes?: string | null;
    rider?: string | null;
  }) => {
    if (data.type) setDiscipline(data.type);
    if (data.duration_min) {
      const pick = DURATION_PICKS.indexOf(data.duration_min);
      if (pick >= 0) { setDuration(DURATION_PICKS[pick]); setShowCustom(false); }
      else { setCustomDuration(String(data.duration_min)); setShowCustom(true); }
    }
    if (data.intensity != null) {
      const intensity = data.intensity;
      const idx = INTENSITY_OPTIONS.reduce((best, opt, i) =>
        Math.abs(opt.value - intensity) < Math.abs(INTENSITY_OPTIONS[best].value - intensity) ? i : best, 0);
      setIntensityIdx(idx);
    }
    if (data.feeling) {
      const idx = FEELING_OPTIONS.findIndex(f => f.value === data.feeling);
      if (idx >= 0) setFeelingIdx(idx);
    }
    if (data.rider) {
      const idx = RIDER_OPTIONS.findIndex(r => r.value === data.rider);
      if (idx >= 0) setRiderIdx(idx);
    }
    if (data.notes) setNotes(data.notes);
  };

  const copyFromPlanned = () => {
    if (!todayPlanned) return;
    setDiscipline(todayPlanned.type as TrainingType);
    // scroll to duration is handled by browser naturally after state update
  };

  const computeCoachMsg = (): string | null => {
    if (!riderLog) return null;
    const backZones = ["Lombaires", "Bassin / sacro-iliaque", "Hanches / adducteurs", "Milieu du dos"];
    const hasBackPain = (riderLog.douleurs ?? []).some(z => backZones.includes(z));
    if (hasBackPain) {
      return `Tu as noté une douleur au dos aujourd'hui — pense à en tenir compte pour ta prochaine séance avec ${horseName}.`;
    }
    if (riderLog.forme === "fatigue") {
      return `Tu t'es donné malgré la fatigue — belle séance ! Pense à récupérer avant la prochaine séance avec ${horseName}.`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!discipline) { toast.error("Sélectionnez une discipline"); return; }
    setLoading(true);

    const rider = RIDER_OPTIONS[riderIdx].value;
    const feelingValue = FEELING_OPTIONS[feelingIdx].value;

    const payload = {
      horse_id: horseId,
      date: effectiveDate,
      type: discipline,
      duration_min: effectiveDuration,
      intensity: INTENSITY_OPTIONS[intensityIdx].value as 1|2|3|4|5,
      feeling: feelingValue as 1|2|3|4|5,
      notes: notes || null,
      rider,
      coach_present: rider === "owner_with_coach" || rider === "coach",
      objectif: null,
      lieu: null,
      equipement_recuperation: null,
      wearable_source: null,
      linked_competition_id: linkedCompetitionId || null,
    };

    // Offline: enqueue and return
    if (!navigator.onLine) {
      const { enqueue } = await import("@/lib/offlineQueue");
      await enqueue({ table: "training_sessions", method: "insert", payload });
      toast.success("Séance sauvegardée hors ligne 📴 — sera synchronisée à la reconnexion");
      trackEvent({ event_name: "training_created_offline", event_category: "training", properties: { type: discipline } });
      reset();
      onSaved();
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("training_sessions").insert(payload);

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      setLoading(false);
      return;
    }

    toast.success("Séance enregistrée !");
    trackEvent({
      event_name: "training_created",
      event_category: "training",
      properties: { type: discipline, mode: "quick", duration_min: effectiveDuration, rider },
    });

    // Pont Travail→Santé : si feeling = Douleur
    if (feelingValue === 1) {
      setShowHealthBridge(true);
      onSaved(); // refresh parent data in background
    } else {
      const msg = computeCoachMsg();
      if (msg) {
        setCoachMsg(msg);
        setShowCoachMsg(true);
        onSaved();
      } else {
        reset();
        onSaved();
      }
    }
    setLoading(false);
  };

  const reset = () => {
    setDiscipline(null);
    setRiderIdx(0);
    setIntensityIdx(1);
    setFeelingIdx(1);
    setDuration(45);
    setShowCustom(false);
    setCustomDuration("");
    setNotes("");
    setDateMode("today");
    setCustomDate(format(new Date(), "yyyy-MM-dd"));
    setShowHealthBridge(false);
    setShowCoachMsg(false);
    setCoachMsg("");
    setLinkedCompetitionId(null);
  };

  const handleClose = () => { setMode("quick"); reset(); onClose(); };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === "detail" ? "Nouvelle séance — Détails" : horseName ? `Logger — ${horseName}` : "Logger une séance"}
    >
      {/* Message coach post-séance (suggestion cavalier→cheval) */}
      {showCoachMsg && (
        <div className="flex flex-col items-center gap-4 py-6 px-2 text-center">
          <span className="text-4xl">🌿</span>
          <p className="text-sm text-gray-700 leading-relaxed">{coachMsg}</p>
          <button
            onClick={() => { setShowCoachMsg(false); reset(); }}
            className="btn-primary w-full justify-center"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Pont Travail→Santé */}
      {!showCoachMsg && showHealthBridge ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-orange-light flex items-center justify-center">
              <HeartPulse className="h-7 w-7 text-orange" />
            </div>
            <div>
              <p className="font-bold text-black text-base">
                {horseName ? `${horseName} semble en douleur` : "Cheval en douleur"}
              </p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Ajouter un soin au carnet de santé pour garder une trace et alerter votre vétérinaire ?
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              Ignorer
            </Button>
            <Link
              href={`/horses/${horseId}/health`}
              className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm font-semibold"
              onClick={handleClose}
            >
              <HeartPulse className="h-4 w-4" />
              Ajouter un soin →
            </Link>
          </div>
        </div>
      ) : !showCoachMsg && !showHealthBridge && mode === "detail" ? (
        <TrainingForm
          horseId={horseId}
          onSaved={() => { setMode("quick"); reset(); router.refresh(); onSaved(); }}
          onCancel={() => setMode("quick")}
        />
      ) : !showCoachMsg && !showHealthBridge ? (
        <div className="space-y-5">

          {/* Voice */}
          <VoiceButton onResult={handleVoiceResult} />

          {/* IR rehab protocol banner */}
          {(() => {
            const currentPhase = rehabProtocol?.phases?.[rehabProtocol.current_phase_index] ?? null;
            const isOverIntensity = currentPhase ? INTENSITY_OPTIONS[intensityIdx].value > currentPhase.max_intensity : false;
            const isOverDuration = currentPhase ? effectiveDuration > currentPhase.max_duration_min : false;
            return horseMode === "IR" && currentPhase ? (
              <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${isOverIntensity || isOverDuration ? "bg-red-50 border-red-200" : "bg-beige border-gray-100"}`}>
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isOverIntensity || isOverDuration ? "text-danger" : "text-gray-400"}`} />
                <div>
                  <p className={`text-xs font-bold ${isOverIntensity || isOverDuration ? "text-danger" : "text-gray-600"}`}>
                    Phase {rehabProtocol!.current_phase_index + 1} — {currentPhase.name}
                  </p>
                  <p className="text-2xs text-gray-500 mt-0.5">
                    Max {currentPhase.max_duration_min}min · Intensité ≤ {currentPhase.max_intensity}/5
                    {(isOverIntensity || isOverDuration) && " · ⚠ Limites dépassées"}
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Copier séance prévue — visible uniquement si plannedSession aujourd'hui */}
          {todayPlanned && (
            <button
              type="button"
              onClick={copyFromPlanned}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:bg-orange-light hover:border-orange transition-all text-left"
            >
              <ClipboardList className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-600">
                  Copier séance prévue :{" "}
                  <span className="text-orange capitalize">
                    {todayPlanned.type.replace(/_/g, " ")}
                  </span>
                </p>
                {todayPlanned.duration_min_target && (
                  <p className="text-2xs text-gray-400">{todayPlanned.duration_min_target}min prévu</p>
                )}
              </div>
            </button>
          )}

          {/* Date */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Date</p>
            <div className="flex gap-2">
              {(["today", "yesterday", "custom"] as DateMode[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateMode(d)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                    dateMode === d
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {d === "today" ? "Aujourd'hui" : d === "yesterday" ? "Hier" : "Autre"}
                </button>
              ))}
            </div>
            {dateMode === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
                autoFocus
              />
            )}
          </div>

          {/* Discipline */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type de travail</p>
            <div className="grid grid-cols-3 gap-2">
              {DISCIPLINE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setDiscipline(item.type)}
                  className={`tap-scale-sm flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold min-h-[64px] ${
                    discipline === item.type
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

          {/* Lier à un concours — visible uniquement si type=concours et competitions disponibles */}
          {discipline === "concours" && competitions && competitions.length > 0 && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> Lier à un concours
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setLinkedCompetitionId(null)}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    !linkedCompetitionId
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                  }`}
                >
                  Ne pas lier
                </button>
                {competitions.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setLinkedCompetitionId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      linkedCompetitionId === c.id
                        ? "border-orange bg-orange-light text-orange"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <span className="font-semibold">{c.event_name}</span>
                    <span className="ml-2 text-gray-400 font-normal">
                      {format(new Date(c.date), "d MMM yyyy", { locale: fr })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qui monte */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Qui monte</p>
            <div className="grid grid-cols-3 gap-2">
              {RIDER_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRiderIdx(i)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    riderIdx === i
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

          {/* Durée */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Durée</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_PICKS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setShowCustom(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    !showCustom && duration === d
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {d < 60 ? `${d} min` : `${d / 60}h`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  showCustom
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                +
              </button>
            </div>
            {showCustom && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Ex : 75"
                  min="1" max="300"
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
                  autoFocus
                />
                <span className="text-sm text-gray-400">minutes</span>
              </div>
            )}
          </div>

          {/* Intensité */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Intensité</p>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITY_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensityIdx(i)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    intensityIdx === i ? opt.active : opt.inactive
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Humeur du cheval */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              {horseMode === "IR" ? "Tolérance du travail" : "Humeur du cheval"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FEELING_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFeelingIdx(i)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    feelingIdx === i
                      ? opt.value === 1
                        ? "border-danger bg-red-50 text-danger"
                        : "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {/* Alerte visuelle si Douleur sélectionné */}
            {FEELING_OPTIONS[feelingIdx].value === 1 && (
              <p className="mt-2 text-xs text-danger font-medium px-1">
                ⚠ En douleur — pensez à consulter votre vétérinaire
              </p>
            )}
          </div>

          {/* Note rapide */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Note rapide <span className="font-normal normal-case text-gray-300">(optionnel)</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Points travaillés, observations..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setMode("detail")}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Mode détaillé →
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>Annuler</Button>
              <Button type="button" loading={loading} onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>

        </div>
      ) : null}
    </Modal>
  );
}
