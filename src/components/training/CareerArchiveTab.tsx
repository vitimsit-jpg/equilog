"use client";

/**
 * TRAV-21 — Onglet Carrière pour les chevaux en mode IS (Retraite)
 * Affiche le palmarès, les stats de carrière et permet d'enregistrer la date de retraite.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trophy, Edit3, Check, X } from "lucide-react";
import type { Competition } from "@/lib/supabase/types";
import { DISCIPLINE_LABELS } from "@/lib/utils";

interface Props {
  horseId: string;
  horseName?: string;
}

export default function CareerArchiveTab({ horseId, horseName }: Props) {
  const supabase = createClient();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [dateRetraite, setDateRetraite] = useState<string | null>(null);
  const [carriereArchive, setCarriereArchive] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingDate, setEditingDate] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const [{ data: comps }, { data: horse }] = await Promise.all([
      supabase
        .from("competitions")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: false }),
      supabase
        .from("horses")
        .select("date_retraite, carriere_archive")
        .eq("id", horseId)
        .single(),
    ]);
    setCompetitions((comps as Competition[]) ?? []);
    const dr = (horse as any)?.date_retraite ?? null;
    const ca = (horse as any)?.carriere_archive ?? null;
    setDateRetraite(dr);
    setCarriereArchive(ca);
    setDateInput(dr ?? "");
    setNoteInput((ca as any)?.note ?? "");
    setLoading(false);
  }

  async function saveDateRetraite() {
    const { error } = await supabase
      .from("horses")
      .update({ date_retraite: dateInput || null })
      .eq("id", horseId);
    if (error) { toast.error("Erreur"); return; }
    setDateRetraite(dateInput || null);
    setEditingDate(false);
    toast.success("Date de retraite enregistrée !");
  }

  async function saveNote() {
    const updated = { ...(carriereArchive ?? {}), note: noteInput.trim() || null };
    const { error } = await supabase
      .from("horses")
      .update({ carriere_archive: updated })
      .eq("id", horseId);
    if (error) { toast.error("Erreur"); return; }
    setCarriereArchive(updated);
    setEditingNote(false);
    toast.success("Note de carrière enregistrée !");
  }

  // Stats de carrière
  const totalComps = competitions.length;
  const compWithResult = competitions.filter((c) => c.result_rank && c.total_riders);
  const avgPct = compWithResult.length > 0
    ? compWithResult.reduce((s, c) => s + (1 - (c.result_rank! - 1) / c.total_riders!), 0) / compWithResult.length
    : null;
  const bestResult = compWithResult.length > 0
    ? compWithResult.reduce((best, c) => {
        const pct = 1 - (c.result_rank! - 1) / c.total_riders!;
        const bestPct = 1 - (best.result_rank! - 1) / best.total_riders!;
        return pct > bestPct ? c : best;
      })
    : null;
  const disciplines = Array.from(new Set(competitions.map((c) => c.discipline).filter(Boolean)));

  if (loading) {
    return <div className="card flex items-center justify-center py-12 text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header retraite */}
      <div className="card bg-gray-50 border-gray-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌸</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-700">Carrière de {horseName ?? "ce cheval"}</p>
            <div className="flex items-center gap-2 mt-1">
              {editingDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange"
                  />
                  <button onClick={saveDateRetraite} className="text-green-500 hover:text-green-600"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditingDate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-gray-500">
                    {dateRetraite
                      ? `En retraite depuis le ${new Date(dateRetraite).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                      : "Date de retraite non renseignée"}
                  </p>
                  <button onClick={() => setEditingDate(true)} className="text-gray-400 hover:text-gray-600">
                    <Edit3 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      {totalComps > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <span className="text-2xl font-black text-black">{totalComps}</span>
            <span className="text-2xs text-gray-400">Concours</span>
          </div>
          <div className="stat-card text-center">
            {avgPct !== null ? (
              <>
                <span className="text-2xl font-black text-black">{Math.round(avgPct * 100)}%</span>
                <span className="text-2xs text-gray-400">Moy. classement</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-300">—</span>
                <span className="text-2xs text-gray-400">Moy. classement</span>
              </>
            )}
          </div>
          <div className="stat-card text-center">
            {bestResult ? (
              <>
                <span className="text-2xl font-black text-black">{bestResult.result_rank}<span className="text-sm">/{bestResult.total_riders}</span></span>
                <span className="text-2xs text-gray-400">Meilleur résultat</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-300">—</span>
                <span className="text-2xs text-gray-400">Meilleur résultat</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Disciplines */}
      {disciplines.length > 0 && (
        <div className="card">
          <p className="text-xs font-bold text-black mb-2">Disciplines pratiquées</p>
          <div className="flex flex-wrap gap-1.5">
            {disciplines.map((d) => (
              <span key={d} className="text-xs font-medium px-2.5 py-1 rounded-full bg-beige text-gray-700">
                {DISCIPLINE_LABELS[d as string] ?? d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Note de carrière */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-black">Mot sur la carrière</p>
          {!editingNote && (
            <button onClick={() => setEditingNote(true)} className="text-gray-400 hover:text-gray-600">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={4}
              placeholder={`Racontez la carrière de ${horseName ?? "ce cheval"} en quelques mots…`}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingNote(false)} className="btn-ghost flex-1 text-xs py-2">Annuler</button>
              <button onClick={saveNote} className="btn-primary flex-1 text-xs py-2">Enregistrer</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">
            {(carriereArchive as any)?.note
              ? (carriereArchive as any).note
              : <span className="text-gray-400 italic">Aucune note. Cliquez sur le crayon pour en ajouter une.</span>
            }
          </p>
        )}
      </div>

      {/* Palmarès — derniers résultats */}
      {competitions.length > 0 && (
        <div className="card">
          <p className="text-xs font-bold text-black mb-3">Palmarès</p>
          <div className="space-y-2">
            {competitions.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <Trophy className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-black truncate">{c.event_name}</p>
                  <p className="text-2xs text-gray-400">
                    {new Date(c.date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                    {c.level ? ` · ${c.level}` : ""}
                    {c.discipline ? ` · ${DISCIPLINE_LABELS[c.discipline as string] ?? c.discipline}` : ""}
                  </p>
                </div>
                {c.result_rank && c.total_riders && (
                  <span className="text-xs font-bold text-black flex-shrink-0">
                    {c.result_rank}<span className="text-gray-400 font-normal">/{c.total_riders}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          {competitions.length > 10 && (
            <p className="text-2xs text-gray-400 text-center mt-2">+ {competitions.length - 10} autres concours</p>
          )}
        </div>
      )}

      {totalComps === 0 && (
        <div className="card flex flex-col items-center text-center gap-3 py-10">
          <span className="text-3xl">🌸</span>
          <p className="text-sm font-semibold text-gray-700">Aucun concours enregistré</p>
          <p className="text-xs text-gray-400">Les concours passés apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
