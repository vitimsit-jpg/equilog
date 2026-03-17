"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import type { TrainingType } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import VoiceButton from "./VoiceButton";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const DISCIPLINE_ITEMS: { type: TrainingType; emoji: string; label: string }[] = [
  { type: "cso",           emoji: "🟣", label: "CSO" },
  { type: "dressage",      emoji: "🏆", label: "Dressage" },
  { type: "cross",         emoji: "🟤", label: "CCE" },
  { type: "galop",         emoji: "🚶", label: "Balade" },
  { type: "longe",         emoji: "🌀", label: "Longe" },
  { type: "travail_a_pied",emoji: "🧘", label: "Travail à pied" },
  { type: "marcheur",      emoji: "💪", label: "Prépa physique" },
  { type: "endurance",     emoji: "🏃", label: "Endurance" },
  { type: "autre",         emoji: "⚪", label: "Autre" },
];

const INTENSITY_OPTIONS = [
  { value: 2, label: "Léger",   inactive: "bg-green-50 text-green-600 border-green-200",  active: "bg-green-500 text-white border-green-500" },
  { value: 3, label: "Normal",  inactive: "bg-gray-50 text-gray-600 border-gray-200",     active: "bg-gray-700 text-white border-gray-700" },
  { value: 5, label: "Intense", inactive: "bg-red-50 text-red-600 border-red-200",        active: "bg-red-500 text-white border-red-500" },
];

// Track by index so Tendu (2) and Fatigué (2) are distinct
const FEELING_OPTIONS = [
  { value: 5, emoji: "😄", label: "Très bien" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 3, emoji: "😐", label: "Neutre" },
  { value: 2, emoji: "😕", label: "Tendu" },
  { value: 2, emoji: "😴", label: "Fatigué" },
  { value: 1, emoji: "🤕", label: "Douleur" },
];

const DURATION_PICKS = [20, 30, 45, 60, 90];

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  onSaved: () => void;
}

export default function QuickTrainingModal({ open, onClose, horseId, onSaved }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"quick" | "detail">("quick");
  const [loading, setLoading] = useState(false);

  const [discipline, setDiscipline] = useState<TrainingType | null>(null);
  const [intensityIdx, setIntensityIdx] = useState(1); // default Normal
  const [feelingIdx, setFeelingIdx] = useState(1);     // default Bien
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [notes, setNotes] = useState("");

  const effectiveDuration = showCustom && customDuration ? parseInt(customDuration) || 45 : duration;

  const handleVoiceResult = (data: { type: TrainingType; duration_min: number; intensity: 1|2|3|4|5; feeling: 1|2|3|4|5; notes: string | null }) => {
    if (data.type) setDiscipline(data.type);
    if (data.duration_min) {
      const pick = DURATION_PICKS.indexOf(data.duration_min);
      if (pick >= 0) { setDuration(DURATION_PICKS[pick]); setShowCustom(false); }
      else { setCustomDuration(String(data.duration_min)); setShowCustom(true); }
    }
    if (data.intensity) {
      const idx = INTENSITY_OPTIONS.reduce((best, opt, i) =>
        Math.abs(opt.value - data.intensity) < Math.abs(INTENSITY_OPTIONS[best].value - data.intensity) ? i : best, 0);
      setIntensityIdx(idx);
    }
    if (data.feeling) {
      const idx = FEELING_OPTIONS.findIndex(f => f.value === data.feeling);
      if (idx >= 0) setFeelingIdx(idx);
    }
    if (data.notes) setNotes(data.notes);
  };

  const handleSave = async () => {
    if (!discipline) { toast.error("Sélectionnez une discipline"); return; }
    setLoading(true);
    const { error } = await supabase.from("training_sessions").insert({
      horse_id: horseId,
      date: format(new Date(), "yyyy-MM-dd"),
      type: discipline,
      duration_min: effectiveDuration,
      intensity: INTENSITY_OPTIONS[intensityIdx].value as any,
      feeling: FEELING_OPTIONS[feelingIdx].value as any,
      notes: notes || null,
      objectif: null, lieu: null, coach_present: false,
      equipement_recuperation: null, wearable_source: null,
    });
    if (error) { toast.error("Erreur lors de l'enregistrement"); }
    else {
      toast.success("Séance enregistrée !");
      trackEvent({ event_name: "training_created", event_category: "training", properties: { type: discipline, mode: "quick", duration_min: effectiveDuration } });
      reset(); onSaved();
    }
    setLoading(false);
  };

  const reset = () => {
    setDiscipline(null); setIntensityIdx(1); setFeelingIdx(1);
    setDuration(45); setShowCustom(false); setCustomDuration(""); setNotes("");
  };

  const handleClose = () => { setMode("quick"); reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={mode === "detail" ? "Nouvelle séance — Détails" : "Logger une séance"}>
      {mode === "detail" ? (
        <TrainingForm
          horseId={horseId}
          onSaved={() => { setMode("quick"); reset(); router.refresh(); onSaved(); }}
          onCancel={() => setMode("quick")}
        />
      ) : (
        <div className="space-y-5">

          {/* Voice */}
          <VoiceButton onResult={handleVoiceResult} />

          {/* Discipline */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Discipline</p>
            <div className="grid grid-cols-3 gap-2">
              {DISCIPLINE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setDiscipline(item.type)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all min-h-[64px] ${
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

          {/* Intensity */}
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

          {/* Feeling */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Humeur du cheval</p>
            <div className="grid grid-cols-3 gap-2">
              {FEELING_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFeelingIdx(i)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    feelingIdx === i
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
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

          {/* Notes */}
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
      )}
    </Modal>
  );
}
