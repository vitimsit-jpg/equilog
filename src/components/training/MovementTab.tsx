"use client";

/**
 * TRAV-21 — Onglet Mouvement pour les chevaux en mode IS (Retraite)
 * Journal de mouvement léger + score corporel (BCS Henneke)
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Activity, Pill, CheckCircle, Circle } from "lucide-react";
import type { HorseMovementLog, HorseBcsLog, HorseMedication, MovementLogType, MedicationForme, MedicationFrequence } from "@/lib/supabase/types";

const MEDICATION_FORME_LABELS: Record<MedicationForme, string> = {
  oral: "Oral", injectable: "Injectable", topique: "Topique", autre: "Autre",
};
const MEDICATION_FREQUENCE_LABELS: Record<MedicationFrequence, string> = {
  quotidien: "Quotidien", matin_soir: "Matin & soir", hebdomadaire: "Hebdomadaire",
  si_besoin: "Si besoin", cure: "En cure",
};

const MOVEMENT_TYPES: { type: MovementLogType; label: string; emoji: string; color: string }[] = [
  { type: "paddock_libre", label: "Paddock libre",  emoji: "🌿", color: "bg-green-50 text-green-700" },
  { type: "pre_libre",     label: "Pré libre",      emoji: "🌾", color: "bg-lime-50 text-lime-700" },
  { type: "balade_main",   label: "Balade à main",  emoji: "👋", color: "bg-blue-50 text-blue-700" },
  { type: "longe_douce",   label: "Longe douce",    emoji: "⭕", color: "bg-amber-50 text-amber-700" },
  { type: "monte_douce",   label: "Monte douce",    emoji: "🐴", color: "bg-purple-50 text-purple-700" },
  { type: "autre",         label: "Autre",          emoji: "📋", color: "bg-gray-50 text-gray-600" },
];

const BCS_LABELS: Record<number, string> = {
  1: "Très maigre", 2: "Maigre", 3: "Maigre modéré",
  4: "Légèrement maigre", 5: "Idéal", 6: "Légèrement gras",
  7: "Gras modéré", 8: "Gras", 9: "Obèse",
};
const BCS_COLORS: Record<number, string> = {
  1: "text-red-600", 2: "text-red-500", 3: "text-orange-500",
  4: "text-amber-500", 5: "text-green-600", 6: "text-lime-600",
  7: "text-yellow-600", 8: "text-orange-600", 9: "text-red-600",
};

interface Props {
  horseId: string;
  horseName?: string;
}

export default function MovementTab({ horseId, horseName }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [movements, setMovements] = useState<HorseMovementLog[]>([]);
  const [bcsLogs, setBcsLogs] = useState<HorseBcsLog[]>([]);
  const [medications, setMedications] = useState<HorseMedication[]>([]);
  const [activeTab, setActiveTab] = useState<"mouvement" | "bcs" | "medicaments">("mouvement");
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [showAddBcs, setShowAddBcs] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Medication form
  const [medNom, setMedNom] = useState("");
  const [medForme, setMedForme] = useState<MedicationForme>("oral");
  const [medDose, setMedDose] = useState("");
  const [medFrequence, setMedFrequence] = useState<MedicationFrequence>("quotidien");
  const [medDebut, setMedDebut] = useState(new Date().toISOString().split("T")[0]);
  const [medFin, setMedFin] = useState("");
  const [medVet, setMedVet] = useState("");
  const [medNotes, setMedNotes] = useState("");

  // Movement form
  const [movType, setMovType] = useState<MovementLogType>("paddock_libre");
  const [movDate, setMovDate] = useState(new Date().toISOString().split("T")[0]);
  const [movDuration, setMovDuration] = useState("");
  const [movObs, setMovObs] = useState("");

  // BCS form
  const [bcsDate, setBcsDate] = useState(new Date().toISOString().split("T")[0]);
  const [bcsScore, setBcsScore] = useState<number>(5);
  const [bcsNotes, setBcsNotes] = useState("");

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const [{ data: movs }, { data: bcs }, { data: meds }] = await Promise.all([
      supabase
        .from("horse_movement_logs")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("horse_bcs_logs")
        .select("*")
        .eq("horse_id", horseId)
        .order("date", { ascending: false })
        .limit(20),
      supabase
        .from("horse_medications")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false }),
    ]);
    setMovements((movs as HorseMovementLog[]) ?? []);
    setBcsLogs((bcs as HorseBcsLog[]) ?? []);
    setMedications((meds as HorseMedication[]) ?? []);
    setLoading(false);
  }

  async function addMedication() {
    if (!medNom.trim()) { toast.error("Le nom est requis"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_medications").insert({
      horse_id: horseId,
      user_id: user.id,
      nom: medNom.trim(),
      forme: medForme,
      dose: medDose.trim() || null,
      frequence: medFrequence,
      date_debut: medDebut || null,
      date_fin: medFin || null,
      vet_prescripteur: medVet.trim() || null,
      notes: medNotes.trim() || null,
      actif: true,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Médicament enregistré !");
    setShowAddMed(false);
    setMedNom(""); setMedForme("oral"); setMedDose(""); setMedFrequence("quotidien");
    setMedDebut(new Date().toISOString().split("T")[0]); setMedFin(""); setMedVet(""); setMedNotes("");
    load();
  }

  async function toggleMedication(id: string, actif: boolean) {
    await supabase.from("horse_medications").update({ actif: !actif }).eq("id", id);
    load();
  }

  async function addMovement() {
    if (!movDate) { toast.error("La date est requise"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_movement_logs").insert({
      horse_id: horseId,
      user_id: user.id,
      date: movDate,
      type: movType,
      duration_min: movDuration ? parseInt(movDuration) : null,
      observation: movObs.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Mouvement enregistré !");
    setShowAddMovement(false);
    setMovType("paddock_libre"); setMovDate(new Date().toISOString().split("T")[0]);
    setMovDuration(""); setMovObs("");
    load();
    router.refresh();
  }

  async function addBcs() {
    if (!bcsDate) { toast.error("La date est requise"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_bcs_logs").insert({
      horse_id: horseId,
      user_id: user.id,
      date: bcsDate,
      score: bcsScore,
      notes: bcsNotes.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Score corporel enregistré !");
    setShowAddBcs(false);
    setBcsDate(new Date().toISOString().split("T")[0]); setBcsScore(5); setBcsNotes("");
    load();
  }

  const latestBcs = bcsLogs[0];
  const last7DaysMovements = movements.filter((m) => {
    const d = new Date(m.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });

  if (loading) {
    return <div className="card flex items-center justify-center py-12 text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card bg-pink-50 border-pink-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌸</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-pink-800">Suivi mouvement & bien-être</p>
            <p className="text-xs text-pink-600 mt-0.5 leading-relaxed">
              {horseName ?? "Ce cheval"} est en retraite. Enregistrez ses mouvements quotidiens et suivez son état corporel.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-black text-black">{last7DaysMovements.length}</p>
            <p className="text-2xs text-gray-400">Sorties (7j)</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-2 text-center">
            {latestBcs ? (
              <>
                <p className={`text-lg font-black ${BCS_COLORS[Math.round(latestBcs.score)] ?? "text-black"}`}>
                  {latestBcs.score}/9
                </p>
                <p className="text-2xs text-gray-400">BCS actuel</p>
              </>
            ) : (
              <>
                <p className="text-lg font-black text-gray-300">—</p>
                <p className="text-2xs text-gray-400">BCS non mesuré</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("mouvement")}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === "mouvement" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            Mouvement
          </button>
          <button
            onClick={() => setActiveTab("bcs")}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === "bcs" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            BCS
          </button>
          <button
            onClick={() => setActiveTab("medicaments")}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === "medicaments" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            Médic.
            {medications.filter((m) => m.actif).length > 0 && (
              <span className="ml-1 text-2xs bg-orange text-white rounded-full px-1">
                {medications.filter((m) => m.actif).length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => {
            if (activeTab === "mouvement") setShowAddMovement(true);
            else if (activeTab === "bcs") setShowAddBcs(true);
            else setShowAddMed(true);
          }}
          className="flex items-center gap-1.5 text-xs font-bold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          {activeTab === "mouvement" ? "Ajouter" : activeTab === "bcs" ? "Mesurer" : "Médicament"}
        </button>
      </div>

      {/* Movement list */}
      {activeTab === "mouvement" && (
        <div>
          {movements.length === 0 ? (
            <div className="card flex flex-col items-center text-center gap-3 py-10">
              <span className="text-3xl">🌸</span>
              <p className="text-sm font-semibold text-gray-700">Aucun mouvement enregistré</p>
              <p className="text-xs text-gray-400">Notez les sorties au paddock, balades et sessions légères.</p>
              <button onClick={() => setShowAddMovement(true)} className="btn-primary text-xs px-4 py-2 mt-1">Ajouter</button>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => {
                const cfg = MOVEMENT_TYPES.find((t) => t.type === m.type);
                return (
                  <div key={m.id} className="card flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{cfg?.emoji ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-black">{cfg?.label ?? m.type}</p>
                        {m.duration_min && (
                          <span className="text-2xs text-gray-400">{m.duration_min} min</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                      {m.observation && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.observation}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Supprimer cette entrée ?")) return;
                        const { error } = await supabase.from("horse_movement_logs").delete().eq("id", m.id);
                        if (error) toast.error("Erreur");
                        else load();
                      }}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BCS list */}
      {activeTab === "bcs" && (
        <div>
          <div className="card bg-gray-50 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-1">Échelle de Henneke (1–9)</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              1=Très maigre → 5=Idéal → 9=Obèse. Cible recommandée pour un cheval en retraite : 5 à 6.
            </p>
          </div>

          {bcsLogs.length === 0 ? (
            <div className="card flex flex-col items-center text-center gap-3 py-10">
              <span className="text-3xl">⚖️</span>
              <p className="text-sm font-semibold text-gray-700">Aucun score enregistré</p>
              <button onClick={() => setShowAddBcs(true)} className="btn-primary text-xs px-4 py-2 mt-1">Mesurer</button>
            </div>
          ) : (
            <div className="space-y-2">
              {bcsLogs.map((b) => (
                <div key={b.id} className="card flex items-center gap-3">
                  <Activity className="h-4 w-4 text-pink-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${BCS_COLORS[Math.round(b.score)] ?? "text-black"}`}>
                        {b.score}/9
                      </span>
                      <span className="text-xs text-gray-500">{BCS_LABELS[Math.round(b.score)] ?? ""}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(b.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {b.notes && <p className="text-xs text-gray-500 mt-0.5">{b.notes}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("Supprimer cette entrée ?")) return;
                      const { error } = await supabase.from("horse_bcs_logs").delete().eq("id", b.id);
                      if (error) toast.error("Erreur");
                      else load();
                    }}
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

      {/* Medications list */}
      {activeTab === "medicaments" && (
        <div className="space-y-3">
          {medications.length === 0 ? (
            <div className="card flex flex-col items-center text-center gap-3 py-10">
              <span className="text-3xl">💊</span>
              <p className="text-sm font-semibold text-gray-700">Aucun médicament enregistré</p>
              <p className="text-xs text-gray-400">Notez les traitements en cours ou passés.</p>
              <button onClick={() => setShowAddMed(true)} className="btn-primary text-xs px-4 py-2 mt-1">Ajouter</button>
            </div>
          ) : (
            <>
              {/* Actifs */}
              {medications.filter((m) => m.actif).length > 0 && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">En cours</p>
                  <div className="space-y-2">
                    {medications.filter((m) => m.actif).map((m) => (
                      <div key={m.id} className="card flex items-start gap-3">
                        <Pill className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-black">{m.nom}</p>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {m.dose && <span className="text-2xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{m.dose}</span>}
                            {m.frequence && <span className="text-2xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{MEDICATION_FREQUENCE_LABELS[m.frequence as MedicationFrequence] ?? m.frequence}</span>}
                            {m.forme && <span className="text-2xs text-gray-400">{MEDICATION_FORME_LABELS[m.forme as MedicationForme] ?? m.forme}</span>}
                          </div>
                          {m.vet_prescripteur && <p className="text-xs text-gray-400 mt-0.5">Dr. {m.vet_prescripteur}</p>}
                          {m.date_debut && <p className="text-xs text-gray-400">Depuis le {new Date(m.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>}
                        </div>
                        <button
                          onClick={() => toggleMedication(m.id, m.actif)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Marquer comme terminé"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passés */}
              {medications.filter((m) => !m.actif).length > 0 && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Terminés</p>
                  <div className="space-y-1.5">
                    {medications.filter((m) => !m.actif).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                        <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 line-through">{m.nom}</p>
                          {m.date_fin && <p className="text-2xs text-gray-400">Fin : {new Date(m.date_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>}
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm("Supprimer ce médicament ?")) return;
                            const { error } = await supabase.from("horse_medications").delete().eq("id", m.id);
                            if (error) toast.error("Erreur");
                            else load();
                          }}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMed && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-black">Ajouter un médicament</h3>

            <div>
              <label className="label mb-1.5 block">Nom du médicament *</label>
              <input
                value={medNom}
                onChange={(e) => setMedNom(e.target.value)}
                placeholder="Bute, Danilon, Previcox…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Forme</label>
                <select
                  value={medForme}
                  onChange={(e) => setMedForme(e.target.value as MedicationForme)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                >
                  {Object.entries(MEDICATION_FORME_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1.5 block">Dose</label>
                <input
                  value={medDose}
                  onChange={(e) => setMedDose(e.target.value)}
                  placeholder="1 sachet, 5 ml…"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Fréquence</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MEDICATION_FREQUENCE_LABELS).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMedFrequence(v as MedicationFrequence)}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                      medFrequence === v ? "border-orange bg-orange/5 font-semibold" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Date début</label>
                <input
                  type="date"
                  value={medDebut}
                  onChange={(e) => setMedDebut(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Date fin (opt.)</label>
                <input
                  type="date"
                  value={medFin}
                  onChange={(e) => setMedFin(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Vétérinaire (opt.)</label>
              <input
                value={medVet}
                onChange={(e) => setMedVet(e.target.value)}
                placeholder="Dr. Martin"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Notes (opt.)</label>
              <input
                value={medNotes}
                onChange={(e) => setMedNotes(e.target.value)}
                placeholder="Posologie, précautions…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddMed(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addMedication} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Movement Modal */}
      {showAddMovement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-black">Enregistrer un mouvement</h3>

            <div>
              <label className="label mb-1.5 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {MOVEMENT_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setMovType(t.type)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                      movType === t.type ? "border-orange bg-orange/5 font-semibold" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={movDate}
                  onChange={(e) => setMovDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Durée (min)</label>
                <input
                  type="number"
                  value={movDuration}
                  onChange={(e) => setMovDuration(e.target.value)}
                  placeholder="30"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Observation (optionnel)</label>
              <input
                value={movObs}
                onChange={(e) => setMovObs(e.target.value)}
                placeholder="Comment s'est passé la sortie ?"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddMovement(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addMovement} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add BCS Modal */}
      {showAddBcs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-black">Score corporel (Henneke)</h3>

            <div>
              <label className="label mb-1.5 block">Date</label>
              <input
                type="date"
                value={bcsDate}
                onChange={(e) => setBcsDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Score : {bcsScore}/9</label>
                <span className={`text-xs font-semibold ${BCS_COLORS[bcsScore] ?? "text-black"}`}>
                  {BCS_LABELS[bcsScore] ?? ""}
                </span>
              </div>
              <input
                type="range"
                min={1} max={9} step={0.5}
                value={bcsScore}
                onChange={(e) => setBcsScore(parseFloat(e.target.value))}
                className="w-full accent-orange"
              />
              <div className="flex justify-between text-2xs text-gray-400 mt-1">
                <span>1 Maigre</span>
                <span>5 Idéal</span>
                <span>9 Obèse</span>
              </div>
              {/* Aide contextuelle BCS — Échelle Henneke */}
              <details className="mt-3 group">
                <summary className="cursor-pointer select-none flex items-center gap-1.5 text-2xs text-orange font-semibold hover:opacity-80 transition-opacity">
                  <span className="w-4 h-4 rounded-full bg-orange/10 flex items-center justify-center text-orange font-bold text-[9px]">?</span>
                  Guide de l&apos;échelle Henneke
                </summary>
                <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden text-2xs">
                  {([
                    { score: "1", label: "Très maigre",        desc: "Colonne, côtes, queue très saillantes. Aucun tissu gras détectable.", color: "bg-red-50" },
                    { score: "2", label: "Maigre",             desc: "Processus épineux saillants. Légère couverture graisseuse sur les côtes.", color: "bg-red-50" },
                    { score: "3", label: "Maigre modéré",      desc: "Légère couverture sur la colonne. Côtes facilement palpables.", color: "bg-orange-50" },
                    { score: "4", label: "Légèrement maigre",  desc: "Garrot, épaule, région cervicale sont saillants. Côtes palpables.", color: "bg-amber-50" },
                    { score: "5", label: "Idéal ✓",            desc: "Le dos est plat. Côtes non visibles mais facilement palpables. Épaules et encolure régulières.", color: "bg-green-50" },
                    { score: "6", label: "Légèrement gras",    desc: "Légère crête d'encolure. Graisse autour de la queue bien palpable.", color: "bg-lime-50" },
                    { score: "7", label: "Gras modéré",        desc: "Crête d'encolure visible. Côtes palpables avec pression ferme.", color: "bg-yellow-50" },
                    { score: "8", label: "Gras",               desc: "Crête d'encolure prononcée. Côtes difficilement palpables. Graisse en dépôt.", color: "bg-orange-50" },
                    { score: "9", label: "Obèse",              desc: "Flancs très comblés. Crête d'encolure très épaisse. Côtes non palpables.", color: "bg-red-50" },
                  ] as { score: string; label: string; desc: string; color: string }[]).map((row) => (
                    <div
                      key={row.score}
                      className={`flex items-start gap-2 px-2.5 py-2 border-b border-gray-50 last:border-0 ${
                        parseFloat(row.score) === Math.round(bcsScore) ? "ring-1 ring-inset ring-orange/30 " + row.color : row.color
                      }`}
                    >
                      <span className="font-black text-gray-700 w-4 flex-shrink-0">{row.score}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-700">{row.label}</span>
                        <p className="text-gray-400 mt-0.5 leading-snug">{row.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <div>
              <label className="label mb-1.5 block">Notes (optionnel)</label>
              <input
                value={bcsNotes}
                onChange={(e) => setBcsNotes(e.target.value)}
                placeholder="Observations, changements de ration…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddBcs(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addBcs} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
