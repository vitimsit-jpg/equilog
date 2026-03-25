"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { changeHorseMode } from "@/lib/changeHorseMode";
import type { HorseIndexMode } from "@/lib/supabase/types";
import { HORSE_MODE_LABELS, HORSE_MODE_EMOJIS } from "@/hooks/useHorseMode";

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

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  currentMode: HorseIndexMode | null;
}

export default function TransitionWizard({ open, onClose, horseId, horseName, currentMode }: Props) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<HorseIndexMode | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

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
    onClose();
    router.refresh();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Changer le mode de vie — ${horseName}`}>
      <div className="space-y-5">
        <p className="text-sm text-gray-500 leading-relaxed">
          Le mode de vie adapte le suivi, les onglets et les recommandations d&apos;Equistra à la situation actuelle de votre cheval.
        </p>

        {/* Mode selector */}
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

        {/* Warning */}
        {selectedMode && MODE_WARNINGS[selectedMode] && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-800 leading-relaxed">{MODE_WARNINGS[selectedMode]}</p>
          </div>
        )}

        {/* Reason (optional) */}
        {selectedMode && (
          <div>
            <label className="label mb-1.5 block">Raison du changement (optionnel)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Blessure au tendon, repos prescrit par le vétérinaire"
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange"
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMode || loading}
            className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40"
          >
            {loading ? "Enregistrement…" : "Confirmer le changement"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
