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
import type { TrainingSession, TrainingType } from "@/lib/supabase/types";
import VoiceButton from "./VoiceButton";
import { trackEvent } from "@/lib/trackEvent";
import { awardTrainingBadges } from "@/lib/badges/triggers";
import { AlertTriangle } from "lucide-react";

const RECOVERY_TAGS = [
  "Douche", "Guêtres froid", "Tapis de massage", "Argile", "Bandes de repos", "Rien",
];

const ALERT_KEYWORDS = ["boiterie", "boite", "douleur", "blessure", "blessé", "blessée", "chute", "plaie", "enflé", "enfle", "gonflement", "gonflé", "gonflée", "abcès", "abces", "colique", "fièvre", "fievre", "fatigue excessive", "refuse", "refus de sauter", "coup", "coupure", "contusion"];

function detectHealthAlert(notes: string): string | null {
  if (!notes.trim()) return null;
  const lower = notes.toLowerCase();
  const found = ALERT_KEYWORDS.find((kw) => lower.includes(kw));
  return found || null;
}

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
    coach_present: defaultValues?.coach_present ?? false,
    equipement_recuperation: defaultValues?.equipement_recuperation || "",
    notes: defaultValues?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      horse_id: horseId,
      date: form.date,
      type: form.type as TrainingType,
      duration_min: parseInt(form.duration_min) || 45,
      intensity: (parseInt(form.intensity) || 3) as 1 | 2 | 3 | 4 | 5,
      feeling: (parseInt(form.feeling) || 3) as 1 | 2 | 3 | 4 | 5,
      objectif: form.objectif || null,
      lieu: form.lieu || null,
      coach_present: form.coach_present,
      equipement_recuperation: form.equipement_recuperation || null,
      notes: form.notes || null,
      wearable_source: null,
    };

    const { error } = defaultValues?.id
      ? await supabase.from("training_sessions").update(payload).eq("id", defaultValues.id)
      : await supabase.from("training_sessions").insert(payload);

    if (error) toast.error("Erreur lors de l'enregistrement");
    else {
      toast.success("Séance enregistrée !");
      if (!defaultValues?.id) {
        trackEvent({ event_name: "training_created", event_category: "training", properties: { type: form.type, intensity: parseInt(form.intensity), duration_min: parseInt(form.duration_min) } });
        await awardTrainingBadges(supabase, horseId);
      } else {
        // Notify owner if a coach is editing
        fetch("/api/notify-coach-modification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ horseId, element: "une séance" }),
        }).catch(() => {});
      }
      onSaved();
    }
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

      <div>
        <label className="label">Équipement de récupération</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {RECOVERY_TAGS.map((tag) => {
            const active = form.equipement_recuperation.split(",").map((t) => t.trim()).includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const current = form.equipement_recuperation.split(",").map((t) => t.trim()).filter(Boolean);
                  const next = active ? current.filter((t) => t !== tag) : [...current, tag];
                  setForm({ ...form, equipement_recuperation: next.join(", ") });
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                  active ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.coach_present}
          onChange={(e) => setForm({ ...form, coach_present: e.target.checked })}
          className="w-4 h-4 rounded accent-black"
        />
        <span className="text-sm font-medium text-black">Coach présent</span>
      </label>

      <Textarea
        label="Notes libres"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Observations, points travaillés, comportement..."
        rows={3}
      />

      {detectHealthAlert(form.notes) && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-orange-light border border-orange/20">
          <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange font-medium leading-snug">
            Vous mentionnez <strong>&ldquo;{detectHealthAlert(form.notes)}&rdquo;</strong> — pensez à ajouter un soin vétérinaire dans le carnet de santé.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button type="submit" loading={loading} className="flex-1">
          {defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
