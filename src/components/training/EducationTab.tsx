"use client";

/**
 * TRAV-20 — Onglet Éducation pour les chevaux en mode ICr (Croissance/Poulain)
 * Timeline des étapes clés + journal des mesures de développement
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Ruler, Trash2 } from "lucide-react";
import type { HorseGrowthMilestone, HorseGrowthMeasure, GrowthMilestoneType } from "@/lib/supabase/types";
import FirstRideButton from "@/components/horse/FirstRideButton";
import GrowthTimeline from "./GrowthTimeline";

const MILESTONE_ADD_OPTIONS: { type: GrowthMilestoneType; label: string; emoji: string }[] = [
  { type: "identification",       label: "Identification (puce)",   emoji: "🔖" },
  { type: "sevrage",              label: "Sevrage",                 emoji: "🍼" },
  { type: "vermifugation",        label: "Premier vermifuge",       emoji: "🌿" },
  { type: "vaccination_complete", label: "Vaccination complète",    emoji: "💉" },
  { type: "debut_debourrage",     label: "Début du débourrage",     emoji: "🎓" },
  { type: "premiere_monte",       label: "Première monte",          emoji: "🐴" },
  { type: "premier_concours",     label: "Premier concours",        emoji: "🏅" },
  { type: "autre",                label: "Autre étape",             emoji: "📋" },
];

// Programme type ICr — 11 jalons calculés depuis l'année de naissance (TRAV-20)
function getDefaultMilestones(birthYear: number | null): { milestone_type: GrowthMilestoneType; label: string; date: string }[] {
  const base = birthYear ? new Date(`${birthYear}-01-01`) : new Date();
  const add = (months: number) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  };
  return [
    { milestone_type: "identification",       label: "Identification SIRE",         date: add(1)  },
    { milestone_type: "vermifugation",        label: "Premier vermifuge (3 mois)",  date: add(3)  },
    { milestone_type: "vaccination_complete", label: "Primo-vaccination",           date: add(4)  },
    { milestone_type: "sevrage",              label: "Sevrage (6 mois)",            date: add(6)  },
    { milestone_type: "vaccination_complete", label: "Rappel vaccin 1 an",         date: add(13) },
    { milestone_type: "vermifugation",        label: "Vermifuge 12 mois",           date: add(12) },
    { milestone_type: "autre",                label: "Bilan de développement 1 an", date: add(12) },
    { milestone_type: "autre",                label: "Bilan de développement 2 ans",date: add(24) },
    { milestone_type: "debut_debourrage",     label: "Début travail à pied (2 ans)",date: add(24) },
    { milestone_type: "debut_debourrage",     label: "Début débourrage (3 ans)",    date: add(36) },
    { milestone_type: "premiere_monte",       label: "Première monte (3,5 ans)",    date: add(42) },
  ];
}

interface Props {
  horseId: string;
  horseName?: string;
  birthYear?: number | null;
}

export default function EducationTab({ horseId, horseName, birthYear }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [milestones, setMilestones] = useState<HorseGrowthMilestone[]>([]);
  const [measures, setMeasures] = useState<HorseGrowthMeasure[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "mesures">("timeline");
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddMeasure, setShowAddMeasure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Add milestone form
  const [mType, setMType] = useState<GrowthMilestoneType>("sevrage");
  const [mLabel, setMLabel] = useState("");
  const [mDate, setMDate] = useState("");
  const [mNotes, setMNotes] = useState("");

  // Add measure form
  const [mesDate, setMesDate] = useState(new Date().toISOString().split("T")[0]);
  const [mesTaille, setMesTaille] = useState("");
  const [mesPoids, setMesPoids] = useState("");
  const [mesPoitrine, setMesPoitrine] = useState("");
  const [mesNotes, setMesNotes] = useState("");

  useEffect(() => {
    load();
  }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const [{ data: ms }, { data: meas }] = await Promise.all([
      supabase
        .from("horse_growth_milestones")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: true }),
      supabase
        .from("horse_growth_measures")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: true }),
    ]);
    setMilestones((ms as HorseGrowthMilestone[]) ?? []);
    setMeasures((meas as HorseGrowthMeasure[]) ?? []);
    setLoading(false);
  }

  async function addMilestone() {
    if (!mDate) { toast.error("La date est requise"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const option = MILESTONE_ADD_OPTIONS.find((o) => o.type === mType);
    const { error } = await supabase.from("horse_growth_milestones").insert({
      horse_id: horseId,
      user_id: user.id,
      milestone_type: mType,
      label: mLabel.trim() || option?.label || null,
      date: mDate,
      notes: mNotes.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Étape ajoutée !");
    setShowAddMilestone(false);
    setMType("sevrage"); setMLabel(""); setMDate(""); setMNotes("");
    load();
    router.refresh();
  }

  async function addMeasure() {
    if (!mesDate) { toast.error("La date est requise"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_growth_measures").insert({
      horse_id: horseId,
      user_id: user.id,
      date: mesDate,
      taille_cm: mesTaille ? parseFloat(mesTaille) : null,
      poids_kg: mesPoids ? parseFloat(mesPoids) : null,
      tour_poitrine_cm: mesPoitrine ? parseFloat(mesPoitrine) : null,
      notes: mesNotes.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Mesure enregistrée !");
    setShowAddMeasure(false);
    setMesDate(new Date().toISOString().split("T")[0]); setMesTaille(""); setMesPoids(""); setMesPoitrine(""); setMesNotes("");
    load();
  }

  async function deleteMilestone(id: string) {
    if (!confirm("Supprimer cet étape ?")) return;
    const { error } = await supabase.from("horse_growth_milestones").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else load();
  }

  async function deleteMeasure(id: string) {
    if (!confirm("Supprimer cette mesure ?")) return;
    const { error } = await supabase.from("horse_growth_measures").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else load();
  }

  async function initializeMilestones() {
    setInitializing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInitializing(false); return; }
    const defaults = getDefaultMilestones(birthYear ?? null);
    const rows = defaults.map((m) => ({
      horse_id: horseId,
      user_id: user.id,
      milestone_type: m.milestone_type,
      label: m.label,
      date: m.date,
      notes: null,
    }));
    const { error } = await supabase.from("horse_growth_milestones").insert(rows);
    if (error) toast.error("Erreur lors de l'initialisation");
    else toast.success("11 jalons créés — ajustez les dates selon votre poulain !");
    setInitializing(false);
    load();
  }

  const ageLabel = birthYear
    ? (() => {
        const months = (new Date().getFullYear() - birthYear) * 12;
        return months < 24
          ? `${months} mois`
          : `${Math.floor(months / 12)} ans`;
      })()
    : null;

  if (loading) {
    return <div className="card flex items-center justify-center py-12 text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card bg-green-50 border-green-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌱</span>
          <div>
            <p className="text-sm font-bold text-green-800">Suivi croissance & éducation</p>
            <p className="text-xs text-green-600 mt-0.5">
              {horseName ?? "Ce cheval"} est en phase de développement
              {ageLabel ? ` · ${ageLabel}` : ""}.
              Enregistrez les étapes clés et suivez sa croissance.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${activeTab === "timeline" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab("mesures")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${activeTab === "mesures" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            Mesures
          </button>
        </div>
        <button
          onClick={() => activeTab === "timeline" ? setShowAddMilestone(true) : setShowAddMeasure(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {activeTab === "timeline" ? "Ajouter une étape" : "Ajouter une mesure"}
        </button>
      </div>

      {/* Timeline */}
      {activeTab === "timeline" && (
        <GrowthTimeline
          milestones={milestones}
          birthYear={birthYear}
          horseName={horseName}
          initializing={initializing}
          onDelete={deleteMilestone}
          onAdd={() => setShowAddMilestone(true)}
          onInitialize={initializeMilestones}
        />
      )}

      {/* P2 — Bouton première monte (affiché dans l'onglet timeline) */}
      {activeTab === "timeline" && (
        <FirstRideButton horseId={horseId} horseName={horseName} />
      )}

      {/* Mesures */}
      {activeTab === "mesures" && (
        <div>
          {measures.length === 0 ? (
            <div className="card flex flex-col items-center text-center gap-3 py-10">
              <span className="text-3xl">📏</span>
              <p className="text-sm font-semibold text-gray-700">Aucune mesure enregistrée</p>
              <p className="text-xs text-gray-400">Enregistrez la taille, le poids et le tour de poitrine pour suivre la croissance.</p>
              <button
                onClick={() => setShowAddMeasure(true)}
                className="btn-primary text-xs px-4 py-2 mt-1"
              >
                Ajouter une mesure
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...measures].reverse().map((m) => (
                <div key={m.id} className="card flex items-center gap-3">
                  <Ruler className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">
                      {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {m.taille_cm && (
                        <span className="text-xs font-semibold text-black">{m.taille_cm} cm</span>
                      )}
                      {m.poids_kg && (
                        <span className="text-xs font-semibold text-black">{m.poids_kg} kg</span>
                      )}
                      {m.tour_poitrine_cm && (
                        <span className="text-xs text-gray-500">Tour : {m.tour_poitrine_cm} cm</span>
                      )}
                    </div>
                    {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteMeasure(m.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add milestone modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-black">Ajouter une étape</h3>

            <div>
              <label className="label mb-1.5 block">Type d&apos;étape</label>
              <div className="grid grid-cols-2 gap-2">
                {MILESTONE_ADD_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setMType(opt.type)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                      mType === opt.type
                        ? "border-orange bg-orange/5 font-semibold"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {mType === "autre" && (
              <div>
                <label className="label mb-1.5 block">Libellé</label>
                <input
                  value={mLabel}
                  onChange={(e) => setMLabel(e.target.value)}
                  placeholder="Nom de l'étape"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            )}

            <div>
              <label className="label mb-1.5 block">Date</label>
              <input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Notes (optionnel)</label>
              <textarea
                value={mNotes}
                onChange={(e) => setMNotes(e.target.value)}
                rows={2}
                placeholder="Observations, praticien, suite…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddMilestone(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addMilestone} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add measure modal */}
      {showAddMeasure && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-black">Ajouter une mesure</h3>

            <div>
              <label className="label mb-1.5 block">Date</label>
              <input
                type="date"
                value={mesDate}
                onChange={(e) => setMesDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label mb-1.5 block">Taille (cm)</label>
                <input
                  type="number"
                  value={mesTaille}
                  onChange={(e) => setMesTaille(e.target.value)}
                  placeholder="ex: 120"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Poids (kg)</label>
                <input
                  type="number"
                  value={mesPoids}
                  onChange={(e) => setMesPoids(e.target.value)}
                  placeholder="ex: 150"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Tour (cm)</label>
                <input
                  type="number"
                  value={mesPoitrine}
                  onChange={(e) => setMesPoitrine(e.target.value)}
                  placeholder="ex: 110"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Notes (optionnel)</label>
              <input
                value={mesNotes}
                onChange={(e) => setMesNotes(e.target.value)}
                placeholder="Observations"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddMeasure(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addMeasure} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
