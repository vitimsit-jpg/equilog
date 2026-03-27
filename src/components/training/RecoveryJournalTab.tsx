"use client";

/**
 * TRAV P1 — Journal d'évolution IR
 * Suivi quotidien douleur / mobilité / observations pendant la convalescence.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { HorseRecoveryEntry } from "@/lib/supabase/types";

interface Props {
  horseId: string;
  horseName?: string;
}

const PAIN_LABELS: Record<number, string> = { 1: "Aucune", 2: "Légère", 3: "Modérée", 4: "Importante", 5: "Intense" };
const PAIN_COLORS: Record<number, string> = { 1: "bg-green-500", 2: "bg-green-400", 3: "bg-yellow-400", 4: "bg-orange-500", 5: "bg-red-500" };
const PAIN_BG: Record<number, string>    = { 1: "bg-green-50 text-green-700", 2: "bg-green-50 text-green-700", 3: "bg-yellow-50 text-yellow-700", 4: "bg-orange-50 text-orange-700", 5: "bg-red-50 text-red-700" };
const MOB_LABELS: Record<number, string>  = { 1: "Très limitée", 2: "Limitée", 3: "Partielle", 4: "Bonne", 5: "Normale" };
const MOB_COLORS: Record<number, string>  = { 1: "bg-red-500", 2: "bg-orange-500", 3: "bg-yellow-400", 4: "bg-green-400", 5: "bg-green-500" };

function ScalePicker({
  value, onChange, colors,
}: { value: number | null; onChange: (v: number) => void; colors: Record<number, string> }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 h-7 rounded-lg border-2 text-xs font-bold transition-all ${
            value === n
              ? `${colors[n]} text-white border-transparent`
              : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function TrendBadge({ entries }: { entries: HorseRecoveryEntry[] }) {
  if (entries.length < 2) return null;
  const recent = entries.slice(0, 3).filter((e) => e.pain_level !== null);
  if (recent.length < 2) return null;
  const first = recent[recent.length - 1].pain_level!;
  const last  = recent[0].pain_level!;
  if (last < first) return <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">↘ Amélioration</span>;
  if (last > first) return <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">↗ Aggravation</span>;
  return <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">→ Stable</span>;
}

export default function RecoveryJournalTab({ horseId, horseName }: Props) {
  const supabase = createClient();
  const [entries, setEntries] = useState<HorseRecoveryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fDate, setFDate]             = useState(format(new Date(), "yyyy-MM-dd"));
  const [fObservation, setFObservation] = useState("");
  const [fPain, setFPain]             = useState<number | null>(null);
  const [fMobility, setFMobility]     = useState<number | null>(null);
  const [fVetValidated, setFVetValidated] = useState(false);
  const [fNotes, setFNotes]           = useState("");

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase
      .from("horse_recovery_journal")
      .select("*")
      .eq("horse_id", horseId)
      .order("date", { ascending: false });
    setEntries((data as HorseRecoveryEntry[]) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setFDate(format(new Date(), "yyyy-MM-dd"));
    setFObservation("");
    setFPain(null);
    setFMobility(null);
    setFVetValidated(false);
    setFNotes("");
    setShowForm(false);
  }

  async function save() {
    if (!fObservation.trim() && fPain === null && fMobility === null) {
      toast.error("Ajoutez au moins une observation ou un niveau de douleur");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("horse_recovery_journal").insert({
      horse_id: horseId,
      user_id: user.id,
      date: fDate,
      observation: fObservation.trim() || null,
      pain_level: fPain,
      mobility_level: fMobility,
      vet_validated: fVetValidated,
      notes: fNotes.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'enregistrement"); setSaving(false); return; }
    toast.success("Entrée ajoutée au journal !");
    resetForm();
    load();
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await supabase.from("horse_recovery_journal").delete().eq("id", id);
    load();
  }

  // Quick stats
  const latest = entries[0];
  const latestPain     = latest?.pain_level ?? null;
  const latestMobility = latest?.mobility_level ?? null;

  if (loading) {
    return <div className="card flex items-center justify-center py-12 text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            {latestPain !== null ? (
              <>
                <span className={`text-2xl font-black`} style={{ color: ["#22c55e","#4ade80","#facc15","#f97316","#ef4444"][latestPain - 1] }}>{latestPain}/5</span>
                <span className="text-2xs text-gray-400">Douleur (J-0)</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-300">—</span>
                <span className="text-2xs text-gray-400">Douleur</span>
              </>
            )}
          </div>
          <div className="stat-card text-center">
            {latestMobility !== null ? (
              <>
                <span className={`text-2xl font-black`} style={{ color: ["#ef4444","#f97316","#facc15","#4ade80","#22c55e"][latestMobility - 1] }}>{latestMobility}/5</span>
                <span className="text-2xs text-gray-400">Mobilité (J-0)</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-300">—</span>
                <span className="text-2xs text-gray-400">Mobilité</span>
              </>
            )}
          </div>
          <div className="stat-card text-center flex flex-col items-center justify-center">
            <TrendBadge entries={entries} />
            {entries.length < 2 && <span className="text-2xs text-gray-400">Tendance</span>}
          </div>
        </div>
      )}

      {/* Bouton ajout */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-orange hover:text-orange transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nouvelle entrée journal
      </button>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-black">Nouvelle entrée</p>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Date</label>
              <input
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fVetValidated}
                  onChange={(e) => setFVetValidated(e.target.checked)}
                  className="rounded text-orange"
                />
                <span className="text-xs font-medium text-gray-600">Validé vétérinaire</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Niveau de douleur (1 = aucune, 5 = intense)</label>
            <ScalePicker value={fPain} onChange={setFPain} colors={PAIN_COLORS} />
            {fPain && <p className="text-2xs text-gray-400 mt-1">{PAIN_LABELS[fPain]}</p>}
          </div>

          <div>
            <label className="label mb-1.5 block">Mobilité (1 = très limitée, 5 = normale)</label>
            <ScalePicker value={fMobility} onChange={setFMobility} colors={MOB_COLORS} />
            {fMobility && <p className="text-2xs text-gray-400 mt-1">{MOB_LABELS[fMobility]}</p>}
          </div>

          <div>
            <label className="label mb-1 block">Observation</label>
            <textarea
              value={fObservation}
              onChange={(e) => setFObservation(e.target.value)}
              rows={3}
              placeholder="Décrivez l'évolution, les comportements observés, la réponse au traitement…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange"
            />
          </div>

          <div>
            <label className="label mb-1 block">Notes internes (optionnel)</label>
            <textarea
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              rows={2}
              placeholder="Médicaments donnés, suite du protocole…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={resetForm} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Timeline des entrées */}
      {entries.length === 0 && !showForm ? (
        <div className="card flex flex-col items-center text-center gap-3 py-10">
          <span className="text-3xl">📋</span>
          <p className="text-sm font-semibold text-gray-700">Aucune entrée pour l&apos;instant</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Notez régulièrement l&apos;évolution de {horseName ?? "votre cheval"} pour suivre sa progression pendant la rééducation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="card relative">
              {/* Date + vet badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black">
                    {new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  {entry.vet_validated && (
                    <span className="flex items-center gap-1 text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Vét. validé
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Scores */}
              {(entry.pain_level !== null || entry.mobility_level !== null) && (
                <div className="flex gap-3 mb-3">
                  {entry.pain_level !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs text-gray-400">Douleur</span>
                      <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${PAIN_BG[entry.pain_level]}`}>
                        {entry.pain_level}/5 — {PAIN_LABELS[entry.pain_level]}
                      </span>
                    </div>
                  )}
                  {entry.mobility_level !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs text-gray-400">Mobilité</span>
                      <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${
                        entry.mobility_level >= 4 ? "bg-green-50 text-green-700" :
                        entry.mobility_level >= 3 ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {entry.mobility_level}/5 — {MOB_LABELS[entry.mobility_level]}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Observation */}
              {entry.observation && (
                <p className="text-sm text-gray-700 leading-relaxed">{entry.observation}</p>
              )}

              {/* Notes internes */}
              {entry.notes && (
                <p className="text-xs text-gray-400 italic mt-1.5 border-t border-gray-50 pt-1.5">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
