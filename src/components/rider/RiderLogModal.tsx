"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { RiderLog } from "@/lib/supabase/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  existingLog?: RiderLog | null;
}

const FORME_OPTIONS = [
  { value: 1, emoji: "😴", label: "Épuisé" },
  { value: 2, emoji: "😕", label: "Fatigué" },
  { value: 3, emoji: "😐", label: "Neutre" },
  { value: 4, emoji: "🙂", label: "En forme" },
  { value: 5, emoji: "🚀", label: "Au top" },
] as const;

const FATIGUE_OPTIONS = [
  { value: "legere", label: "Légère" },
  { value: "moderee", label: "Modérée" },
  { value: "elevee", label: "Élevée" },
] as const;

const MENTAL_OPTIONS = [
  { value: "motiv", label: "Motivé 🔥" },
  { value: "neutre", label: "Neutre" },
  { value: "fatigue", label: "Fatigué" },
  { value: "stresse", label: "Stressé" },
] as const;

const DOULEURS_OPTIONS = ["Dos", "Genoux", "Épaules", "Hanches", "Nuque", "Poignets"];

export default function RiderLogModal({ open, onClose, onSaved, userId, existingLog }: Props) {
  const supabase = createClient();

  const [forme, setForme] = useState<1 | 2 | 3 | 4 | 5 | null>(existingLog?.forme ?? null);
  const [fatigue, setFatigue] = useState<RiderLog["fatigue"]>(existingLog?.fatigue ?? null);
  const [mental, setMental] = useState<RiderLog["mental"]>(existingLog?.mental ?? null);
  const [hasDouleurs, setHasDouleurs] = useState<boolean>((existingLog?.douleurs ?? []).length > 0);
  const [douleurs, setDouleurs] = useState<string[]>(existingLog?.douleurs ?? []);
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const toggleDouleur = (d: string) => {
    setDouleurs((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const btnClass = (selected: boolean) =>
    `px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
      selected
        ? "bg-black text-white border-black"
        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
    }`;

  const handleSave = async () => {
    if (!forme) {
      toast.error("Indiquez votre forme du jour");
      return;
    }
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase
      .from("rider_logs")
      .upsert(
        {
          user_id: userId,
          date: today,
          forme,
          fatigue,
          mental,
          douleurs: hasDouleurs && douleurs.length > 0 ? douleurs : null,
          notes: notes.trim() || null,
        },
        { onConflict: "user_id,date" }
      );

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("État enregistré !");
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col animate-slide-up"
        style={{ maxHeight: "92vh", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        {/* Header */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <span className="font-bold text-black text-base">Mon état du jour 🏇</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
          {/* Forme */}
          <div>
            <p className="label mb-2">Comment vous sentez-vous ?</p>
            <div className="flex gap-2">
              {FORME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForme(forme === opt.value ? null : opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    forme === opt.value
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fatigue */}
          <div>
            <p className="label mb-2">Fatigue physique</p>
            <div className="flex flex-wrap gap-2">
              {FATIGUE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFatigue(fatigue === opt.value ? null : opt.value)}
                  className={btnClass(fatigue === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mental */}
          <div>
            <p className="label mb-2">État mental</p>
            <div className="flex flex-wrap gap-2">
              {MENTAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMental(mental === opt.value ? null : opt.value)}
                  className={btnClass(mental === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Douleurs */}
          <div>
            <p className="label mb-2">Douleurs physiques ?</p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setHasDouleurs(false); setDouleurs([]); }}
                className={btnClass(!hasDouleurs)}
              >
                Non
              </button>
              <button
                type="button"
                onClick={() => setHasDouleurs(true)}
                className={btnClass(hasDouleurs)}
              >
                Oui
              </button>
            </div>
            {hasDouleurs && (
              <div className="flex flex-wrap gap-2">
                {DOULEURS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDouleur(d)}
                    className={btnClass(douleurs.includes(d))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="label mb-2">Notes (optionnel)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remarques libres..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Sauvegarde…" : "Enregistrer mon état"}
          </button>
        </div>
      </div>
    </div>
  );
}
