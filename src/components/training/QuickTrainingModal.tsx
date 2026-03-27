"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, subDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { TrainingType, TrainingRider, TrainingPlannedSession, RehabProtocol, HorseIndexMode, HorseGrowthMilestone } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import Modal from "@/components/ui/Modal";
import VoiceButton from "./VoiceButton";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, HeartPulse, AlertTriangle, Link2, ChevronDown, ImagePlus } from "lucide-react";

export const DISCIPLINE_ITEMS: { type: TrainingType; emoji: string; label: string }[] = [
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
  { type: "paddock",               emoji: "🌾", label: "Paddock" },
  { type: "concours",              emoji: "🏆", label: "Concours" },
  { type: "autre",                 emoji: "✳️", label: "Autre" },
];

// Types autorisés par mode non-actif (TRAV-18)
const MODE_ALLOWED_TYPES: Partial<Record<HorseIndexMode, TrainingType[]>> = {
  IR: ["stretching", "longe", "marcheur", "travail_a_pied", "balade", "paddock", "autre"],
  IS: ["balade", "marcheur", "travail_a_pied", "stretching", "paddock", "autre"],
  ICr: ["travail_a_pied", "longe", "longues_renes", "balade", "stretching", "marcheur", "paddock", "autre"],
};

// Intensité max par mode (valeur sur 5)
const MODE_MAX_INTENSITY: Partial<Record<HorseIndexMode, number>> = {
  IR: 3, // Normal max
  IS: 2, // Léger max
};

const MODE_RESTRICTION_LABEL: Partial<Record<HorseIndexMode, string>> = {
  IR: "Mode Convalescence — seuls les exercices doux sont proposés.",
  IS: "Mode Retraite — seuls les contacts légers sont proposés.",
  ICr: "Mode Croissance — travail à pied et longe uniquement.",
};


export const INTENSITY_OPTIONS = [
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

export const RIDER_OPTIONS: { value: TrainingRider; label: string; emoji: string }[] = [
  { value: "owner",             emoji: "🧑", label: "Moi seule" },
  { value: "owner_with_coach",  emoji: "🎓", label: "Cours coach" },
  { value: "coach",             emoji: "👤", label: "Coach seul·e" },
  { value: "longe",             emoji: "🌀", label: "Longe" },
  { value: "travail_a_pied",    emoji: "🧘", label: "À pied" },
];

const RECUP_OPTIONS = [
  { value: "Douche",           emoji: "🚿" },
  { value: "Guêtres froid",    emoji: "🧊" },
  { value: "Tapis de massage", emoji: "🛏️" },
  { value: "Argile",           emoji: "🪨" },
  { value: "Bandes de repos",  emoji: "🩹" },
  { value: "Rien",             emoji: "—" },
];

export const DURATION_PICKS = [15, 20, 30, 45, 60, 90, 120, 150];

type DateMode = "today" | "yesterday" | "custom";

export interface PrefillData {
  type?: TrainingType | null;
  rider?: TrainingRider | null;
  duration?: number | null;
  intensity?: number | null;
  duree_planifiee?: number | null;
}

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
  prefill?: PrefillData | null;
  initialMode?: "log" | "plan";
}

