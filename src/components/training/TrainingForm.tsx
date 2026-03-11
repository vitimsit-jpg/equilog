"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { TRAINING_TYPE_LABELS, INTENSITY_LABELS, FEELING_LABELS } from "@/lib/utils";
import type { TrainingSession } from "@/lib/supabase/types";
import VoiceButton from "./VoiceButton";

const typeOptions = Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<TrainingSession>;
}

export default function TrainingForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
    type: defaultValues?.type || "dressage",
    duration_min: defaultValues?.duration_min ? String(defaultValues.duration_min) : "45",
    intensity: defaultValues?.intensity ? String(defaultValues.intensity) : "3",
    feeling: defaultValues?.feeling ? String(defaultValues.feeling) : "3",
    objectif: defaultValues?.objectif || "",
    lieu: defaultValues?.lieu || "",
    notes: defaultValues?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      horse_id: horseId,
      date: form.date,
      type: form.type as any,
      duration_min: parseInt(form.duration_min),
      intensity: parseInt(form.intensity) as any,
      feeling: parseInt(form.feeling) as any,
      objectif: form.objectif || null,
      lieu: form.lieu || null,
      notes: form.notes || null,
      wearable_source: null,
    };

    const { error } = defaultValues?.id
      ? await supabase.from("training_sessions").update(payload).eq("id", defaultValues.id)
      : await supabase.from("training_sessions").insert(payload);

    if (error) toast.error("Erreur lors de l'enregistrement");
    else { toast.success("Séance enregistrée !"); onSaved(); }
    setLoading(false);
  };

  const handleVoiceResult = (data: { type: string; duration_min: number; intensity: number; feeling: number; notes: string | null; objectif?: string | null; lieu?: string | null }) => {
    setForm((prev) => ({
      ...prev,
      type: (data.type as import("@/lib/supabase/types").TrainingType) || prev.type,
      duration_min: data.duration_min ? String(data.duration_min) : prev.duration_min,
      intensity: data.intensity ? String(Math.min(5, Math.max(1, data.intensity))) : prev.intensity,
      feeling: data.feeling ? String(Math.min(5, Math.max(1, data.feeling))) : prev.feeling,
      objectif: data.objectif || prev.objectif,
      lieu: data.lieu || prev.lieu,
      notes: data.notes || prev.notes,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!defaultValues?.id && <VoiceButton onResult={handleVoiceResult} />}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <Select
          label="Type de travail"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as import("@/lib/supabase/types").TrainingType })}
          options={typeOptions}
        />
      </div>

      <Input
        label="Durée (minutes)"
        type="number"
        value={form.duration_min}
        onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
        min="1"
        max="300"
        required
      />

      <div>
        <label className="label">Intensité — {INTENSITY_LABELS[parseInt(form.intensity)]}</label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm({ ...form, intensity: String(v) })}
              className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                parseInt(form.intensity) >= v
                  ? "bg-orange text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Ressenti — {FEELING_LABELS[parseInt(form.feeling)]}</label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm({ ...form, feeling: String(v) })}
              className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                parseInt(form.feeling) >= v
                  ? "bg-success text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Objectif de séance"
        value={form.objectif}
        onChange={(e) => setForm({ ...form, objectif: e.target.value })}
        placeholder="Ex : travail du rassembler, extensions..."
      />

      <Input
        label="Lieu"
        value={form.lieu}
        onChange={(e) => setForm({ ...form, lieu: e.target.value })}
        placeholder="Ex : carrière couverte, extérieur..."
      />

      <Textarea
        label="Notes libres"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Observations, points travaillés, comportement..."
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
