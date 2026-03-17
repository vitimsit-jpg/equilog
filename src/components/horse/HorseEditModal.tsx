"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { Edit2, Plus, Trash2, Cloud, Activity } from "lucide-react";
import type { Horse, Discipline } from "@/lib/supabase/types";
import { DISCIPLINE_LABELS } from "@/lib/utils";
import type { Couverture } from "@/lib/meteo";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([value, label]) => ({ value, label }));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 35 }, (_, i) => {
  const y = currentYear - i;
  return { value: String(y), label: String(y) };
});

const sexeOptions = [
  { value: "hongre", label: "Hongre" },
  { value: "jument", label: "Jument" },
  { value: "etalon", label: "Étalon" },
];

const conditionsVieOptions = [
  { value: "box", label: "Box" },
  { value: "paddock", label: "Paddock" },
  { value: "pre", label: "Pré" },
  { value: "box_paddock", label: "Box + Paddock" },
];

interface Props {
  horse: Horse;
}

export default function HorseEditModal({ horse }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: horse.name,
    breed: horse.breed || "",
    birth_year: horse.birth_year ? String(horse.birth_year) : "",
    discipline: horse.discipline || "",
    region: horse.region || "",
    ecurie: horse.ecurie || "",
    sexe: horse.sexe || "",
    conditions_vie: horse.conditions_vie || "",
    niveau: horse.niveau || "",
    objectif_saison: horse.objectif_saison || "",
    maladies_chroniques: horse.maladies_chroniques || "",
    assurance: horse.assurance || "",
    sire_number: horse.sire_number || "",
    fei_number: horse.fei_number || "",
    tonte: horse.tonte || "",
    morphologie_meteo: horse.morphologie_meteo || "",
    etat_corporel: horse.etat_corporel || "",
    horse_index_mode: horse.horse_index_mode || "IE",
  });
  const [trousseau, setTrousseau] = useState<Couverture[]>(horse.trousseau || []);
  const [newCouv, setNewCouv] = useState({ label: "", grammage: "", impermeable: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
    setLoading(true);

    const { error } = await supabase
      .from("horses")
      .update({
        name: form.name.trim(),
        breed: form.breed || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        discipline: (form.discipline as Discipline) || null,
        region: form.region || null,
        ecurie: form.ecurie || null,
        sexe: (form.sexe as Horse["sexe"]) || null,
        conditions_vie: (form.conditions_vie as Horse["conditions_vie"]) || null,
        niveau: form.niveau || null,
        objectif_saison: form.objectif_saison || null,
        maladies_chroniques: form.maladies_chroniques || null,
        assurance: form.assurance || null,
        sire_number: form.sire_number || null,
        fei_number: form.fei_number || null,
        tonte: (form.tonte as Horse["tonte"]) || null,
        morphologie_meteo: (form.morphologie_meteo as Horse["morphologie_meteo"]) || null,
        etat_corporel: (form.etat_corporel as Horse["etat_corporel"]) || null,
        horse_index_mode: form.horse_index_mode || "IE",
        ...(form.horse_index_mode !== horse.horse_index_mode && {
          horse_index_mode_changed_at: new Date().toISOString(),
        }),
        trousseau: trousseau.length > 0 ? trousseau : [],
      })
      .eq("id", horse.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour");
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
        title="Modifier le profil"
      >
        <Edit2 className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Modifier le profil">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Race"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              placeholder="Selle Français"
            />
            <Select
              label="Année de naissance"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              options={yearOptions}
              placeholder="Sélectionner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sexe"
              value={form.sexe}
              onChange={(e) => setForm({ ...form, sexe: e.target.value })}
              options={sexeOptions}
              placeholder="Sélectionner"
            />
            <Select
              label="Discipline"
              value={form.discipline}
              onChange={(e) => setForm({ ...form, discipline: e.target.value })}
              options={disciplineOptions}
              placeholder="Sélectionner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Conditions de vie"
              value={form.conditions_vie}
              onChange={(e) => setForm({ ...form, conditions_vie: e.target.value })}
              options={conditionsVieOptions}
              placeholder="Sélectionner"
            />
            <Input
              label="Niveau"
              value={form.niveau}
              onChange={(e) => setForm({ ...form, niveau: e.target.value })}
              placeholder="Ex : Amateur 5, Club 3..."
            />
          </div>

          <Input
            label="Objectif de saison"
            value={form.objectif_saison}
            onChange={(e) => setForm({ ...form, objectif_saison: e.target.value })}
            placeholder="Ex : monter en Amateur 7, préparer le regional..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Région"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Île-de-France"
            />
            <Input
              label="Écurie"
              value={form.ecurie}
              onChange={(e) => setForm({ ...form, ecurie: e.target.value })}
              placeholder="Écurie du Val"
            />
          </div>

          <Textarea
            label="Maladies chroniques / antécédents"
            value={form.maladies_chroniques}
            onChange={(e) => setForm({ ...form, maladies_chroniques: e.target.value })}
            placeholder="Ex : PPID (Cushing), arthrose, fourbure récurrente..."
            rows={2}
          />

          <Input
            label="Assurance"
            value={form.assurance}
            onChange={(e) => setForm({ ...form, assurance: e.target.value })}
            placeholder="Ex : MAIF, GMF, Groupama..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="N° SIRE"
              value={form.sire_number}
              onChange={(e) => setForm({ ...form, sire_number: e.target.value })}
              placeholder="Ex : 12345678901"
            />
            <Input
              label="N° FEI"
              value={form.fei_number}
              onChange={(e) => setForm({ ...form, fei_number: e.target.value })}
              placeholder="Ex : FRA12345"
            />
          </div>

          {/* ── Mode de vie (Horse Index) ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-orange" />
              <h3 className="text-sm font-bold text-black">Mode de vie</h3>
              <span className="text-xs text-gray-400">(pour le Horse Index)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "IC",  emoji: "🏆", label: "Compétition",    desc: "En préparation ou en saison de concours" },
                { value: "IE",  emoji: "🌿", label: "Loisir",          desc: "Monté régulièrement pour le plaisir" },
                { value: "IP",  emoji: "🐾", label: "Semi-actif",      desc: "Monté occasionnellement, soins prioritaires" },
                { value: "IR",  emoji: "💊", label: "Convalescence",   desc: "En récupération post-blessure ou opération" },
                { value: "IS",  emoji: "🌸", label: "Retraite",        desc: "Plus travaillé, vie au pré ou en pension retraite" },
                { value: "ICr", emoji: "🌱", label: "Poulain",         desc: "En développement, pas encore travaillé" },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    const isChange = form.horse_index_mode && form.horse_index_mode !== m.value;
                    if (isChange && !confirm(`Changer le mode de vie recalibrera le Horse Index de ${form.name || "ce cheval"} sur 30 jours. Continuer ?`)) return;
                    setForm({ ...form, horse_index_mode: m.value });
                  }}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                    form.horse_index_mode === m.value
                      ? "border-orange bg-orange-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{m.emoji}</span>
                      <span className="text-xs font-bold text-black">{m.label}</span>
                      <span className="text-2xs font-mono text-gray-400 bg-gray-100 px-1 rounded">{m.value}</span>
                    </div>
                    <p className="text-2xs text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Profil météo ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-black">Profil météo</h3>
              <span className="text-xs text-gray-400">(pour les recommandations couverture)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tonte *"
                value={form.tonte}
                onChange={(e) => setForm({ ...form, tonte: e.target.value })}
                options={[
                  { value: "non_tondu", label: "Non tondu" },
                  { value: "partielle", label: "Tonte partielle" },
                  { value: "complete", label: "Tonte complète" },
                ]}
                placeholder="Sélectionner"
              />
              <Select
                label="Morphologie"
                value={form.morphologie_meteo}
                onChange={(e) => setForm({ ...form, morphologie_meteo: e.target.value })}
                options={[
                  { value: "sang_chaud", label: "Sang chaud / Warmblood" },
                  { value: "pur_sang", label: "Pur-sang / Arabe (frileux)" },
                  { value: "rustique", label: "Poney / Cob (rustique)" },
                ]}
                placeholder="Sélectionner"
              />
            </div>

            <div className="mt-3">
              <Select
                label="État corporel"
                value={form.etat_corporel}
                onChange={(e) => setForm({ ...form, etat_corporel: e.target.value })}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "maigre", label: "Maigre (besoin +1 niveau)" },
                ]}
                placeholder="Sélectionner"
              />
            </div>

            {/* Trousseau couvertures */}
            <div className="mt-4">
              <label className="label mb-2 block">Trousseau de couvertures</label>
              {trousseau.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {trousseau.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-black truncate">{c.label}</span>
                        <span className="text-xs text-gray-400">{c.grammage}g</span>
                        {c.impermeable && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Imp.</span>}
                      </div>
                      <button type="button" onClick={() => setTrousseau(trousseau.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Ex : Hiver 300g"
                    value={newCouv.label}
                    onChange={(e) => setNewCouv({ ...newCouv, label: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    placeholder="g"
                    value={newCouv.grammage}
                    onChange={(e) => setNewCouv({ ...newCouv, grammage: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCouv.impermeable}
                    onChange={(e) => setNewCouv({ ...newCouv, impermeable: e.target.checked })}
                    className="rounded"
                  />
                  Imp.
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!newCouv.label || !newCouv.grammage) return;
                    setTrousseau([...trousseau, { label: newCouv.label, grammage: parseInt(newCouv.grammage), impermeable: newCouv.impermeable }]);
                    setNewCouv({ label: "", grammage: "", impermeable: false });
                  }}
                  className="p-2 rounded-xl bg-black text-white hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
