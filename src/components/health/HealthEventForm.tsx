"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { HealthRecord, HealthType } from "@/lib/supabase/types";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { format, addDays } from "date-fns";

const typeOptions = Object.entries(HEALTH_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Default intervals in days per type
const defaultIntervals: Record<HealthType, number | null> = {
  vaccin: 180,
  vermifuge: 90,
  ferrage: 56,
  dentiste: 365,
  osteo: 180,
  veterinaire: null,
  masseuse: 90,
  autre: null,
};

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<HealthRecord>;
}

export default function HealthEventForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: defaultValues?.type || ("vaccin" as HealthType),
    date: defaultValues?.date || today,
    next_date: defaultValues?.next_date || "",
    vet_name: defaultValues?.vet_name || "",
    practitioner_phone: defaultValues?.practitioner_phone || "",
    product_name: defaultValues?.product_name || "",
    cost: defaultValues?.cost ? String(defaultValues.cost) : "",
    notes: defaultValues?.notes || "",
  });

  const handleTypeChange = (type: HealthType) => {
    const interval = defaultIntervals[type];
    const nextDate = interval
      ? format(addDays(new Date(form.date), interval), "yyyy-MM-dd")
      : "";
    setForm({ ...form, type, next_date: nextDate });
  };

  const handleDateChange = (date: string) => {
    const interval = defaultIntervals[form.type];
    const nextDate = interval
      ? format(addDays(new Date(date), interval), "yyyy-MM-dd")
      : form.next_date;
    setForm({ ...form, date, next_date: nextDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      horse_id: horseId,
      type: form.type,
      date: form.date,
      next_date: form.next_date || null,
      vet_name: form.vet_name || null,
      practitioner_phone: form.practitioner_phone || null,
      product_name: form.product_name || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: form.notes || null,
    };

    const { error } = defaultValues?.id
      ? await supabase.from("health_records").update(payload).eq("id", defaultValues.id)
      : await supabase.from("health_records").insert(payload);

    if (error) toast.error("Erreur lors de l'enregistrement");
    else {
      toast.success("Soin enregistré !");
      onSaved();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Type de soin"
        value={form.type}
        onChange={(e) => handleTypeChange(e.target.value as HealthType)}
        options={typeOptions}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date du soin"
          type="date"
          value={form.date}
          onChange={(e) => handleDateChange(e.target.value)}
          required
        />
        <Input
          label="Prochain rendez-vous"
          type="date"
          value={form.next_date}
          onChange={(e) => setForm({ ...form, next_date: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Vétérinaire / Praticien"
          value={form.vet_name}
          onChange={(e) => setForm({ ...form, vet_name: e.target.value })}
          placeholder="Dr. Martin"
        />
        <Input
          label="Téléphone"
          type="tel"
          value={form.practitioner_phone}
          onChange={(e) => setForm({ ...form, practitioner_phone: e.target.value })}
          placeholder="06 00 00 00 00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(form.type === "vaccin" || form.type === "vermifuge") && (
          <Input
            label="Produit utilisé"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            placeholder="Equip FHV-1, Equest..."
          />
        )}
        <Input
          label="Coût (€)"
          type="number"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
          placeholder="0"
          min="0"
        />
      </div>

      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Observations, lot de vaccin, remarques..."
        rows={3}
      />

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
