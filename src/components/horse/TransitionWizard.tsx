"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { changeHorseMode } from "@/lib/changeHorseMode";
import type { HorseIndexMode, HorseGrowthMilestone, GrowthMilestoneType, HorseMedication } from "@/lib/supabase/types";
import { HORSE_MODE_LABELS, HORSE_MODE_EMOJIS } from "@/hooks/useHorseMode";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

const MODES: HorseIndexMode[] = ["IC", "IE", "IP", "IR", "IS", "ICr"];

const MODE_DESCRIPTIONS: Record<HorseIndexMode, string> = {
  IC:  "Préparation et sorties en concours",
  IE:  "Pratique régulière, loisir ou club",
  IP:  "Reprise progressive après blessure ou pause",
  IR:  "Blessure, arrêt ou repos médical",
  IS:  "Cheval retraité ou à très faible activité",
  ICr: "Poulain ou jeune cheval en développement",
};

const MODE_WARNINGS: Partial<Record<HorseIndexMode, string>> = {
  IS: "Passer en Retraite masquera le journal de travail et les concours.",
  IR: "Passer en Convalescence activera le suivi rééducation.",
  ICr: "Passer en Croissance activera l'onglet Éducation.",
};

// Modes "actifs" qui nécessitent la checklist ICr → actif
const ACTIVE_MODES: HorseIndexMode[] = ["IC", "IE", "IP"];

// Jalons clés à vérifier pour la transition ICr → actif
const KEY_MILESTONE_TYPES: { type: GrowthMilestoneType; label: string; emoji: string; required: boolean }[] = [
  { type: "identification",       label: "Identification SIRE",       emoji: "🔖", required: true  },
  { type: "vaccination_complete", label: "Vaccination complète",      emoji: "💉", required: true  },
  { type: "vermifugation",        label: "Vermifuge régulier",        emoji: "🌿", required: false },
  { type: "debut_debourrage",     label: "Début du débourrage",       emoji: "🎓", required: false },
  { type: "premiere_monte",       label: "Première monte",            emoji: "🐴", required: false },
];

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  currentMode: HorseIndexMode | null;
  onModeChanged?: (mode: HorseIndexMode) => void;
}

type WizardStep = "mode" | "meds" | "checklist" | "confirm";

