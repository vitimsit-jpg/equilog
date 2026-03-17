"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { ChevronDown } from "lucide-react";
import { DISCIPLINE_LABELS } from "@/lib/utils";
import type { Competition } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([v, l]) => ({ value: v, label: l }));

type LevelGroup = { group: string; levels: string[] };

const LEVELS_BY_DISCIPLINE: Record<string, LevelGroup[]> = {
  CCE: [
    { group: "Jeunes Chevaux / SHF", levels: ["Jeunes Chevaux / SHF", "Cycle Libre 1", "Cycle Libre 2", "Cycle Libre 3", "Formation 1", "Formation 2", "Formation 3", "Cycle Classique 4 ans", "Cycle Classique 5 ans", "Cycle Classique 6 ans", "Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Amateur", levels: ["Amateur", "Amateur 4", "Amateur 3", "Amateur 2", "Amateur 1", "Amateur Elite"] },
    { group: "Club", levels: ["Club", "Club 3", "Club 2", "Club 1", "Club Elite", "Club E 2", "Club E 1", "Club E Elite"] },
    { group: "Pro", levels: ["Pro", "Pro 4", "Pro 3", "Pro 2", "Pro 1", "Pro Elite"] },
    { group: "Poney", levels: ["Poney", "Poney 3", "Poney 2", "Poney 1", "Poney Elite"] },
    { group: "As Poney", levels: ["As Poney", "As Poney 2", "As Poney 1", "As Poney Elite"] },
    { group: "As Jeunes", levels: ["As Jeunes", "As Jeunes 2", "As Jeunes 1", "As Jeune Elite"] },
    { group: "International FEI / CCI", levels: ["CCI1*-Intro", "CCI2*-S", "CCI2*-L", "CCI3*-S", "CCI3*-L", "CCI4*-S", "CCI4*-L", "CCI5*-L"] },
  ],
  CSO: [
    { group: "Jeunes Chevaux SHF", levels: ["Jeunes chevaux SHF", "Cycle Classique 4 ans", "Cycle Classique 5 ans", "Cycle Classique 6 ans", "Cycle Libre 1", "Cycle Libre 2", "Cycle Libre 3", "Formation 1", "Formation 2", "Formation 3", "Formation 4", "Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Club", levels: ["Club 4", "Club 3", "Club 2", "Club 1", "Club Elite"] },
    { group: "Club E", levels: ["Club E3", "Club E2", "Club E1", "Club E Elite"] },
    { group: "Poney", levels: ["Poney A 2", "Poney A 1", "Poney A Elite", "Poney 4", "Poney 3", "Poney 2", "Poney 1", "Poney Elite", "Future Elite 7 ans"] },
    { group: "As Poney", levels: ["As Poney 2C", "As Poney 2D", "As Poney 1", "As Poney Elite"] },
    { group: "Amateur", levels: ["Amateur 3", "Amateur 2", "Amateur 1", "Amateur Elite"] },
    { group: "Pro", levels: ["Pro 3", "Pro 2", "Pro 1", "Pro Elite"] },
    { group: "CSI International", levels: ["CSI1*", "CSI2*", "CSI3*", "CSI4*", "CSI5*", "CSIYH1*", "CSIYH2*", "CSIP", "CSIY", "CSIU25", "CSI-Am"] },
    { group: "Préparatoire", levels: ["Préparatoire 30 cm", "Préparatoire 35 cm", "Préparatoire 40 cm", "Préparatoire 45 cm", "Préparatoire 50 cm", "Préparatoire 55 cm", "Préparatoire 60 cm", "Préparatoire 65 cm", "Préparatoire 70 cm", "Préparatoire 75 cm", "Préparatoire 80 cm", "Préparatoire 85 cm", "Préparatoire 90 cm", "Préparatoire 95 cm", "Préparatoire 1,00 m", "Préparatoire 1,05 m", "Préparatoire 1,10 m", "Préparatoire 1,15 m", "Préparatoire 1,20 m", "Préparatoire 1,25 m", "Préparatoire 1,30 m", "Préparatoire 1,35 m", "Préparatoire 1,40 m", "Préparatoire 1,45 m", "Préparatoire 1,50 m"] },
  ],
  Dressage: [
    { group: "Jeunes Chevaux SHF / Cycle Classique", levels: ["Chevaux de 4 ans, reprise préliminaire", "Chevaux de 4 ans, reprise finale", "Chevaux de 5 ans, reprise préliminaire", "Chevaux de 5 ans, reprise finale", "Chevaux de 6 ans, reprise préliminaire", "Chevaux de 6 ans, reprise finale"] },
    { group: "Formation", levels: ["Formation 1, reprise préliminaire", "Formation 1, reprise finale", "Formation 2, reprise préliminaire", "Formation 2, reprise finale", "Formation 3, reprise préliminaire", "Formation 3, reprise finale"] },
    { group: "Cycle Libre", levels: ["Cycle Libre 1, reprise préliminaire", "Cycle Libre 1, reprise finale", "Cycle Libre 2, reprise préliminaire", "Cycle Libre 2, reprise finale", "Cycle Libre 3, reprise préliminaire", "Cycle Libre 3, reprise finale"] },
    { group: "Jeunes Poneys SHF", levels: ["Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Club", levels: ["Club 4 Grand Prix", "Club 4 Libre", "Club 3 Grand Prix", "Club 3 Libre", "Club 2 Grand Prix", "Club 2 Libre", "Club 1 Grand Prix", "Club 1 Libre", "Club Elite Grand Prix", "Club Elite Libre"] },
    { group: "Club E", levels: ["Club E3 Grand Prix", "Club E3 Libre", "Club E2 Grand Prix", "Club E2 Libre", "Club E1 Grand Prix", "Club E1 Libre", "Club E Elite Grand Prix", "Club E Elite Libre"] },
    { group: "Poney", levels: ["Poney 4 Grand Prix", "Poney 4 Libre", "Poney 3 Grand Prix", "Poney 3 Libre", "Poney 2 Grand Prix", "Poney 2 Libre", "Poney 1 Grand Prix", "Poney 1 Libre", "Poney Elite Grand Prix", "Poney Elite Libre"] },
    { group: "As Poney", levels: ["As Poney 2 Grand Prix", "As Poney 2 Libre", "As Poney 1 Grand Prix", "As Poney 1 Libre", "As Poney Elite Équipe", "As Poney Elite Grand Prix", "As Poney Elite Libre"] },
    { group: "Amateur 3", levels: ["Amateur 3 Préliminaire D2", "Amateur 3 Grand Prix D1", "Amateur 3 Préliminaire Préparatoire", "Amateur 3 Grand Prix Préparatoire", "Amateur 3 Libre"] },
    { group: "Amateur 2", levels: ["Amateur 2 B C4", "Amateur 2 A C3", "Amateur 2 Préliminaire C2", "Amateur 2 Grand Prix C1", "Amateur 2 B Préparatoire", "Amateur 2 A Préparatoire", "Amateur 2 Préliminaire Préparatoire", "Amateur 2 Grand Prix Préparatoire", "Amateur 2 Libre"] },
    { group: "Amateur 1", levels: ["Amateur 1 B B4", "Amateur 1 A B3", "Amateur 1 Préliminaire B2", "Amateur 1 Grand Prix B1", "Amateur 1 B Préparatoire", "Amateur 1 A Préparatoire", "Amateur 1 Préliminaire Préparatoire", "Amateur 1 Grand Prix Préparatoire", "Amateur 1 Libre"] },
    { group: "Amateur Elite", levels: ["Amateur Elite Préliminaire A7", "Amateur Elite Grand Prix A6", "Amateur Elite Préliminaire Préparatoire", "Amateur Elite Grand Prix Préparatoire", "Amateur Elite Libre"] },
    { group: "Pro 3", levels: ["Pro 3 B A10", "Pro 3 A A9", "Pro 3 Préliminaire A8A", "Pro 3 Grand Prix A8B", "Pro 3 B Préparatoire", "Pro 3 A Préparatoire", "Pro 3 Préliminaire Préparatoire", "Pro 3 Grand Prix Préparatoire", "Pro 3 Libre"] },
    { group: "Pro 2", levels: ["Pro 2 A A7", "Pro 2 Grand Prix A5", "Pro 2 A Préparatoire", "Pro 2 Grand Prix Préparatoire", "Pro 2 Préliminaire", "Pro 2 Préliminaire Préparatoire", "Pro 2 Libre"] },
    { group: "Pro 1", levels: ["Pro 1 Préliminaire A4", "Pro 1 Grand Prix A3", "Pro 1 A", "Pro 1 A Préparatoire", "Pro 1 Préliminaire Préparatoire", "Pro 1 Grand Prix Préparatoire", "Pro 1 Libre"] },
    { group: "Pro Elite", levels: ["Pro Elite Grand Prix Jeune", "Pro Elite Grand Prix", "Pro Elite Grand Prix Spécial", "Pro Elite Libre"] },
    { group: "As Jeunes 3", levels: ["As Jeunes 3 Préliminaire", "As Jeunes 3 Équipe", "As Jeunes 3 Grand Prix"] },
    { group: "As Jeunes 2", levels: ["As Jeunes 2 Préliminaire", "As Jeunes 2 Grand Prix"] },
    { group: "As Jeune 1", levels: ["As Jeune 1 Équipe", "As Jeune 1 Grand Prix"] },
    { group: "As Jeune Elite", levels: ["As Jeune Elite Équipe", "As Jeune Elite Grand Prix", "As Jeune Elite Libre"] },
    { group: "Avenir", levels: ["Avenir 1", "Avenir 2", "Avenir 3", "Avenir Elite"] },
    { group: "Niveaux FEI", levels: ["CDI1*", "CDI2*", "CDI3*", "CDI4*", "CDI5*", "CDIO", "CDI W", "CDIP", "CDICh", "CDIJ", "CDIY", "CDIU25", "CDIAm", "CDIYH"] },
  ],
};

const GENERIC_LEVELS: LevelGroup[] = [
  { group: "Niveaux", levels: ["Débutant", "Club", "Amateur", "Pro", "Elite", "Autre"] },
];

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<Competition>;
}

export default function CompetitionForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
    event_name: defaultValues?.event_name || "",
    discipline: defaultValues?.discipline || "CSO",
    level: defaultValues?.level || "",
    result_rank: defaultValues?.result_rank ? String(defaultValues.result_rank) : "",
    total_riders: defaultValues?.total_riders ? String(defaultValues.total_riders) : "",
    score: defaultValues?.score ? String(defaultValues.score) : "",
    location: defaultValues?.location || "",
    notes: defaultValues?.notes || "",
  });

  const levelGroups = LEVELS_BY_DISCIPLINE[form.discipline] ?? GENERIC_LEVELS;

  const handleDisciplineChange = (discipline: string) => {
    setForm({ ...form, discipline: discipline as Competition["discipline"], level: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_name.trim()) { toast.error("Le nom du concours est requis"); return; }
    if (!form.level) { toast.error("Le niveau est requis"); return; }
    setLoading(true);

    const payload = {
      horse_id: horseId,
      date: form.date,
      event_name: form.event_name.trim(),
      discipline: form.discipline as any,
      level: form.level,
      result_rank: form.result_rank ? parseInt(form.result_rank) : null,
      total_riders: form.total_riders ? parseInt(form.total_riders) : null,
      score: form.score ? parseFloat(form.score) : null,
      location: form.location || null,
      notes: form.notes || null,
    };

    const { error } = defaultValues?.id
      ? await supabase.from("competitions").update(payload).eq("id", defaultValues.id)
      : await supabase.from("competitions").insert(payload);

    if (error) toast.error("Erreur lors de l'enregistrement");
    else {
      toast.success("Concours enregistré !");
      if (!defaultValues?.id) trackEvent({ event_name: "competition_created", event_category: "competition", properties: { discipline: form.discipline, level: form.level } });
      onSaved();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <Input
          label="Nom du concours"
          value={form.event_name}
          onChange={(e) => setForm({ ...form, event_name: e.target.value })}
          placeholder="Grand Prix de Paris"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Discipline"
          value={form.discipline}
          onChange={(e) => handleDisciplineChange(e.target.value)}
          options={disciplineOptions}
        />

        {/* Niveau avec optgroups */}
        <div className="w-full">
          <label className="label">Niveau</label>
          <div className="relative">
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="input appearance-none pr-9 w-full"
              required
            >
              <option value="" disabled>Sélectionner</option>
              {levelGroups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Classement"
          type="number"
          value={form.result_rank}
          onChange={(e) => setForm({ ...form, result_rank: e.target.value })}
          placeholder="1"
          min="1"
        />
        <Input
          label="Nb. partants"
          type="number"
          value={form.total_riders}
          onChange={(e) => setForm({ ...form, total_riders: e.target.value })}
          placeholder="20"
          min="1"
        />
        <Input
          label="Score / Points"
          type="number"
          value={form.score}
          onChange={(e) => setForm({ ...form, score: e.target.value })}
          placeholder="0.0"
          step="0.01"
        />
      </div>

      <Input
        label="Lieu"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="Paris, Fontainebleau..."
      />

      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Observations, conditions, parcours..."
        rows={3}
      />

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button type="submit" loading={loading} className="flex-1">
          {defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
