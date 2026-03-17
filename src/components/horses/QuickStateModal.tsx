"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const ETAT_OPTIONS = [
  { value: "excellent", emoji: "😄", label: "Excellent" },
  { value: "bien",      emoji: "🙂", label: "Bien" },
  { value: "normal",    emoji: "😐", label: "Normal" },
  { value: "tendu",     emoji: "😕", label: "Tendu / Stressé" },
  { value: "fatigue",   emoji: "😴", label: "Fatigué" },
  { value: "douloureux",emoji: "🤕", label: "Semble douloureux" },
];

const APPETIT_OPTIONS = [
  { value: "mange_bien",    emoji: "🟢", label: "Mange bien" },
  { value: "mange_peu",     emoji: "🟡", label: "Mange peu" },
  { value: "na_pas_mange",  emoji: "🔴", label: "N'a pas mangé" },
];

const OBSERVATIONS = [
  "Boiterie légère", "Boiterie marquée", "Gonflement",
  "Coupure / Plaie", "Sueur excessive", "Toux",
  "Colique légère", "Poids en baisse",
];

const NEGATIVE_OBS = ["Boiterie légère", "Boiterie marquée", "Gonflement", "Coupure / Plaie", "Colique légère"];

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  onSaved: () => void;
}

export default function QuickStateModal({ open, onClose, horseId, horseName, onSaved }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [etat, setEtat] = useState<string | null>(null);
  const [appetit, setAppetit] = useState<string | null>(null);
  const [observations, setObservations] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggleObs = (obs: string) =>
    setObservations((prev) => prev.includes(obs) ? prev.filter((o) => o !== obs) : [...prev, obs]);

  const hasNegativeObs = observations.some((o) => NEGATIVE_OBS.includes(o));
  const hasColique = observations.includes("Colique légère");

  const handleSave = async () => {
    if (!etat) { toast.error("Sélectionnez l'état général"); return; }
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("horse_daily_logs").upsert(
      {
        horse_id: horseId,
        date: today,
        etat_general: etat,
        appetit: appetit || null,
        observations: observations.length > 0 ? observations : null,
        notes: notes || null,
      },
      { onConflict: "horse_id,date" }
    );
    if (error) { toast.error("Erreur lors de l'enregistrement"); }
    else { toast.success("État enregistré !"); reset(); onSaved(); }
    setLoading(false);
  };

  const reset = () => {
    setEtat(null); setAppetit(null); setObservations([]); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={`État de ${horseName}`}>
      <div className="space-y-5">

        {/* État général */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">État général</p>
          <div className="grid grid-cols-3 gap-2">
            {ETAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEtat(opt.value)}
                className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                  etat === opt.value
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-center leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Appétit */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Appétit</p>
          <div className="grid grid-cols-3 gap-2">
            {APPETIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAppetit(appetit === opt.value ? null : opt.value)}
                className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                  appetit === opt.value
                    ? "border-orange bg-orange-light text-orange"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-center leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Observations */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Observations <span className="font-normal normal-case text-gray-300">(optionnel)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {OBSERVATIONS.map((obs) => (
              <button
                key={obs}
                type="button"
                onClick={() => toggleObs(obs)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  observations.includes(obs)
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {obs}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {hasColique && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="text-xs text-red-700 font-semibold">
              Colique signalée — Contactez immédiatement votre vétérinaire.
            </p>
          </div>
        )}
        {hasNegativeObs && !hasColique && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-orange-light border border-orange/20">
            <span className="text-sm flex-shrink-0">💡</span>
            <p className="text-xs text-orange font-medium">
              Observation signalée — Pensez à ajouter un soin dans le carnet de santé.
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
            Note <span className="font-normal normal-case text-gray-300">(optionnel)</span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations supplémentaires..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Annuler</Button>
          <Button type="button" loading={loading} onClick={handleSave} className="flex-1">Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}
