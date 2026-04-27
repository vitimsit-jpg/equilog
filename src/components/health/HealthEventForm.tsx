"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import CareTypeSelector from "./CareTypeSelector";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { HealthRecord, HealthType, HorseIndexMode } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import { awardHealthOrNutritionBadges } from "@/lib/badges/triggers";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { format, addDays } from "date-fns";

// Default intervals in days per type
const defaultIntervals: Partial<Record<HealthType, number | null>> = {
  vaccin: 365,
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

function loadPractitioner(type: HealthType, horseId: string): { vet_name: string; practitioner_phone: string } {
  try {
    const stored = localStorage.getItem(`equistra_pract_${horseId}_${type}`);
    return stored ? JSON.parse(stored) : { vet_name: "", practitioner_phone: "" };
  } catch { return { vet_name: "", practitioner_phone: "" }; }
}

function savePractitioner(type: HealthType, horseId: string, vet_name: string, practitioner_phone: string) {
  if (!vet_name) return;
  try { localStorage.setItem(`equistra_pract_${horseId}_${type}`, JSON.stringify({ vet_name, practitioner_phone })); } catch {}
}

export default function HealthEventForm({ horseId, onSaved, onCancel, defaultValues, horseMode }: Props) {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [loading, setLoading] = useState(false);
  const isNew = !defaultValues?.id;

  const initialPract = isNew ? loadPractitioner(defaultValues?.type || "vaccin", horseId) : { vet_name: "", practitioner_phone: "" };

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
  const [addToBudget, setAddToBudget] = useState(true);

  // Bug #2 Agathe : hydrate praticien depuis DB (source de vérité, pas localStorage)
  useEffect(() => {
    if (!isNew) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("health_records")
        .select("vet_name, practitioner_phone")
        .eq("horse_id", horseId)
        .eq("type", form.type)
        .not("vet_name", "is", null)
        .order("date", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const latest = data?.[0];
      if (latest?.vet_name) {
        setForm((prev) => prev.vet_name ? prev : {
          ...prev,
          vet_name: latest.vet_name || "",
          practitioner_phone: latest.practitioner_phone || "",
        });
      } else {
        // Fallback localStorage (rétrocompat)
        const pract = loadPractitioner(form.type, horseId);
        if (pract.vet_name) {
          setForm((prev) => prev.vet_name ? prev : { ...prev, vet_name: pract.vet_name, practitioner_phone: pract.practitioner_phone });
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard contre race conditions : ignore les réponses obsolètes si user change de type entre-temps
  const latestTypeRef = useRef<HealthType>(form.type);

  const handleTypeChange = (type: HealthType) => {
    latestTypeRef.current = type;
    const interval = defaultIntervals[type];
    const nextDate = interval
      ? format(addDays(new Date(form.date), interval), "yyyy-MM-dd")
      : "";
    setForm((prev) => ({ ...prev, type, next_date: nextDate, vaccin_subtype: vaccinSubtypes[0].value }));

    if (!isNew) return;
    // Bug #2 Agathe : fetch praticien depuis DB pour le nouveau type (fire-and-forget + guard)
    void (async () => {
      const { data } = await supabase
        .from("health_records")
        .select("vet_name, practitioner_phone")
        .eq("horse_id", horseId)
        .eq("type", type)
        .not("vet_name", "is", null)
        .order("date", { ascending: false })
        .limit(1);
      if (latestTypeRef.current !== type) return; // stale response
      const latest = data?.[0];
      if (latest?.vet_name) {
        setForm((prev) => ({ ...prev, vet_name: latest.vet_name || "", practitioner_phone: latest.practitioner_phone || "" }));
      } else {
        const pract = loadPractitioner(type, horseId);
        setForm((prev) => ({ ...prev, vet_name: pract.vet_name, practitioner_phone: pract.practitioner_phone }));
      }
    })();
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

    // Bug #6 Agathe : upsert health_record puis upsert budget_entry lié
    let healthId = defaultValues?.id || null;
    let err;
    if (defaultValues?.id) {
      const res = await supabase.from("health_records").update(payload).eq("id", defaultValues.id);
      err = res.error;
    } else {
      const res = await supabase.from("health_records").insert(payload).select("id").single();
      err = res.error;
      if (res.data?.id) healthId = res.data.id;
    }

    if (err || !healthId) {
      console.error("[HealthEvent] INSERT/UPDATE failed:", err);
      toast.error(`Erreur : ${err?.message || "ID soin introuvable"}`);
      setLoading(false);
      return;
    }

    savePractitioner(form.type, horseId, form.vet_name, form.practitioner_phone);

    // Bug #6 Agathe : liaison automatique soin → budget (create + update)
    if (healthId) {
      const categoryMap: Record<string, string> = {
        veterinaire: "soins", vaccin: "soins", osteo: "soins",
        dentiste: "soins", masseuse: "soins", ferrage: "maréchalerie",
      };
      const budgetPayload = {
        horse_id: horseId,
        date: payload.date,
        category: (categoryMap[form.type] || "soins") as "soins" | "maréchalerie",
        amount: payload.cost ?? 0,
        description: [HEALTH_TYPE_LABELS[form.type], form.vet_name].filter(Boolean).join(" — ") || null,
        linked_health_record_id: healthId,
      };

      // Chercher une ligne budget existante liée à ce soin
      const { data: existing } = await supabase
        .from("budget_entries")
        .select("id")
        .eq("linked_health_record_id", healthId)
        .limit(1);

      if (addToBudget && payload.cost && payload.cost > 0) {
        if (existing && existing.length > 0) {
          // Mettre à jour la ligne existante
          await supabase.from("budget_entries").update(budgetPayload).eq("id", existing[0].id);
        } else {
          // Créer une nouvelle ligne
          await supabase.from("budget_entries").insert(budgetPayload);
        }
      } else if (existing && existing.length > 0) {
        // Cost vidé ou checkbox décochée → supprimer la ligne budget
        await supabase.from("budget_entries").delete().eq("id", existing[0].id);
      }
    }

    toast.success("Soin enregistré !");
    if (!defaultValues?.id) {
      trackEvent({ event_name: "health_record_created", event_category: "health", properties: { type: form.type } });
      await awardHealthOrNutritionBadges(supabase, horseId);
    }
    onSaved();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CareTypeSelector
        selectedType={form.type}
        onChange={handleTypeChange}
        horseMode={horseMode}
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

      {/* P3-12 — Avertissement parage poulain (ICr) */}
      {horseMode === "ICr" && form.type === "ferrage" && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-base flex-shrink-0">🐣</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Poulain</span> — premier parage recommandé à partir de 6–8 mois.
            Consultez votre maréchal avant toute intervention.
          </p>
        </div>
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

      {form.cost && parseFloat(form.cost) > 0 && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={addToBudget}
            onChange={(e) => setAddToBudget(e.target.checked)}
            className="w-4 h-4 rounded accent-orange"
          />
          <span className="text-sm text-gray-700">
            Ajouter <strong>{form.cost} €</strong> au budget (Soins vét.)
          </span>
        </label>
      )}

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
