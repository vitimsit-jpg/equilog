"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { RiderLog } from "@/lib/supabase/types";

interface Props {
  userId: string;
  todayLog: RiderLog | null;
}

const FORME_OPTIONS = [
  { value: "fatigue" as const,  emoji: "😴", label: "Fatigué" },
  { value: "normal" as const,   emoji: "🙂", label: "Normal" },
  { value: "en_forme" as const, emoji: "💪", label: "En forme" },
];

const ZONES = [
  "Lombaires", "Nuque / cervicales", "Épaules", "Milieu du dos",
  "Bassin / sacro-iliaque", "Hanches / adducteurs", "Genoux", "Poignets", "Chevilles", "Autre",
];

const FORME_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  fatigue:  { emoji: "😴", label: "Fatigué",  color: "text-orange" },
  normal:   { emoji: "🙂", label: "Normal",   color: "text-gray-500" },
  en_forme: { emoji: "💪", label: "En forme", color: "text-green-600" },
};

export default function RiderStatusWidget({ userId, todayLog }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [isEditing, setIsEditing] = useState(!todayLog);
  const [forme, setForme] = useState<RiderLog["forme"]>(todayLog?.forme ?? null);
  const [hasDouleur, setHasDouleur] = useState<boolean>((todayLog?.douleurs ?? []).length > 0);
  const [intensite, setIntensite] = useState<RiderLog["douleur_intensite"]>(todayLog?.douleur_intensite ?? null);
  const [zones, setZones] = useState<string[]>(todayLog?.douleurs ?? []);
  const [notes, setNotes] = useState(todayLog?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const toggleZone = (z: string) =>
    setZones((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]);

  const btnClass = (selected: boolean) =>
    `px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
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
      setIsEditing(false);
      router.refresh();
    }
    setSaving(false);
  };

  const formeInfo = forme ? FORME_DISPLAY[forme] : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-black text-sm">Mon état aujourd&apos;hui 🏇</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
          >
            Modifier
          </button>
        )}
      </div>

      {/* ── Vue résumé ─────────────────────────────────────────────── */}
      {!isEditing && todayLog && (
        <div className="flex items-center gap-3 flex-wrap">
          {formeInfo && (
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{formeInfo.emoji}</span>
              <span className={`text-sm font-semibold ${formeInfo.color}`}>{formeInfo.label}</span>
            </div>
          )}
          {hasDouleur || (todayLog.douleurs ?? []).length > 0 ? (
            <span className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-full font-medium">
              {intensite === "importante" ? "Douleur importante" : "Douleur légère"}
              {(todayLog.douleurs ?? []).length > 0 && ` · ${(todayLog.douleurs ?? []).join(", ")}`}
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-gray-50 text-gray-400 rounded-full font-medium">Aucune douleur</span>
          )}
          {todayLog.notes && (
            <p className="text-xs text-gray-400 italic w-full mt-0.5 truncate">&ldquo;{todayLog.notes}&rdquo;</p>
          )}
        </div>
      )}

      {/* ── Formulaire inline ──────────────────────────────────────── */}
      {isEditing && (
        <div className="space-y-4">
          {/* Forme */}
          <div>
            <p className="label mb-2">Forme du jour</p>
            <div className="flex gap-2">
              {FORME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForme(forme === opt.value ? null : opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    forme === opt.value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Douleur */}
          <div>
            <p className="label mb-2">Douleur du jour</p>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => { setHasDouleur(false); setZones([]); setIntensite(null); }} className={btnClass(!hasDouleur)}>
                Aucune douleur
              </button>
              <button type="button" onClick={() => setHasDouleur(true)} className={btnClass(hasDouleur)}>
                J&apos;ai une douleur
              </button>
            </div>
            {hasDouleur && (
              <div className="space-y-3 pt-1">
                <div>
                  <p className="label mb-1.5">Intensité</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIntensite(intensite === "legere" ? null : "legere")} className={btnClass(intensite === "legere")}>Légère</button>
                    <button type="button" onClick={() => setIntensite(intensite === "importante" ? null : "importante")} className={btnClass(intensite === "importante")}>Importante</button>
                  </div>
                </div>
                <div>
                  <p className="label mb-1.5">Zone <span className="text-gray-400 font-normal">(plusieurs possibles)</span></p>
                  <div className="flex flex-wrap gap-1.5">
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
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything à noter sur votre état du jour…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex gap-2">
            {todayLog && (
              <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost flex-shrink-0">
                Annuler
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
