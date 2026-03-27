"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";
import type { HealthType } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";
import Modal from "@/components/ui/Modal";
import HealthEventForm from "./HealthEventForm";
import Button from "@/components/ui/Button";
import { Paperclip, X } from "lucide-react";

const HEALTH_ITEMS: { type: HealthType; emoji: string; label: string }[] = [
  { type: "vermifuge",   emoji: "📅", label: "Vermifuge" },
  { type: "ferrage",     emoji: "🔨", label: "Parage" },
  { type: "vaccin",      emoji: "💉", label: "Vaccin" },
  { type: "dentiste",    emoji: "🦷", label: "Dentiste" },
  { type: "osteo",       emoji: "🤝", label: "Ostéo" },
  { type: "veterinaire", emoji: "🏥", label: "Vétérinaire" },
  { type: "masseuse",    emoji: "💆", label: "Masseuse" },
  { type: "autre",       emoji: "📋", label: "Autre" },
];

const DEFAULT_INTERVALS: Partial<Record<HealthType, number | null>> = {
  vaccin: 180, vermifuge: 90, ferrage: 35, dentiste: 365,
  osteo: 180, veterinaire: null, masseuse: 90, autre: null,
};

// Types with meaningful extra fields (subtype, urgency) → show "Mode détaillé"
const TYPES_WITH_DETAIL: HealthType[] = ["vaccin", "veterinaire"];

function loadPractitioner(type: HealthType): { vet_name: string } {
  try {
    const stored = localStorage.getItem(`equistra_pract_${type}`);
    return stored ? JSON.parse(stored) : { vet_name: "" };
  } catch { return { vet_name: "" }; }
}

function savePractitioner(type: HealthType, vet_name: string) {
  if (!vet_name) return;
  try { localStorage.setItem(`equistra_pract_${type}`, JSON.stringify({ vet_name, practitioner_phone: "" })); } catch {}
}

type DateOption = "today" | "yesterday" | "custom";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  onSaved: () => void;
  defaultType?: HealthType;
}

export default function QuickHealthModal({ open, onClose, horseId, onSaved, defaultType }: Props) {
  const supabase = createClient();
  const [mode, setMode] = useState<"quick" | "detail">("quick");
  const [loading, setLoading] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(addDays(new Date(), -1), "yyyy-MM-dd");

  const [selectedType, setSelectedType] = useState<HealthType | null>(defaultType || null);
  const [dateOption, setDateOption] = useState<DateOption>("today");
  const [customDate, setCustomDate] = useState(todayStr);
  const [vetName, setVetName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const effectiveDate = dateOption === "today" ? todayStr : dateOption === "yesterday" ? yesterdayStr : customDate;

  const handleTypeSelect = (type: HealthType) => {
    setSelectedType(type);
    const pract = loadPractitioner(type);
    if (pract.vet_name) setVetName(pract.vet_name);
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${horseId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("health-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("health-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSave = async () => {
    if (!selectedType) { toast.error("Sélectionnez un type de soin"); return; }
    setLoading(true);
    const interval = DEFAULT_INTERVALS[selectedType];
    const nextDate = interval ? format(addDays(new Date(effectiveDate), interval), "yyyy-MM-dd") : null;
    const mediaUrls = await uploadFiles();
    const { error } = await supabase.from("health_records").insert({
      horse_id: horseId,
      type: selectedType,
      date: effectiveDate,
      next_date: nextDate,
      vet_name: vetName || null,
      practitioner_phone: null,
      product_name: null,
      cost: cost ? parseFloat(cost) : null,
      notes: notes || null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    });
    if (error) { toast.error("Erreur lors de l'enregistrement"); }
    else {
      if (vetName) savePractitioner(selectedType, vetName);
      toast.success("Soin enregistré !");
      trackEvent({ event_name: "health_record_created", event_category: "health", properties: { type: selectedType, mode: "quick" } });
      reset(); onSaved();
    }
    setLoading(false);
  };

  const reset = () => {
    setSelectedType(defaultType || null);
    setDateOption("today"); setCustomDate(todayStr);
    setVetName(""); setCost(""); setNotes(""); setFiles([]);
  };

  const handleClose = () => { setMode("quick"); reset(); onClose(); };

  const interval = selectedType ? DEFAULT_INTERVALS[selectedType] : null;
  const showDetailLink = selectedType && TYPES_WITH_DETAIL.includes(selectedType);

  return (
    <Modal open={open} onClose={handleClose} title={mode === "detail" ? "Logger un soin — Détails" : "Logger un soin"}>
      {mode === "detail" ? (
        <HealthEventForm
          horseId={horseId}
          onSaved={() => { setMode("quick"); reset(); onSaved(); }}
          onCancel={() => setMode("quick")}
          defaultValues={selectedType ? { type: selectedType, date: effectiveDate } : undefined}
        />
      ) : (
        <div className="space-y-5">

          {/* Type grid */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type de soin</p>
            <div className="grid grid-cols-3 gap-2">
              {HEALTH_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeSelect(item.type)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all min-h-[64px] ${
                    selectedType === item.type
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Date</p>
            <div className="flex gap-2 flex-wrap">
              {(["today", "yesterday", "custom"] as DateOption[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDateOption(opt)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    dateOption === opt
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {opt === "today" ? "Aujourd'hui" : opt === "yesterday" ? "Hier" : "Autre date"}
                </button>
              ))}
            </div>
            {dateOption === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            )}
          </div>

          {/* Praticien + Coût */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Praticien <span className="font-normal normal-case text-gray-300">(optionnel)</span>
              </p>
              <input
                type="text"
                value={vetName}
                onChange={(e) => setVetName(e.target.value)}
                placeholder="Dr. Martin..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Coût <span className="font-normal normal-case text-gray-300">(€, optionnel)</span>
              </p>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
          </div>

          {/* Fichiers */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Fichiers <span className="font-normal normal-case text-gray-300">(photos, factures, comptes rendus)</span>
            </p>
            <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange transition-colors">
              <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500">
                {files.length > 0 ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : "Ajouter des fichiers..."}
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
            <p className="text-2xs text-gray-300 mt-1">🤖 Bientôt : extraction automatique des informations par IA</p>
          </div>

          {/* Notes */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Note <span className="font-normal normal-case text-gray-300">(optionnel)</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, lot de vaccin..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
            />
          </div>

          {/* Auto next-date info */}
          {interval && (
            <p className="text-xs text-gray-400">
              Prochain rendez-vous calculé automatiquement — dans {interval} jours.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {showDetailLink ? (
              <button
                type="button"
                onClick={() => setMode("detail")}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                Champs avancés →
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>Annuler</Button>
              <Button type="button" loading={loading} onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>

        </div>
      )}
    </Modal>
  );
}
