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
  { value: "fatigue" as const, emoji: "😴", label: "Fatigué" },
  { value: "normal" as const,  emoji: "😐", label: "Normal" },
  { value: "en_forme" as const, emoji: "💪", label: "En forme" },
];

const ZONES = [
  "Lombaires", "Nuque / cervicales", "Épaules", "Milieu du dos",
  "Bassin / sacro-iliaque", "Hanches / adducteurs", "Genoux", "Poignets", "Chevilles", "Autre",
];

export default function RiderLogModal({ open, onClose, onSaved, userId, existingLog }: Props) {
  const supabase = createClient();

  const [forme, setForme] = useState<RiderLog["forme"]>(existingLog?.forme ?? null);
  const [hasDouleur, setHasDouleur] = useState<boolean>((existingLog?.douleurs ?? []).length > 0);
  const [intensite, setIntensite] = useState<RiderLog["douleur_intensite"]>(existingLog?.douleur_intensite ?? null);
  const [zones, setZones] = useState<string[]>(existingLog?.douleurs ?? []);
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const toggleZone = (z: string) =>
    setZones((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]);

  const btnClass = (selected: boolean) =>
    `px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
      selected ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
    }`;

  const handleSave = async () => {
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("rider_logs").upsert(
      {
        user_id: userId,
        date: today,
        forme,
        douleurs: hasDouleur && zones.length > 0 ? zones : null,
        douleur_intensite: hasDouleur ? intensite : null,
        notes: notes.trim() || null,
      },
      { onConflict: "user_id,date" }
    );
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("État enregistré !");
      onSaved();
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
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <span className="font-bold text-black text-base">Mon état du jour 🏇</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
          {/* Forme */}
          <div>
            <p className="label mb-2">Forme du jour</p>
            <div className="flex gap-2">
              {FORME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForme(forme === opt.value ? null : opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    forme === opt.value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Douleur */}
          <div>
            <p className="label mb-2">Douleur du jour</p>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => { setHasDouleur(false); setZones([]); setIntensite(null); }} className={btnClass(!hasDouleur)}>
                Aucune douleur
              </button>
              <button type="button" onClick={() => setHasDouleur(true)} className={btnClass(hasDouleur)}>
                J&apos;ai une douleur
              </button>
            </div>
            {hasDouleur && (
              <div className="space-y-3">
                <div>
                  <p className="label mb-2">Intensité</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIntensite(intensite === "legere" ? null : "legere")} className={btnClass(intensite === "legere")}>Légère</button>
                    <button type="button" onClick={() => setIntensite(intensite === "importante" ? null : "importante")} className={btnClass(intensite === "importante")}>Importante</button>
                  </div>
                </div>
                <div>
                  <p className="label mb-2">Zone <span className="text-gray-400 font-normal">(plusieurs possibles)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {ZONES.map((z) => (
                      <button key={z} type="button" onClick={() => toggleZone(z)} className={btnClass(zones.includes(z))}>
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <p className="label mb-2">Note libre <span className="text-gray-400 font-normal">(optionnel)</span></p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything à noter sur votre état du jour…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        <div className="px-5 pt-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? "Sauvegarde…" : "Enregistrer mon état"}
          </button>
        </div>
      </div>
    </div>
  );
}
