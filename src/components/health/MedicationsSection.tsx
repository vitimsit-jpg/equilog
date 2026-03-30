"use client";

/**
 * TRAV-21 — Section médicaments (intégrée dans la page Santé pour IS/IR/IP)
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Pill, Trash2, CheckCircle2 } from "lucide-react";
import type { HorseMedication, MedicationForme, MedicationFrequence } from "@/lib/supabase/types";

const FORMES: { value: MedicationForme; label: string }[] = [
  { value: "oral",       label: "Oral" },
  { value: "injectable", label: "Injectable" },
  { value: "topique",    label: "Topique" },
  { value: "autre",      label: "Autre" },
];

const FREQUENCES: { value: MedicationFrequence; label: string }[] = [
  { value: "quotidien",    label: "Quotidien" },
  { value: "matin_soir",   label: "Matin & soir" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "si_besoin",    label: "Si besoin" },
  { value: "cure",         label: "En cure" },
];

interface Props {
  horseId: string;
}

export default function MedicationsSection({ horseId }: Props) {
  const supabase = createClient();
  const [meds, setMeds] = useState<HorseMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Form
  const [nom, setNom] = useState("");
  const [forme, setForme] = useState<MedicationForme>("oral");
  const [dose, setDose] = useState("");
  const [frequence, setFrequence] = useState<MedicationFrequence>("quotidien");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [vet, setVet] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase
      .from("horse_medications")
      .select("*")
      .eq("horse_id", horseId)
      .order("created_at", { ascending: false });
    setMeds((data as HorseMedication[]) ?? []);
    setLoading(false);
  }

  async function addMed() {
    if (!nom.trim()) { toast.error("Le nom est requis"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_medications").insert({
      horse_id: horseId,
      user_id: user.id,
      nom: nom.trim(),
      forme,
      dose: dose.trim() || null,
      frequence,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      vet_prescripteur: vet.trim() || null,
      notes: notes.trim() || null,
      actif: true,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Médicament ajouté !");
    setShowAdd(false);
    setNom(""); setDose(""); setDateDebut(""); setDateFin(""); setVet(""); setNotes("");
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("horse_medications").update({ actif: !current }).eq("id", id);
    if (error) toast.error("Erreur");
    else load();
  }

  async function deleteMed(id: string) {
    if (!confirm("Supprimer ce médicament ?")) return;
    const { error } = await supabase.from("horse_medications").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else load();
  }

  const activeMeds = meds.filter((m) => m.actif);
  const inactiveMeds = meds.filter((m) => !m.actif);

  if (loading) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-purple-500" />
          <h3 className="font-bold text-black text-sm">Médicaments & traitements</h3>
          {activeMeds.length > 0 && (
            <span className="text-2xs font-semibold text-white bg-purple-500 px-1.5 py-0.5 rounded-full">
              {activeMeds.length} actif{activeMeds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs font-bold text-black hover:text-orange transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {activeMeds.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">Aucun traitement en cours</p>
      ) : (
        <div className="space-y-2">
          {activeMeds.map((m) => (
            <div key={m.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <CheckCircle2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-black">{m.nom}</p>
                  {m.dose && <span className="text-2xs text-purple-600 font-medium">{m.dose}</span>}
                  {m.frequence && (
                    <span className="text-2xs text-gray-500">
                      {FREQUENCES.find((f) => f.value === m.frequence)?.label ?? m.frequence}
                    </span>
                  )}
                </div>
                {m.vet_prescripteur && (
                  <p className="text-xs text-gray-500 mt-0.5">Dr {m.vet_prescripteur}</p>
                )}
                {m.date_debut && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Depuis le {new Date(m.date_debut).toLocaleDateString("fr-FR")}
                    {m.date_fin ? ` → ${new Date(m.date_fin).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleActive(m.id, m.actif)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                  title="Marquer comme terminé"
                >
                  Fin
                </button>
                <button onClick={() => deleteMed(m.id)} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveMeds.length > 0 && (
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="text-xs text-gray-400 hover:text-gray-600 mt-3"
        >
          {showInactive ? "Masquer" : `Voir les traitements terminés (${inactiveMeds.length})`}
        </button>
      )}

      {showInactive && inactiveMeds.map((m) => (
        <div key={m.id} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-gray-50 mt-1 opacity-60">
          <p className="text-xs font-medium text-gray-500 line-through">{m.nom}</p>
          <button onClick={() => deleteMed(m.id)} className="ml-auto text-gray-300 hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-black">Ajouter un médicament</h3>

            <div>
              <label className="label mb-1.5 block">Nom du médicament *</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Prednisolone, Phénylbutazone…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Forme</label>
                <select
                  value={forme}
                  onChange={(e) => setForme(e.target.value as MedicationForme)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                >
                  {FORMES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label mb-1.5 block">Dose</label>
                <input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="Ex: 2g"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Fréquence</label>
              <select
                value={frequence}
                onChange={(e) => setFrequence(e.target.value as MedicationFrequence)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
              >
                {FREQUENCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Début</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Fin prévue</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Vétérinaire prescripteur</label>
              <input
                value={vet}
                onChange={(e) => setVet(e.target.value)}
                placeholder="Dr Dupont"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Instructions, effets observés…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addMed} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
