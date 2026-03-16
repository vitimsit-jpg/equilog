"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { HealthRecord, HealthType } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
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
  ferrage: 35,
  dentiste: 365,
  osteo: 180,
  veterinaire: null,
  masseuse: 90,
  autre: null,
};

// Vaccin subtypes with their interval in days (règles FFE)
const vaccinSubtypes = [
  { value: "", label: "Sélectionner un vaccin" },
  { value: "Grippe équine", label: "Grippe équine — FFE : 6 mois max", interval: 182 },
  { value: "Rhinopneumonie", label: "Rhinopneumonie (6 mois)", interval: 180 },
  { value: "Grippe + Rhinopneumonie", label: "Grippe + Rhinopneumonie — FFE : 6 mois max", interval: 182 },
  { value: "Tétanos", label: "Tétanos (rappel tous les 2 ans)", interval: 730 },
  { value: "West Nile", label: "West Nile (12 mois)", interval: 365 },
  { value: "EHV / Herpès équin", label: "EHV / Herpès équin (6 mois)", interval: 180 },
  { value: "Autre vaccin", label: "Autre vaccin", interval: null },
];

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<HealthRecord>;
}

function loadPractitioner(type: HealthType): { vet_name: string; practitioner_phone: string } {
  try {
    const stored = localStorage.getItem(`equistra_pract_${type}`);
    return stored ? JSON.parse(stored) : { vet_name: "", practitioner_phone: "" };
  } catch { return { vet_name: "", practitioner_phone: "" }; }
}

function savePractitioner(type: HealthType, vet_name: string, practitioner_phone: string) {
  if (!vet_name) return;
  try { localStorage.setItem(`equistra_pract_${type}`, JSON.stringify({ vet_name, practitioner_phone })); } catch {}
}

export default function HealthEventForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [loading, setLoading] = useState(false);
  const isNew = !defaultValues?.id;

  const initialPract = isNew ? loadPractitioner(defaultValues?.type || "vaccin") : { vet_name: "", practitioner_phone: "" };

  const [form, setForm] = useState({
    type: defaultValues?.type || ("vaccin" as HealthType),
    date: defaultValues?.date || today,
    next_date: defaultValues?.next_date || "",
    vet_name: defaultValues?.vet_name || initialPract.vet_name,
    practitioner_phone: defaultValues?.practitioner_phone || initialPract.practitioner_phone,
    product_name: defaultValues?.product_name || "",
    vaccin_subtype: "",
    cost: defaultValues?.cost ? String(defaultValues.cost) : "",
    notes: defaultValues?.notes || "",
  });

  // Hydrate practitioner from localStorage on mount (client only)
  useEffect(() => {
    if (!isNew) return;
    const pract = loadPractitioner(form.type);
    if (pract.vet_name && !form.vet_name) {
      setForm((prev) => ({ ...prev, vet_name: pract.vet_name, practitioner_phone: pract.practitioner_phone }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = (type: HealthType) => {
    const interval = defaultIntervals[type];
    const nextDate = interval
      ? format(addDays(new Date(form.date), interval), "yyyy-MM-dd")
      : "";
    const pract = isNew ? loadPractitioner(type) : { vet_name: form.vet_name, practitioner_phone: form.practitioner_phone };
    setForm({ ...form, type, next_date: nextDate, vaccin_subtype: "", vet_name: pract.vet_name, practitioner_phone: pract.practitioner_phone });
  };

  const handleVaccinSubtypeChange = (subtype: string) => {
    const found = vaccinSubtypes.find((v) => v.value === subtype);
    const interval = found && "interval" in found ? found.interval : null;
    const nextDate = interval
      ? format(addDays(new Date(form.date), interval), "yyyy-MM-dd")
      : form.next_date;
    setForm({ ...form, vaccin_subtype: subtype, product_name: subtype, next_date: nextDate });
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
      savePractitioner(form.type, form.vet_name, form.practitioner_phone);
      toast.success("Soin enregistré !");
      if (!defaultValues?.id) trackEvent({ event_name: "health_record_created", event_category: "health", properties: { type: form.type } });
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

      {form.type === "vaccin" && (
        <Select
          label="Vaccin"
          value={form.vaccin_subtype}
          onChange={(e) => handleVaccinSubtypeChange(e.target.value)}
          options={vaccinSubtypes}
          placeholder="Sélectionner un vaccin"
        />
      )}

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
