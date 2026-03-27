"use client";

import { useState, useEffect, useRef } from "react";
import { History, Plus, Edit2, ChevronRight, ChevronDown } from "lucide-react";

const NUTRITION_CONSENT_KEY = "equistra_nutrition_consent_v1";
import type { HorseNutrition, NutritionHistoryEntry, NutritionComplement } from "@/lib/supabase/types";
import NutritionSetup from "./NutritionSetup";

const FIBRE_LABELS: Record<string, string> = { foin: "Foin", luzerne: "Luzerne", melange: "Mélange foin-luzerne" };
const GRANULE_LABELS: Record<string, string> = { standard: "Granulés", floconnes: "Floconnés", extrudes: "Extrudés", mash: "Mash", autre: "" };
const FORME_LABELS: Record<string, string> = { poudre: "Poudre", liquide: "Liquide", granules: "Granulés", seringue: "Seringue", autre: "" };
const FREQ_LABELS: Record<string, string> = { quotidien: "Quotidien", matin_soir: "Matin + Soir", hebdomadaire: "Hebdomadaire", cure: "En cure" };
const HORAIRE_LABELS: Record<string, string> = { matin: "Matin", midi: "Midi", apresmidi: "Après-midi", soir: "Soir" };
const MOMENT_LABELS: Record<string, string> = { avant_repas: "Avant repas", pendant_repas: "Pendant repas", apres_repas: "Après repas", independant: "Indépendant" };
const DISTRIB_LABELS: Record<string, string> = { "1": "1× par jour", "2": "2× par jour", "3": "3× par jour" };

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

// Profile-adapted nutrition context per mode
const MODE_NUTRITION_CONTEXT: Partial<Record<string, { emoji: string; text: string; color: string }>> = {
  IC:  { emoji: "🏆", text: "Compétition — besoins énergétiques élevés. Privilégiez les fibres de qualité et ajustez les concentrés avant et après les sorties.", color: "bg-orange/5 border-orange/20 text-orange-800" },
  IE:  { emoji: "🌿", text: "Loisir — alimentation équilibrée. Foin à volonté conseillé ; limitez les concentrés si l'activité reste légère.", color: "bg-blue-50 border-blue-100 text-blue-800" },
  IP:  { emoji: "🔄", text: "Reprise progressive — réduisez les concentrés, maintenez les fibres. Évitez la suralimentation en phase de récupération.", color: "bg-gray-50 border-gray-200 text-gray-700" },
  IR:  { emoji: "💊", text: "Convalescence — limitez les concentrés, renforcez les fibres. Consultez votre vétérinaire pour adapter la ration au traitement en cours.", color: "bg-amber-50 border-amber-200 text-amber-800" },
  IS:  { emoji: "🌾", text: "Retraite — alimentation légère, riche en fibres, pauvre en sucres. Surveillez le poids et le score corporel régulièrement.", color: "bg-green-50 border-green-100 text-green-800" },
  ICr: { emoji: "🐣", text: "Croissance — besoins protéiques importants pour le développement. Consultez votre vétérinaire pour adapter la ration à l'âge du poulain.", color: "bg-purple-50 border-purple-100 text-purple-800" },
};

const CONDITIONS_VIE_CONTEXT: Record<string, string> = {
  box:          "En box : hydratation surveillée, distribuez le foin en plusieurs fois.",
  pré:          "En pré : herbe fraîche disponible — adaptez les concentrés selon la saison.",
  paddock:      "En paddock : alimentation standard, surveiller les apports en herbe.",
  box_paddock:  "Box + paddock : équilibre herbe/foin à ajuster selon la saison.",
};

interface Props {
  horseId: string;
  horseName: string;
  nutrition: HorseNutrition;
  history: NutritionHistoryEntry[];
  horseMode?: string | null;
  conditionsVie?: string | null;
}

export default function NutritionView({ horseId, horseName, nutrition, history, horseMode, conditionsVie }: Props) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const migrationToastShown = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem(NUTRITION_CONSENT_KEY)) {
      setShowConsent(true);
    }
  }, []);

  // §1 — Migration notice: fibres saved with quantite_kg (old format) → ask user to update
  useEffect(() => {
    if (migrationToastShown.current) return;
    const hasOldFormat = nutrition.fibres.some((f) => f.quantite_kg && f.quantite_kg > 0 && !f.distributions_par_jour);
    if (hasOldFormat) {
      migrationToastShown.current = true;
      import("react-hot-toast").then(({ default: toast }) => {
        toast("Vos rations de fibres ont été simplifiées — vérifiez le nombre de distributions.", { icon: "🌾", duration: 5000 });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="space-y-4 pb-24">
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

      {/* ── Contexte profil ── */}
      {(() => {
        const modeCtx = horseMode ? MODE_NUTRITION_CONTEXT[horseMode] : null;
        const condCtx = conditionsVie ? CONDITIONS_VIE_CONTEXT[conditionsVie] : null;
        if (!modeCtx && !condCtx) return null;
        return (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${modeCtx?.color ?? "bg-gray-50 border-gray-200 text-gray-700"}`}>
            <span className="text-lg flex-shrink-0">{modeCtx?.emoji ?? "💡"}</span>
            <div className="space-y-0.5">
              {modeCtx && <p className="text-xs leading-relaxed">{modeCtx.text}</p>}
              {condCtx && <p className="text-2xs opacity-80 mt-0.5">{condCtx}</p>}
            </div>
          </div>
        );
      })()}

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
                  {f.mode === "volonte"
                    ? "À volonté"
                    : f.distributions_par_jour
                    ? DISTRIB_LABELS[f.distributions_par_jour]
                    : f.quantite_kg
                    ? `${f.quantite_kg} kg`
                    : "—"}
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
            {nutrition.herbe.actif ? "Oui" : "Non"}
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
                        {[FORME_LABELS[c.forme], c.quantite ? `${c.quantite} ${c.unite}` : null, FREQ_LABELS[c.frequence], c.moment_prise ? MOMENT_LABELS[c.moment_prise] : null]
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-300">{history.length} entrée{history.length !== 1 ? "s" : ""}</span>
          {showHistory ? <ChevronDown className="h-3.5 w-3.5 text-gray-300" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
        </div>
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

      {/* RGPD #43 — Consent modal, first activation */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-light flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🥕</span>
              </div>
              <div>
                <p className="font-bold text-black text-sm">Module Nutrition</p>
                <p className="text-2xs text-gray-400">Traitement de données alimentaires</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le module Nutrition enregistre la ration quotidienne, les compléments et l&apos;historique alimentaire de votre cheval.
              Ces données sont stockées de manière sécurisée et ne sont jamais partagées sans votre consentement.
            </p>
            <p className="text-2xs text-gray-400 leading-relaxed">
              Conformément au RGPD (Art. 6.1.a), vous consentez au traitement de ces données.
              Vous pouvez révoquer ce consentement à tout moment depuis vos réglages.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConsent(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
              >
                Plus tard
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(NUTRITION_CONSENT_KEY, new Date().toISOString());
                  setShowConsent(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                J&apos;accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
