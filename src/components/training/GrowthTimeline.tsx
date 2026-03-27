"use client";

/**
 * TRAV-20 — Composant standalone : timeline des jalons de croissance / éducation poulain
 * Peut être utilisé dans EducationTab ou dans tout autre contexte (fiche cheval, résumé…)
 */

import { Milestone, Trash2 } from "lucide-react";
import type { HorseGrowthMilestone, GrowthMilestoneType } from "@/lib/supabase/types";

const MILESTONE_OPTIONS: { type: GrowthMilestoneType; emoji: string; label: string }[] = [
  { type: "identification",       label: "Identification (puce)",   emoji: "🔖" },
  { type: "sevrage",              label: "Sevrage",                 emoji: "🍼" },
  { type: "vermifugation",        label: "Premier vermifuge",       emoji: "🌿" },
  { type: "vaccination_complete", label: "Vaccination complète",    emoji: "💉" },
  { type: "debut_debourrage",     label: "Début du débourrage",     emoji: "🎓" },
  { type: "premiere_monte",       label: "Première monte",          emoji: "🐴" },
  { type: "premier_concours",     label: "Premier concours",        emoji: "🏅" },
  { type: "autre",                label: "Autre étape",             emoji: "📋" },
];

interface Props {
  milestones: HorseGrowthMilestone[];
  birthYear?: number | null;
  horseName?: string;
  initializing?: boolean;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  onInitialize?: () => void;
}

export default function GrowthTimeline({
  milestones,
  birthYear,
  horseName,
  initializing = false,
  onDelete,
  onAdd,
  onInitialize,
}: Props) {
  if (milestones.length === 0) {
    return (
      <div className="card flex flex-col items-center text-center gap-4 py-8 px-4">
        <span className="text-3xl">🌱</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">Aucune étape enregistrée</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Initialisez le programme type avec les 11 jalons clés du développement d&apos;un poulain
            {birthYear ? ` (estimés à partir de ${birthYear})` : ""}.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {onInitialize && (
            <button
              onClick={onInitialize}
              disabled={initializing}
              className="btn-primary text-xs px-4 py-2.5 flex items-center justify-center gap-1.5"
            >
              <Milestone className="h-3.5 w-3.5" />
              {initializing ? "Création…" : "Créer le programme type (11 jalons)"}
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Ajouter une étape manuellement
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {milestones.map((m, i) => {
        const opt = MILESTONE_OPTIONS.find((o) => o.type === m.milestone_type);
        const isPast = new Date(m.date) <= new Date();
        return (
          <div key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                isPast ? "bg-green-100" : "bg-gray-100"
              }`}>
                {opt?.emoji ?? "📋"}
              </div>
              {i < milestones.length - 1 && (
                <div className={`w-0.5 h-6 my-1 ${isPast ? "bg-green-100" : "bg-gray-100"}`} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-semibold ${isPast ? "text-black" : "text-gray-500"}`}>
                    {m.label ?? opt?.label ?? m.milestone_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {isPast && <span className="ml-1.5 text-green-600 font-medium">✓</span>}
                  </p>
                  {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(m.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
