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
import { Edit2 } from "lucide-react";
import type { Horse, Discipline } from "@/lib/supabase/types";
import { DISCIPLINE_LABELS } from "@/lib/utils";

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
  });

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
