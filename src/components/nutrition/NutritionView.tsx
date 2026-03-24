"use client";

import { useState } from "react";
import { History, Plus, Edit2 } from "lucide-react";
import type { HorseNutrition, NutritionHistoryEntry, NutritionComplement } from "@/lib/supabase/types";
import NutritionSetup from "./NutritionSetup";

const FIBRE_LABELS: Record<string, string> = { foin: "Foin", luzerne: "Luzerne", melange: "Mélange foin-luzerne" };
const GRANULE_LABELS: Record<string, string> = { standard: "Granulés", floconnes: "Floconnés", extrudes: "Extrudés", mash: "Mash", autre: "" };
const FORME_LABELS: Record<string, string> = { poudre: "Poudre", liquide: "Liquide", granules: "Granulés", seringue: "Seringue", autre: "" };
const FREQ_LABELS: Record<string, string> = { quotidien: "Quotidien", matin_soir: "Matin + Soir", hebdomadaire: "Hebdomadaire", cure: "En cure" };
const HORAIRE_LABELS: Record<string, string> = { matin: "Matin", midi: "Midi", apresmidi: "Après-midi", soir: "Soir" };
const HEURES_LABELS: Record<string, string> = { "2": "2h/jour", "4": "4h/jour", "6": "6h/jour", journee: "Toute la journée" };

function cureBadge(c: NutritionComplement): string | null {
  if (c.frequence !== "cure" || !c.cure_debut || !c.cure_semaines) return null;
  const start = new Date(c.cure_debut);
  const end = new Date(start);
  end.setDate(end.getDate() + c.cure_semaines * 7);
  const now = new Date();
  if (now > end) return "Terminée";
  const daysTotal = c.cure_semaines * 7;
  const daysIn = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `En cure · J+${daysIn} / ${daysTotal}`;
}

interface Props {
  horseId: string;
  horseName: string;
  nutrition: HorseNutrition;
  history: NutritionHistoryEntry[];
}

export default function NutritionView({ horseId, horseName, nutrition, history }: Props) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">Modifier la ration</h2>
        </div>
        <NutritionSetup
          horseId={horseId}
          existingNutrition={nutrition}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-black">Ration de {horseName}</h2>
          <p className="text-xs text-gray-400">
            Mise à jour le {new Date(nutrition.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-400 transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Modifier
        </button>
      </div>

      {/* ── Fibres ── */}
      {nutrition.fibres.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌾</span>
            <h3 className="text-sm font-bold text-black">Fibres</h3>
          </div>
          <div className="space-y-2">
            {nutrition.fibres.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-semibold text-black">{FIBRE_LABELS[f.type] ?? f.type}</span>
                <span className="text-sm text-gray-500">
                  {f.mode === "volonte" ? "À volonté" : `${f.quantite_kg} kg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Herbe ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <h3 className="text-sm font-bold text-black">Herbe / Pâture</h3>
          </div>
          <span className="text-sm text-gray-500">
            {nutrition.herbe.actif
              ? `À volonté · ${HEURES_LABELS[nutrition.herbe.heures ?? ""] ?? ""}`
              : "Non"}
          </span>
        </div>
      </div>

      {/* ── Granulés ── */}
      {nutrition.granules.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥣</span>
            <h3 className="text-sm font-bold text-black">Granulés</h3>
          </div>
          <div className="space-y-3">
            {nutrition.granules.map((g) => (
              <div key={g.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-black">{g.nom || "—"}</span>
                  <span className="text-2xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {GRANULE_LABELS[g.type] || g.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.repas.map((r, idx) => (
                    <span key={idx} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                      {HORAIRE_LABELS[r.horaire]} — {r.quantite_l}L
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Compléments ── */}
      {nutrition.complements.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💊</span>
            <h3 className="text-sm font-bold text-black">Compléments</h3>
          </div>
          <div className="space-y-3">
            {nutrition.complements.map((c) => {
              const badge = cureBadge(c);
              return (
                <div key={c.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{c.nom || "—"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[FORME_LABELS[c.forme], c.quantite ? `${c.quantite} ${c.unite}` : null, FREQ_LABELS[c.frequence]]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {badge && (
                      <span className={`flex-shrink-0 text-2xs font-semibold px-2 py-0.5 rounded-full ${
                        badge === "Terminée"
                          ? "bg-gray-100 text-gray-400"
                          : "bg-orange-light text-orange"
                      }`}>
                        {badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-200 text-xs font-semibold text-gray-400 hover:border-orange hover:text-orange transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un complément
          </button>
        </div>
      )}

      {/* Add complement if none */}
      {nutrition.complements.length === 0 && (
        <button
          onClick={() => setEditing(true)}
          className="w-full card flex items-center justify-center gap-1.5 py-4 text-sm font-semibold text-gray-400 hover:text-orange transition-colors border-dashed"
        >
          <Plus className="h-4 w-4" />
          Ajouter un complément
        </button>
      )}

      {/* ── History ── */}
      <button
        onClick={() => setShowHistory((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique des modifications
        </div>
        <span className="text-xs text-gray-300">{history.length} entrée{history.length !== 1 ? "s" : ""}</span>
      </button>

      {showHistory && (
        <div className="card p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Aucune modification enregistrée</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-black">{entry.element}</span>
                  <span className="text-2xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {entry.old_value && entry.new_value && (
                  <p className="text-xs text-gray-500">
                    <span className="line-through text-red-400">{entry.old_value}</span>
                    {" → "}
                    <span className="text-green-600">{entry.new_value}</span>
                  </p>
                )}
                {entry.reason && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">{entry.reason}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
