"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { HealthRecord, HealthType, HorseIndexMode } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { format, addDays } from "date-fns";

const STANDARD_TYPES: HealthType[] = ["vaccin", "vermifuge", "dentiste", "osteo", "ferrage", "veterinaire", "masseuse", "autre"];
const IS_THERAPEUTIC_TYPES: HealthType[] = ["acupuncture", "physio_laser", "physio_ultrasons", "physio_tens", "pemf", "infrarouge", "cryotherapie", "thermotherapie", "pressotherapie", "ems", "bandes_repos", "etirements_passifs", "infiltrations", "mesotherapie"];
const IR_EXTRA_TYPES: HealthType[] = ["balneotherapie", "water_treadmill", "tapis_marcheur", "ondes_choc"];

function getTypeOptions(horseMode?: HorseIndexMode | null) {
  const types: HealthType[] = [...STANDARD_TYPES];
  if (horseMode === "IS" || horseMode === "IR") types.push(...IS_THERAPEUTIC_TYPES);
  if (horseMode === "IR") types.push(...IR_EXTRA_TYPES);
  return types.map((value) => ({ value, label: HEALTH_TYPE_LABELS[value] ?? value }));
}

// Default intervals in days per type
const defaultIntervals: Partial<Record<HealthType, number | null>> = {
  vaccin: 180,
  vermifuge: 90,
  ferrage: 35,
  dentiste: 365,
  osteo: 180,
  veterinaire: null,
  masseuse: 90,
  autre: null,
  // Thérapeutiques — pas d'intervalle prédéfini
  acupuncture: null, physio_laser: null, physio_ultrasons: null, physio_tens: null,
  pemf: null, infrarouge: null, cryotherapie: null, thermotherapie: null,
  pressotherapie: null, ems: null, bandes_repos: null, etirements_passifs: null,
  infiltrations: null, mesotherapie: null,
  balneotherapie: null, water_treadmill: null, tapis_marcheur: null, ondes_choc: null,
};

// Vaccin subtypes with their interval in days (règles FFE)
const vaccinSubtypes = [
  { value: "Grippe équine", label: "Grippe équine (1 an)", interval: 365 },
  { value: "Rhinopneumonie", label: "Rhinopneumonie (1 an)", interval: 365 },
  { value: "Grippe + Rhinopneumonie", label: "Grippe + Rhinopneumonie (1 an)", interval: 365 },
];

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<HealthRecord>;
  horseMode?: HorseIndexMode | null;
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

export default function HealthEventForm({ horseId, onSaved, onCancel, defaultValues, horseMode }: Props) {
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
    vaccin_subtype: defaultValues?.product_name && vaccinSubtypes.find(v => v.value === defaultValues.product_name) ? defaultValues.product_name : vaccinSubtypes[0].value,
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
    setForm({ ...form, type, next_date: nextDate, vaccin_subtype: vaccinSubtypes[0].value, vet_name: pract.vet_name, practitioner_phone: pract.practitioner_phone });
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
      date: form.date || today,
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
      // #38 — Sync coût soin → budget (création uniquement, pas modification)
      if (!defaultValues?.id && payload.cost && payload.cost > 0) {
        const desc = [HEALTH_TYPE_LABELS[form.type], form.vet_name].filter(Boolean).join(" — ");
        await supabase.from("budget_entries").insert({
          horse_id: horseId,
          date: payload.date,
          category: "soins",
          amount: payload.cost,
          description: desc || null,
        });
      }
      toast.success("Soin enregistré !");
      if (!defaultValues?.id) trackEvent({ event_name: "health_record_created", event_category: "health", properties: { type: form.type } });
      onSaved();
    }
    setLoading(false);
  };

  const typeOptions = getTypeOptions(horseMode);

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

      <div className={`grid gap-4 ${form.type === "veterinaire" ? "grid-cols-1" : "grid-cols-2"}`}>
        <Input
          label="Date du soin"
          type="date"
          value={form.date}
          onChange={(e) => handleDateChange(e.target.value)}
          required={form.type !== "veterinaire"}
        />
        {form.type !== "veterinaire" && (
          <Input
            label="Prochain rendez-vous"
            type="date"
            value={form.next_date}
            onChange={(e) => setForm({ ...form, next_date: e.target.value })}
          />
        )}
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
