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
import type { BudgetEntry, BudgetCategory, RecurrenceFrequency } from "@/lib/supabase/types";
import { Paperclip, X, RefreshCw } from "lucide-react";

const categoryOptions = Object.entries(BUDGET_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }));

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "weekly",  label: "Toutes les semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "yearly",  label: "Tous les ans" },
];

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<BudgetEntry>;
}

export default function BudgetForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const isNew = !defaultValues?.id;
  const isGeneratedEntry = !!defaultValues?.recurring_template_id;

  const [form, setForm] = useState({
    date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
    category: defaultValues?.category || "pension",
    amount: defaultValues?.amount ? String(defaultValues.amount) : "",
    description: defaultValues?.description || "",
    is_recurring: defaultValues?.is_recurring ?? false,
    recurrence_frequency: defaultValues?.recurrence_frequency ?? ("monthly" as RecurrenceFrequency),
  });

  const [files, setFiles] = useState<File[]>([]);
  const existingUrls: string[] = defaultValues?.media_urls ?? [];

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return existingUrls;
    const urls: string[] = [...existingUrls];
    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${horseId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("budget-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("budget-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setLoading(true);

    const mediaUrls = await uploadFiles();

    const payload = {
      horse_id: horseId,
      date: form.date,
      category: form.category as BudgetCategory,
      amount: parseFloat(form.amount),
      description: form.description || null,
      is_recurring: isNew ? (form.is_recurring || null) : defaultValues?.is_recurring ?? null,
      recurrence_frequency: isNew && form.is_recurring ? form.recurrence_frequency : (defaultValues?.recurrence_frequency ?? null),
      recurring_template_id: defaultValues?.recurring_template_id ?? null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
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
          onChange={(e) => setForm({ ...form, category: e.target.value })}
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

      {/* Récurrence — uniquement sur nouvelle entrée non générée */}
      {isNew && !isGeneratedEntry && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              form.is_recurring
                ? "border-orange bg-orange-light"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RefreshCw className={`h-4 w-4 flex-shrink-0 ${form.is_recurring ? "text-orange" : "text-gray-400"}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${form.is_recurring ? "text-orange" : "text-gray-700"}`}>
                Dépense récurrente
              </p>
              <p className="text-2xs text-gray-400 mt-0.5">
                Enregistrement automatique à chaque échéance
              </p>
            </div>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              form.is_recurring ? "bg-orange border-orange" : "border-gray-300"
            }`}>
              {form.is_recurring && <span className="text-white text-2xs font-bold">✓</span>}
            </div>
          </button>

          {form.is_recurring && (
            <div className="mt-2">
              <Select
                label="Fréquence"
                value={form.recurrence_frequency}
                onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value as RecurrenceFrequency })}
                options={FREQUENCY_OPTIONS}
              />
            </div>
          )}
        </div>
      )}

      {/* Upload fichier (facture, photo) */}
      <div>
        <p className="label mb-1">
          Fichier <span className="font-normal text-gray-300">(facture, photo)</span>
        </p>
        <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange transition-colors">
          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500">
            {files.length > 0
              ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}`
              : existingUrls.length > 0
              ? `${existingUrls.length} fichier${existingUrls.length > 1 ? "s" : ""} existant${existingUrls.length > 1 ? "s" : ""} · ajouter d'autres`
              : "Ajouter une facture ou photo..."}
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
          />
        </label>
        {files.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 text-2xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                <span>{f.name.length > 22 ? f.name.slice(0, 19) + "…" : f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-danger ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {existingUrls.length > 0 && files.length === 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {existingUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-2xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Paperclip className="h-2.5 w-2.5" />
                Fichier {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button type="submit" loading={loading} className="flex-1">
          {defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
