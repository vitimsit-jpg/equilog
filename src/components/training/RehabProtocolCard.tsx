"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, CheckCircle, AlertTriangle, Lock, ClipboardList } from "lucide-react";
import type { RehabProtocol, RehabPhase } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { TRAINING_TYPE_LABELS } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

interface Props {
  horseId: string;
  protocol: RehabProtocol | null;
}

export default function RehabProtocolCard({ horseId, protocol }: Props) {
  const router = useRouter();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [injuryDesc, setInjuryDesc] = useState("");
  const [vetNotes, setVetNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showConfirmAdvance, setShowConfirmAdvance] = useState(false);

  const handleGenerate = async () => {
    if (!injuryDesc.trim()) { toast.error("Décrivez la blessure ou condition"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/rehab-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId, injuryDescription: injuryDesc.trim(), vetNotes: vetNotes.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Protocole généré ! Le calendrier a été mis à jour.");
      setShowGenerateModal(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la génération");
    }
    setGenerating(false);
  };

  const handleAdvance = async () => {
    if (!protocol) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/rehab-protocol", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: protocol.id, action: "advance" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Phase ${protocol.current_phase_index + 2} démarrée !`);
      setShowConfirmAdvance(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
    setAdvancing(false);
  };

  const handleComplete = async () => {
    if (!protocol) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/rehab-protocol", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: protocol.id, action: "complete" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Protocole terminé — félicitations !");
      setShowConfirmAdvance(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
    setAdvancing(false);
  };

  if (!protocol) {
    return (
      <>
        <div className="card flex flex-col items-center text-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-black">Aucun protocole de rééducation</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs">
              Générez un protocole personnalisé par l&apos;IA pour guider la récupération de votre cheval.
            </p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"
          >
            <Sparkles className="h-4 w-4" />
            Générer un protocole IA
          </button>
        </div>

        <Modal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Générer un protocole IA">
          <div className="space-y-4">
            <div>
              <label className="label">Blessure / condition *</label>
              <textarea
                value={injuryDesc}
                onChange={(e) => setInjuryDesc(e.target.value)}
                rows={3}
                placeholder="Ex : Tendinite du tendon fléchisseur superficiel antérieur droit, diagnostiquée le XX/XX, échographie réalisée..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
              />
            </div>
            <div>
              <label className="label">Notes vétérinaire <span className="font-normal text-gray-300">(optionnel)</span></label>
              <textarea
                value={vetNotes}
                onChange={(e) => setVetNotes(e.target.value)}
                rows={2}
                placeholder="Prescriptions, restrictions, durée de repos conseillée..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
              />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-amber-700">Ce protocole est généré par IA à titre indicatif. Consultez toujours votre vétérinaire avant de reprendre le travail.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 btn-secondary">Annuler</button>
              <button onClick={handleGenerate} disabled={generating} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                {generating ? "Génération..." : "Générer"}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  const currentPhase: RehabPhase = protocol.phases[protocol.current_phase_index];

  return (
    <div className="space-y-4">
      {/* Header with injury description and status */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-2xs text-gray-400 mb-1">Protocole de rééducation</p>
            <p className="text-xs text-gray-600 leading-relaxed">{protocol.injury_description}</p>
          </div>
          <span className={`text-2xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-3 ${
            protocol.status === "active" ? "bg-red-100 text-red-700" :
            protocol.status === "completed" ? "bg-green-100 text-green-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {protocol.status === "active" ? "Actif" : protocol.status === "completed" ? "Terminé" : "En pause"}
          </span>
        </div>

        {/* Current phase card */}
        <div className="card border-l-4 border-danger">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide">Phase en cours</p>
              <p className="text-sm font-black text-black">{currentPhase.name}</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">
              {protocol.current_phase_index + 1} / {protocol.phases.length}
            </span>
          </div>

          {/* Constraints row */}
          <div className="flex gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-xl">
              <Lock className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Max {currentPhase.max_duration_min}min</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-xl">
              <Lock className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Intensité ≤ {currentPhase.max_intensity}/5</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-xl">
              <span className="text-xs font-semibold text-gray-600">
                {currentPhase.sessions_per_week} séances/sem · {currentPhase.duration_weeks} sem.
              </span>
            </div>
          </div>

          {/* Allowed types */}
          <div className="flex flex-wrap gap-1 mb-3">
            {currentPhase.allowed_types.map((t) => (
              <span key={t} className="text-2xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                {TRAINING_TYPE_LABELS[t] || t}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs text-gray-500 leading-relaxed mb-2">{currentPhase.description}</p>

          {/* Progression criteria */}
          <div className="px-3 py-2 bg-green-50 rounded-xl">
            <p className="text-2xs font-bold text-green-700 mb-0.5">Critères de passage</p>
            <p className="text-2xs text-green-600">{currentPhase.progression_criteria}</p>
          </div>
        </div>

        {/* Phases stepper */}
        <div className="space-y-2 mt-4">
          {protocol.phases.map((phase, i) => {
            const isDone = i < protocol.current_phase_index;
            const isCurrent = i === protocol.current_phase_index;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl ${
                  isCurrent
                    ? "bg-red-50 border border-red-100"
                    : isDone
                    ? "opacity-50"
                    : "bg-gray-50"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isDone ? "bg-success text-white" : isCurrent ? "bg-danger text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {isDone ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isCurrent ? "text-black" : "text-gray-500"}`}>{phase.name}</p>
                  <p className="text-2xs text-gray-400">{phase.duration_weeks} sem · max {phase.max_duration_min}min · intensité ≤ {phase.max_intensity}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          {protocol.status === "active" && protocol.current_phase_index < protocol.phases.length - 1 && (
            !showConfirmAdvance ? (
              <button onClick={() => setShowConfirmAdvance(true)} className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                Avancer à la phase {protocol.current_phase_index + 2}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">Passer à : <strong>{protocol.phases[protocol.current_phase_index + 1].name}</strong></p>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmAdvance(false)} className="flex-1 btn-secondary text-xs py-2">Annuler</button>
                  <button onClick={handleAdvance} disabled={advancing} className="flex-1 btn-primary text-xs py-2">
                    {advancing ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )
          )}
          {protocol.status === "active" && protocol.current_phase_index === protocol.phases.length - 1 && (
            !showConfirmAdvance ? (
              <button
                onClick={() => setShowConfirmAdvance(true)}
                className="w-full text-xs text-success font-semibold px-3 py-2 rounded-xl bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Marquer comme terminé
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">Marquer la rééducation comme terminée ?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmAdvance(false)} className="flex-1 btn-secondary text-xs py-2">Annuler</button>
                  <button onClick={handleComplete} disabled={advancing} className="flex-1 text-xs font-semibold py-2 rounded-xl bg-success text-white">
                    {advancing ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
