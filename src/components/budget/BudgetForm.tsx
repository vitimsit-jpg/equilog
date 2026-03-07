"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { BUDGET_CATEGORY_LABELS } from "@/lib/utils";
import type { BudgetEntry } from "@/lib/supabase/types";

const categoryOptions = Object.entries(BUDGET_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<BudgetEntry>;
}

export default function BudgetForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
    category: defaultValues?.category || "pension",
    amount: defaultValues?.amount ? String(defaultValues.amount) : "",
    description: defaultValues?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setLoading(true);

    const payload = {
      horse_id: horseId,
      date: form.date,
      category: form.category as any,
      amount: parseFloat(form.amount),
      description: form.description || null,
    };

    const { error } = defaultValues?.id
      ? await supabase.from("budget_entries").update(payload).eq("id", defaultValues.id)
      : await supabase.from("budget_entries").insert(payload);

    if (error) toast.error("Erreur lors de l'enregistrement");
    else { toast.success("Dépense enregistrée !"); onSaved(); }
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
        <Select
          label="Catégorie"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as import("@/lib/supabase/types").BudgetCategory })}
          options={categoryOptions}
        />
      </div>

      <Input
        label="Montant (€)"
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        placeholder="0.00"
        min="0"
        step="0.01"
        required
      />

      <Input
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Détail de la dépense..."
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
