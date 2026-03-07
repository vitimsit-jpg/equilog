"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { DISCIPLINE_LABELS } from "@/lib/utils";
import type { Competition } from "@/lib/supabase/types";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([v, l]) => ({ value: v, label: l }));

const levelOptions = [
  { value: "Amateur 1", label: "Amateur 1" },
  { value: "Amateur 2", label: "Amateur 2" },
  { value: "Amateur 3", label: "Amateur 3" },
  { value: "Club 1", label: "Club 1" },
  { value: "Club 2", label: "Club 2" },
  { value: "Pro 1", label: "Pro 1" },
  { value: "Pro 2", label: "Pro 2" },
  { value: "Elite", label: "Elite" },
  { value: "Grand Prix", label: "Grand Prix" },
  { value: "Autre", label: "Autre" },
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
    level: defaultValues?.level || "Amateur 1",
    result_rank: defaultValues?.result_rank ? String(defaultValues.result_rank) : "",
    total_riders: defaultValues?.total_riders ? String(defaultValues.total_riders) : "",
    score: defaultValues?.score ? String(defaultValues.score) : "",
    location: defaultValues?.location || "",
    notes: defaultValues?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_name.trim()) { toast.error("Le nom du concours est requis"); return; }
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
    else { toast.success("Concours enregistré !"); onSaved(); }
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
          onChange={(e) => setForm({ ...form, discipline: e.target.value as import("@/lib/supabase/types").Discipline })}
          options={disciplineOptions}
        />
        <Select
          label="Niveau"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          options={levelOptions}
        />
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