export default function TransitionWizard({ open, onClose, horseId, horseName, currentMode, onModeChanged }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<WizardStep>("mode");
  const [selectedMode, setSelectedMode] = useState<HorseIndexMode | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);

  // Active medications warning
  const [activeMeds, setActiveMeds] = useState<HorseMedication[]>([]);

  // ICr readiness checklist
  const [milestones, setMilestones] = useState<HorseGrowthMilestone[]>([]);
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  // Detect ICr → actif multi-step flow
  const isIcrToActive = currentMode === "ICr" && selectedMode !== null && ACTIVE_MODES.includes(selectedMode);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("mode");
      setSelectedMode(null);
      setReason("");
      setActiveMeds([]);
    }
  }, [open]);

  // Fetch milestones when entering checklist step
  useEffect(() => {
    if (step === "checklist" && isIcrToActive) {
      setMilestoneLoading(true);
      supabase
        .from("horse_growth_milestones")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: true })
        .then(({ data }) => {
          setMilestones((data as HorseGrowthMilestone[]) ?? []);
          setMilestoneLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isIcrToActive]);

  const handleNext = async () => {
    if (!selectedMode) return;
    setLoadingNext(true);
    const { data } = await supabase
      .from("horse_medications")
      .select("id, nom, dose, frequence, vet_prescripteur")
      .eq("horse_id", horseId)
      .eq("actif", true);
    const meds = (data as HorseMedication[]) ?? [];
    setActiveMeds(meds);
    setLoadingNext(false);

    if (meds.length > 0) {
      setStep("meds");
    } else if (isIcrToActive) {
      setStep("checklist");
    } else {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!selectedMode) return;
    setLoading(true);
    const { error } = await changeHorseMode({
      horseId,
      modeFrom: currentMode,
      modeTo: selectedMode,
      reason: reason.trim() || undefined,
    });
    setLoading(false);
    if (error) {
      toast.error("Erreur lors du changement de mode");
      return;
    }
    toast.success(`Mode de vie mis à jour : ${HORSE_MODE_LABELS[selectedMode]}`);
    onModeChanged?.(selectedMode);
    // Recalculer le Horse Index avec le nouveau mode
    fetch("/api/horse-index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horseId }),
    }).catch(() => {});
    onClose();
    router.refresh();
  };

  // Compute readiness: which key milestones are validated?
  const milestonesCompleted = (type: GrowthMilestoneType) =>
    milestones.some((m) => m.milestone_type === type);

  const allRequiredDone = KEY_MILESTONE_TYPES
    .filter((k) => k.required)
    .every((k) => milestonesCompleted(k.type));

  return (
    <Modal open={open} onClose={onClose} title={`Changer le mode de vie — ${horseName}`}>
      <div className="space-y-5">

        {/* ── Step 1 — Sélection du mode ── */}
        {step === "mode" && (
          <>
            <p className="text-sm text-gray-500 leading-relaxed">
              Le mode de vie adapte le suivi, les onglets et les recommandations d&apos;Equistra à la situation actuelle de votre cheval.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const isCurrent = m === currentMode;
                const isSelected = m === selectedMode;
                return (
                  <button
                    key={m}
                    onClick={() => !isCurrent && setSelectedMode(m)}
                    disabled={isCurrent}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                      isCurrent
                        ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "border-orange bg-orange/5"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{HORSE_MODE_EMOJIS[m]}</span>
                      <span className="text-xs font-bold text-black">{HORSE_MODE_LABELS[m]}</span>
                      {isCurrent && (
                        <span className="ml-auto text-2xs text-gray-400 font-semibold">Actuel</span>
                      )}
                    </div>
                    <p className="text-2xs text-gray-400 leading-snug">{MODE_DESCRIPTIONS[m]}</p>
                  </button>
                );
              })}
            </div>

            {selectedMode && MODE_WARNINGS[selectedMode] && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-800 leading-relaxed">{MODE_WARNINGS[selectedMode]}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button
                onClick={handleNext}
                disabled={!selectedMode || loadingNext}
                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40"
              >
                {loadingNext ? "Vérification…" : isIcrToActive ? "Vérifier la préparation →" : "Continuer →"}
              </button>
            </div>
          </>
        )}

        {/* ── Step meds — Ordonnances actives ── */}
        {step === "meds" && (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-black">Traitements en cours</p>
                <p className="text-xs text-gray-500">{horseName} a {activeMeds.length} traitement{activeMeds.length > 1 ? "s" : ""} actif{activeMeds.length > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 leading-relaxed mb-2">
                Vérifiez ces traitements avec votre vétérinaire avant de changer de mode de vie.
              </p>
              <div className="space-y-1.5">
                {activeMeds.map((med) => (
                  <div key={med.id} className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">💊</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-900">{med.nom}</p>
                      {med.dose && <p className="text-2xs text-amber-700">{med.dose}</p>}
                      {med.vet_prescripteur && <p className="text-2xs text-amber-600">Dr {med.vet_prescripteur}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep("mode")} className="btn-ghost flex-1 text-sm py-2.5">← Retour</button>
              <button
                onClick={() => setStep(isIcrToActive ? "checklist" : "confirm")}
                className="btn-primary flex-1 text-sm py-2.5"
              >
                Continuer quand même →
              </button>
            </div>
          </>
        )}

        {/* ── Step checklist — Checklist ICr → actif ── */}
        {step === "checklist" && isIcrToActive && (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-orange-light flex items-center justify-center text-lg">🎓</div>
              <div>
                <p className="text-sm font-bold text-black">Checklist de préparation</p>
                <p className="text-xs text-gray-500">Avant de passer en mode {HORSE_MODE_LABELS[selectedMode!]}</p>
              </div>
            </div>

            {milestoneLoading ? (
              <div className="py-6 text-center text-sm text-gray-400">Vérification…</div>
            ) : (
              <div className="space-y-2">
                {KEY_MILESTONE_TYPES.map((k) => {
                  const done = milestonesCompleted(k.type);
                  return (
                    <div
                      key={k.type}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                        done ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-black">{k.emoji} {k.label}</span>
                        {k.required && !done && (
                          <span className="ml-1.5 text-2xs text-orange font-semibold">Recommandé</span>
                        )}
                      </div>
                      {done && (
                        <span className="text-2xs text-green-600 font-semibold flex-shrink-0">✓ Validé</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!allRequiredDone && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Certaines étapes recommandées ne sont pas encore validées. Vous pouvez tout de même procéder.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(activeMeds.length > 0 ? "meds" : "mode")} className="btn-ghost flex-1 text-sm py-2.5">← Retour</button>
              <button onClick={() => setStep("confirm")} className="btn-primary flex-1 text-sm py-2.5">
                Continuer →
              </button>
            </div>
          </>
        )}

        {/* ── Step confirm — Raison + confirmation ── */}
        {step === "confirm" && selectedMode && (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange/5 border border-orange/20">
              <span className="text-xl">{HORSE_MODE_EMOJIS[selectedMode]}</span>
              <div>
                <p className="text-xs font-bold text-black">{HORSE_MODE_LABELS[selectedMode]}</p>
                <p className="text-2xs text-gray-500">{MODE_DESCRIPTIONS[selectedMode]}</p>
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Raison du changement (optionnel)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Premier concours réussi, prêt pour la compétition"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(isIcrToActive ? "checklist" : activeMeds.length > 0 ? "meds" : "mode")} className="btn-ghost flex-1 text-sm py-2.5">← Retour</button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40"
              >
                {loading ? "Enregistrement…" : "Confirmer le changement"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
