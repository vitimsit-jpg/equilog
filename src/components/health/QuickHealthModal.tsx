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

const DEFAULT_INTERVALS: Record<HealthType, number | null> = {
  vaccin: 180, vermifuge: 90, ferrage: 35, dentiste: 365,
  osteo: 180, veterinaire: null, masseuse: 90, autre: null,
};

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
  const [notes, setNotes] = useState("");

  const effectiveDate = dateOption === "today" ? todayStr : dateOption === "yesterday" ? yesterdayStr : customDate;

  const handleTypeSelect = (type: HealthType) => {
    setSelectedType(type);
    const pract = loadPractitioner(type);
    if (pract.vet_name) setVetName(pract.vet_name);
  };

  const handleSave = async () => {
    if (!selectedType) { toast.error("Sélectionnez un type de soin"); return; }
    setLoading(true);
    const interval = DEFAULT_INTERVALS[selectedType];
    const nextDate = interval ? format(addDays(new Date(effectiveDate), interval), "yyyy-MM-dd") : null;
    const { error } = await supabase.from("health_records").insert({
      horse_id: horseId,
      type: selectedType,
      date: effectiveDate,
      next_date: nextDate,
      vet_name: vetName || null,
      practitioner_phone: null,
      product_name: null,
      cost: null,
      notes: notes || null,
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
    setVetName(""); setNotes("");
  };

  const handleClose = () => { setMode("quick"); reset(); onClose(); };

  const interval = selectedType ? DEFAULT_INTERVALS[selectedType] : null;

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

          {/* Praticien */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Praticien <span className="font-normal normal-case text-gray-300">(optionnel)</span>
            </p>
            <input
              type="text"
              value={vetName}
              onChange={(e) => setVetName(e.target.value)}
              placeholder="Dr. Martin, M. Dupont..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
            />
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
            <button
              type="button"
              onClick={() => setMode("detail")}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Mode détaillé →
            </button>
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