export default function QuickTrainingModal({
  open, onClose, horseId, horseName, onSaved,
  todayPlanned, rehabProtocol, horseMode, competitions, riderLog, prefill, initialMode,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showHealthBridge, setShowHealthBridge] = useState(false);
  const [showCoachMsg, setShowCoachMsg] = useState(false);
  const [coachMsg, setCoachMsg] = useState("");
  // ICr — validation jalon après séance
  const [showMilestoneStep, setShowMilestoneStep] = useState(false);
  const [pendingMilestones, setPendingMilestones] = useState<HorseGrowthMilestone[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [mode, setMode] = useState<"log" | "plan">(initialMode ?? "log");
  const [planDate, setPlanDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));

  // Form state
  const [discipline, setDiscipline] = useState<TrainingType | null>(null);
  const [riderIdx, setRiderIdx] = useState(0);
  const [intensityIdx, setIntensityIdx] = useState(1);
  const [feelingIdx, setFeelingIdx] = useState(1);
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [linkedCompetitionId, setLinkedCompetitionId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showDetails, setShowDetails] = useState(false);
  const [lieu, setLieu] = useState<string | null>(null);
  const [equipementRecup, setEquipementRecup] = useState<string[]>([]);
  const [objectif, setObjectif] = useState("");
  const [coachPresent, setCoachPresent] = useState<boolean | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  // ICr foal session fields (TRAV-20)
  const [foalSessionType, setFoalSessionType] = useState<string | null>(null);
  const [foalReaction, setFoalReaction] = useState<string | null>(null);

  // Apply prefill when modal opens with prefill data
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.type) setDiscipline(prefill.type);
    if (prefill.rider) {
      const idx = RIDER_OPTIONS.findIndex(r => r.value === prefill.rider);
      if (idx >= 0) setRiderIdx(idx);
    }
    if (prefill.duration) {
      const pickIdx = DURATION_PICKS.indexOf(prefill.duration);
      if (pickIdx >= 0) { setDuration(DURATION_PICKS[pickIdx]); setShowCustom(false); }
      else { setCustomDuration(String(prefill.duration)); setShowCustom(true); }
    }
    if (prefill.intensity != null) {
      const idx = INTENSITY_OPTIONS.reduce((best, opt, i) =>
        Math.abs(opt.value - prefill.intensity!) < Math.abs(INTENSITY_OPTIONS[best].value - prefill.intensity!) ? i : best, 0);
      setIntensityIdx(idx);
    }
  }, [open, prefill]);

  const effectiveDuration = showCustom && customDuration ? parseInt(customDuration) || 45 : duration;
  const effectiveDate = dateMode === "today"
    ? format(new Date(), "yyyy-MM-dd")
    : dateMode === "yesterday"
    ? format(subDays(new Date(), 1), "yyyy-MM-dd")
    : customDate;

  // Marcheur/paddock: hide Qui monte / Intensité / État du cheval
  const isOnlyComplement = discipline === "marcheur" || discipline === "paddock";

  // Mode-based restrictions (TRAV-18)
  const allowedTypes = horseMode ? MODE_ALLOWED_TYPES[horseMode] ?? null : null;
  const maxIntensityValue = horseMode ? (MODE_MAX_INTENSITY[horseMode] ?? 5) : 5;
  const modeRestrictionLabel = horseMode ? MODE_RESTRICTION_LABEL[horseMode] ?? null : null;
  const filteredDisciplineItems = allowedTypes
    ? DISCIPLINE_ITEMS.filter((item) => allowedTypes.includes(item.type))
    : DISCIPLINE_ITEMS;

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

  const uploadMedia = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "bin";
      const filename = `${horseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("training-media").upload(filename, file);
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSave = async () => {
    if (!discipline) {
      toast.error("Sélectionnez un type de travail");
      return;
    }
    setLoading(true);

    // ── Plan mode ────────────────────────────────────────────────────────
    if (mode === "plan") {
      const planPayload = {
        horse_id: horseId,
        date: planDate,
        type: discipline!,
        duration_min_target: effectiveDuration,
        notes: notes.trim() || null,
        qui_sen_occupe: isOnlyComplement ? null : (RIDER_OPTIONS[riderIdx].value as TrainingRider),
        intensity_target: isOnlyComplement ? null : (INTENSITY_OPTIONS[intensityIdx].value as 1|2|3|4|5),
      };
      const { error } = await supabase.from("training_planned_sessions").insert(planPayload);
      if (error) {
        toast.error("Erreur lors de l'enregistrement");
      } else {
        toast.success("Séance planifiée !");
        reset();
        onSaved();
      }
      setLoading(false);
      return;
    }

    const rider = isOnlyComplement ? null : RIDER_OPTIONS[riderIdx].value;
    const feelingValue = isOnlyComplement ? 3 : FEELING_OPTIONS[feelingIdx].value;
    const intensityValue = isOnlyComplement ? 1 : INTENSITY_OPTIONS[intensityIdx].value;
    const effectiveType: TrainingType = discipline!;

    let mediaUrls: string[] = [];
    if (mediaFiles.length > 0) mediaUrls = await uploadMedia(mediaFiles);

    const effectiveCoachPresent = coachPresent !== null
      ? coachPresent
      : rider === "owner_with_coach" || rider === "coach";

    const payload = {
      horse_id: horseId,
      date: effectiveDate,
      type: effectiveType,
      duration_min: effectiveDuration,
      intensity: intensityValue as 1|2|3|4|5,
      feeling: feelingValue as 1|2|3|4|5,
      notes: notes || null,
      rider,
      coach_present: effectiveCoachPresent,
      objectif: objectif.trim() || null,
      lieu,
      equipement_recuperation: equipementRecup.length > 0 ? equipementRecup.join(", ") : null,
      mode_entree: "logge" as const,
      est_complement: discipline === "marcheur" || discipline === "paddock",
      duree_planifiee: prefill?.duree_planifiee ?? null,
      wearable_source: null,
      linked_competition_id: linkedCompetitionId || null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      // ICr foal fields (TRAV-20) — colonnes ajoutées en migration 051
      // Ne pas inclure dans le payload pour les autres modes (évite erreur si migration non appliquée)
      ...(horseMode === "ICr" ? {
        session_type: foalSessionType || null,
        foal_reaction: foalReaction || null,
      } : {}),
    };

    if (!navigator.onLine) {
      const { enqueue } = await import("@/lib/offlineQueue");
      await enqueue({ table: "training_sessions", method: "insert", payload });
      toast.success("Séance sauvegardée hors ligne 📴 — sera synchronisée à la reconnexion");
      trackEvent({ event_name: "training_created_offline", event_category: "training", properties: { type: effectiveType } });
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
      properties: { type: effectiveType, mode: "quick", duration_min: effectiveDuration, rider: rider || "complement_only" },
    });

    // ICr — proposer la validation d'un jalon après la séance
    if (horseMode === "ICr") {
      const { data: ms } = await supabase
        .from("horse_growth_milestones")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: true });
      setPendingMilestones((ms as HorseGrowthMilestone[]) ?? []);
      setShowMilestoneStep(true);
      setLoading(false);
      return;
    }

    if (!isOnlyComplement && feelingValue === 1) {
      setShowHealthBridge(true);
      onSaved();
    } else {
      const msg = computeCoachMsg();
      if (msg) { setCoachMsg(msg); setShowCoachMsg(true); onSaved(); }
      else { reset(); onSaved(); }
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
    setShowDetails(false);
    setLieu(null);
    setEquipementRecup([]);
    setObjectif("");
    setCoachPresent(null);
    setMediaFiles([]);
    setFoalSessionType(null);
    setFoalReaction(null);
    setShowHealthBridge(false);
    setShowCoachMsg(false);
    setCoachMsg("");
    setLinkedCompetitionId(null);
    setShowMilestoneStep(false);
    setPendingMilestones([]);
    setSelectedMilestoneId(null);
    setMode(initialMode ?? "log");
    setPlanDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const handleClose = () => { reset(); onClose(); };

  const handleMilestoneValidate = async () => {
    if (selectedMilestoneId) {
      setMilestoneLoading(true);
      await supabase
        .from("horse_growth_milestones")
        .update({ date: effectiveDate, notes: `Validé depuis séance du ${new Date(effectiveDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` })
        .eq("id", selectedMilestoneId);
      setMilestoneLoading(false);
      toast.success("Jalon validé !");
    }
    reset();
    onSaved();
  };

  // suppress unused import warning
  void router;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === "plan"
        ? (horseName ? `Planifier — ${horseName}` : "Planifier une séance")
        : (horseName ? `Logger — ${horseName}` : "Logger une séance")}
    >
      {/* Message coach post-séance */}
      {showCoachMsg && (
        <div className="flex flex-col items-center gap-4 py-6 px-2 text-center">
          <span className="text-4xl">🌿</span>
          <p className="text-sm text-gray-700 leading-relaxed">{coachMsg}</p>
          <button onClick={() => { setShowCoachMsg(false); reset(); }} className="btn-primary w-full justify-center">
            Fermer
          </button>
        </div>
      )}

      {/* ICr — Validation jalon après séance */}
      {!showCoachMsg && showMilestoneStep ? (
        <div className="space-y-4 py-2">
          <div className="text-center space-y-1.5">
            <span className="text-3xl">🏅</span>
            <p className="text-sm font-bold text-black">Valider un jalon ?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Cette séance correspond-elle à une étape clé du développement de {horseName ?? "votre cheval"} ?
            </p>
          </div>

          {pendingMilestones.length > 0 ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {pendingMilestones.map((m) => {
                const isSelected = selectedMilestoneId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMilestoneId(isSelected ? null : m.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                      isSelected ? "border-orange bg-orange/5" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-xs font-semibold text-black">{m.label ?? m.milestone_type}</p>
                    <p className="text-2xs text-gray-400 mt-0.5">
                      Prévu le {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">Aucun jalon à valider pour le moment.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { reset(); onSaved(); }}
              className="btn-ghost flex-1 text-sm py-2.5"
            >
              Ignorer
            </button>
            <button
              onClick={handleMilestoneValidate}
              disabled={milestoneLoading}
              className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40"
            >
              {milestoneLoading ? "Enregistrement…" : selectedMilestoneId ? "Valider le jalon" : "Continuer sans valider"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Pont Travail→Santé */}
      {!showCoachMsg && !showMilestoneStep && showHealthBridge ? (
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
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>Ignorer</Button>
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
      ) : !showCoachMsg && !showMilestoneStep && !showHealthBridge ? (
        <div className="space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setMode("log")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                mode === "log" ? "bg-black text-white" : "bg-white text-gray-400 hover:text-black"
              }`}
            >
              Je logge
            </button>
            <button
              type="button"
              onClick={() => setMode("plan")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                mode === "plan" ? "bg-black text-white" : "bg-white text-gray-400 hover:text-black"
              }`}
            >
              Je planifie
            </button>
          </div>

          {/* Voice — log only */}
          {mode === "log" && <VoiceButton onResult={handleVoiceResult} />}

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

          {/* Copier séance prévue */}
          {todayPlanned && mode === "log" && (
            <button
              type="button"
              onClick={copyFromPlanned}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:bg-orange-light hover:border-orange transition-all text-left"
            >
              <ClipboardList className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-600">
                  Copier séance prévue :{" "}
                  <span className="text-orange capitalize">{todayPlanned.type.replace(/_/g, " ")}</span>
                </p>
                {todayPlanned.duration_min_target && (
                  <p className="text-2xs text-gray-400">{todayPlanned.duration_min_target}min prévu</p>
                )}
              </div>
            </button>
          )}

          {/* Date */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Date {mode === "plan" ? "prévue" : ""}</p>
            {mode === "plan" ? (
              <input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Type de travail */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type de travail</p>
            {modeRestrictionLabel && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-2xs text-amber-700 leading-snug">{modeRestrictionLabel}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {filteredDisciplineItems.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setDiscipline(discipline === item.type ? null : item.type)}
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

          {/* Lier à un concours */}
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
                    !linkedCompetitionId ? "border-orange bg-orange-light text-orange" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
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
                      linkedCompetitionId === c.id ? "border-orange bg-orange-light text-orange" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
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

          {/* Qui s'en occupe — hidden for marcheur/paddock */}
          {!isOnlyComplement && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Qui s&apos;en occupe</p>
              <div className="grid grid-cols-3 gap-2">
                {RIDER_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiderIdx(i)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      riderIdx === i ? "border-orange bg-orange-light text-orange" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span className="leading-tight text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    !showCustom && duration === d ? "border-orange bg-orange-light text-orange" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {d < 60 ? `${d} min` : `${d / 60}h`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  showCustom ? "border-orange bg-orange-light text-orange" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
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

          {/* Intensité — hidden for complement-only and plan mode */}
          {!isOnlyComplement && mode === "log" && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Intensité</p>
              <div className="grid grid-cols-3 gap-2">
                {INTENSITY_OPTIONS.map((opt, i) => {
                  const isDisabled = opt.value > maxIntensityValue;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setIntensityIdx(i)}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        isDisabled
                          ? "opacity-30 cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400"
                          : intensityIdx === i ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* État du cheval — hidden for complement-only and plan mode */}
          {!isOnlyComplement && mode === "log" && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                {horseMode === "IR" ? "Tolérance du travail" : "État du cheval"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FEELING_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFeelingIdx(i)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      feelingIdx === i
                        ? opt.value === 1 ? "border-danger bg-red-50 text-danger" : "border-orange bg-orange-light text-orange"
                        : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              {FEELING_OPTIONS[feelingIdx].value === 1 && (
                <p className="mt-2 text-xs text-danger font-medium px-1">
                  ⚠ En douleur — pensez à consulter votre vétérinaire
                </p>
              )}
            </div>
          )}

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

          {/* ICr — type de séance & réaction du poulain (TRAV-20) */}
          {horseMode === "ICr" && (
            <div className="space-y-3 p-3 rounded-xl bg-green-50 border border-green-100">
              <p className="text-xs font-semibold text-green-800">🐣 Séance poulain</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="label mb-1">Type d&apos;activité</p>
                  <select
                    value={foalSessionType ?? ""}
                    onChange={(e) => setFoalSessionType(e.target.value || null)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                  >
                    <option value="">— choisir —</option>
                    <option value="manipulation">Manipulation</option>
                    <option value="toilettage">Toilettage</option>
                    <option value="longe_douce">Longe douce</option>
                    <option value="debourrage">Débourrage</option>
                    <option value="premiere_monte">Première monte</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <p className="label mb-1">Réaction du poulain</p>
                  <select
                    value={foalReaction ?? ""}
                    onChange={(e) => setFoalReaction(e.target.value || null)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                  >
                    <option value="">— observer —</option>
                    <option value="calme">😌 Calme</option>
                    <option value="attentif">🧐 Attentif</option>
                    <option value="nerveux">😬 Nerveux</option>
                    <option value="agite">😤 Agité</option>
                    <option value="difficile">😣 Difficile</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Ajouter des détails */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors w-full"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              {showDetails ? "Masquer les détails" : "Ajouter des détails"}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-4">

                {/* Objectif */}
                <div>
                  <p className="label mb-1.5">Objectif de séance</p>
                  <input
                    type="text"
                    value={objectif}
                    onChange={(e) => setObjectif(e.target.value)}
                    placeholder="Ex : travail du rassembler, extensions..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
                  />
                </div>

                {/* Lieu */}
                <div>
                  <p className="label mb-2">Lieu</p>
                  <div className="flex flex-wrap gap-2">
                    {["Carrière", "Manège", "Extérieur", "Rond de longe", "Marcheur"].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLieu(lieu === l ? null : l)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                          lieu === l ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Récupération */}
                <div>
                  <p className="label mb-2">Récupération</p>
                  <div className="flex flex-wrap gap-2">
                    {RECUP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEquipementRecup((prev) =>
                          prev.includes(opt.value) ? prev.filter((x) => x !== opt.value) : [...prev, opt.value]
                        )}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                          equipementRecup.includes(opt.value) ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coach présent */}
                <div>
                  <p className="label mb-2">Coach présent</p>
                  <div className="flex gap-2">
                    {([{ label: "Oui", val: true }, { label: "Non", val: false }] as const).map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCoachPresent(coachPresent === val ? null : val)}
                        className={`px-5 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                          coachPresent === val ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Médias */}
                <div>
                  <p className="label mb-2">Médias <span className="text-gray-400 font-normal">(photos / vidéos)</span></p>
                  <label className="flex items-center gap-2 cursor-pointer w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange hover:bg-orange-light transition-all text-xs font-semibold text-gray-500 hover:text-orange">
                    <ImagePlus className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {mediaFiles.length > 0
                        ? `${mediaFiles.length} fichier${mediaFiles.length > 1 ? "s" : ""} sélectionné${mediaFiles.length > 1 ? "s" : ""}`
                        : "Ajouter des photos ou vidéos"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {mediaFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mediaFiles.map((f, i) => (
                        <span key={i} className="text-2xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full truncate max-w-[140px]">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose}>Annuler</Button>
            <Button type="button" loading={loading} onClick={handleSave}>Enregistrer</Button>
          </div>

        </div>
      ) : null}
    </Modal>
  );
}
