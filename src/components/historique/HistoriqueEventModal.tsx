"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertTriangle, Paperclip } from "lucide-react";
import type { HorseHistoryEvent, HistoryCategory, DatePrecision } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { HISTORY_CATEGORY_CONFIG } from "./HistoriqueTimeline";

const CATEGORIES: HistoryCategory[] = [
  "boiterie", "ulcere", "colique", "operation", "vaccination",
  "bilan_sanguin", "soins_dentaires", "osteo", "radio",
  "physio", "traitement_long_terme", "autre",
];

interface Props {
  open: boolean;
  horseId: string;
  event?: HorseHistoryEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function HistoriqueEventModal({ open, horseId, event, onClose, onSaved }: Props) {
  const supabase = createClient();

  const [category, setCategory] = useState<HistoryCategory>("autre");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datePrecision, setDatePrecision] = useState<DatePrecision>("exact");
  const [eventDate, setEventDate] = useState("");
  const [eventMonth, setEventMonth] = useState("");
  const [eventYear, setEventYear] = useState("");
  const [vetName, setVetName] = useState("");
  const [clinic, setClinic] = useState("");
  const [outcome, setOutcome] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (event) {
      setCategory(event.category);
      setTitle(event.title || "");
      setDescription(event.description || "");
      setDatePrecision(event.date_precision);
      setEventDate(event.event_date || "");
      setEventMonth(event.event_month ? String(event.event_month) : "");
      setEventYear(event.event_year ? String(event.event_year) : "");
      setVetName(event.vet_name || "");
      setClinic(event.clinic || "");
      setOutcome(event.outcome || "");
      setSeverity(event.severity || "");
      setNotes(event.notes || "");
    } else {
      setCategory("autre");
      setTitle("");
      setDescription("");
      setDatePrecision("exact");
      setEventDate(new Date().toISOString().split("T")[0]);
      setEventMonth("");
      setEventYear("");
      setVetName("");
      setClinic("");
      setOutcome("");
      setSeverity("");
      setNotes("");
      setFiles([]);
    }
  }, [event, open]);

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return event?.media_urls ?? [];
    const existing = event?.media_urls ?? [];
    const urls: string[] = [...existing];
    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `history/${horseId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("health-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("health-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  if (!open) return null;

  const handleSave = async () => {
    if (!category) return;
    setSaving(true);

    const payload: Partial<HorseHistoryEvent> & { horse_id: string } = {
      horse_id: horseId,
      category,
      title: title || null,
      description: description || null,
      date_precision: datePrecision,
      event_date: datePrecision === "exact" && eventDate ? eventDate : null,
      event_month: datePrecision === "mois" && eventMonth ? parseInt(eventMonth) : null,
      event_year: (datePrecision === "mois" || datePrecision === "annee") && eventYear ? parseInt(eventYear) : null,
      vet_name: vetName || null,
      clinic: clinic || null,
      outcome: (outcome as HorseHistoryEvent["outcome"]) || null,
      severity: (severity as HorseHistoryEvent["severity"]) || null,
      notes: notes || null,
    };

    const mediaUrls = await uploadFiles();
    if (mediaUrls.length > 0) payload.media_urls = mediaUrls;

    let error;
    if (event) {
      ({ error } = await supabase.from("horse_history_events").update(payload).eq("id", event.id));
    } else {
      ({ error } = await supabase.from("horse_history_events").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement");
    } else {
      toast.success(event ? "Événement modifié" : "Événement ajouté");
      onSaved();
    }
  };

  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-black">{event ? "Modifier l'événement" : "Ajouter un antécédent"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Category grid */}
          <div>
            <p className="label mb-2">Catégorie</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const cfg = HISTORY_CATEGORY_CONFIG[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      category === cat
                        ? "border-black bg-black text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    <span className="leading-tight text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Titre (optionnel)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex : ${HISTORY_CATEGORY_CONFIG[category].label} — patte avant gauche`}
              className="input mt-1"
            />
          </div>

          {/* Date precision */}
          <div>
            <label className="label mb-2">Précision de la date</label>
            <div className="flex gap-1.5 flex-wrap">
              {(["exact","mois","annee","inconnue"] as DatePrecision[]).map((p) => {
                const labels = { exact: "Date exacte", mois: "Mois/Année", annee: "Année", inconnue: "Inconnue" };
                return (
                  <button
                    key={p}
                    onClick={() => setDatePrecision(p)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      datePrecision === p ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>

            {datePrecision === "exact" && (
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input mt-2" />
            )}
            {datePrecision === "mois" && (
              <div className="flex gap-2 mt-2">
                <select value={eventMonth} onChange={(e) => setEventMonth(e.target.value)} className="input flex-1">
                  <option value="">Mois</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={eventYear} onChange={(e) => setEventYear(e.target.value)} placeholder="Année" className="input w-28" min="1990" max="2030" />
              </div>
            )}
            {datePrecision === "annee" && (
              <input type="number" value={eventYear} onChange={(e) => setEventYear(e.target.value)} placeholder="Année (ex : 2021)" className="input mt-2" min="1990" max="2030" />
            )}
            {datePrecision === "inconnue" && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-gray-50 rounded-xl">
                <AlertTriangle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500">La date sera affichée comme « Avant Equistra »</p>
              </div>
            )}
          </div>

          {/* Severity + Outcome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5">Sévérité</label>
              <div className="flex flex-col gap-1">
                {[{v:"", l:"—"},{v:"leger",l:"Léger"},{v:"modere",l:"Modéré"},{v:"severe",l:"Sévère"}].map(({v,l}) => (
                  <button key={v} onClick={() => setSeverity(v)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border text-left transition-all ${severity === v ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label mb-1.5">Issue</label>
              <div className="flex flex-col gap-1">
                {[{v:"",l:"—"},{v:"gueri",l:"Guéri"},{v:"chronique",l:"Chronique"},{v:"suivi",l:"Suivi"},{v:"inconnu",l:"Inconnue"}].map(({v,l}) => (
                  <button key={v} onClick={() => setOutcome(v)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border text-left transition-all ${outcome === v ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les symptômes, le traitement, l'évolution..."
              className="input mt-1 min-h-[80px] resize-none"
            />
          </div>

          {/* Praticien */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vétérinaire</label>
              <input type="text" value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Nom du vétérinaire" className="input mt-1" />
            </div>
            <div>
              <label className="label">Clinique / Cabinet</label>
              <input type="text" value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Nom de la clinique" className="input mt-1" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes libres</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
              className="input mt-1 min-h-[60px] resize-none"
            />
          </div>

          {/* Fichiers */}
          <div>
            <label className="label mb-1">
              Fichiers <span className="font-normal text-gray-300">(radios, comptes rendus, photos)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition-colors">
              <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500">
                {files.length > 0
                  ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}`
                  : event?.media_urls?.length
                  ? `${event.media_urls.length} fichier${event.media_urls.length > 1 ? "s" : ""} existant${event.media_urls.length > 1 ? "s" : ""} · ajouter d'autres`
                  : "Ajouter des fichiers..."}
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
                      className="text-gray-400 hover:text-red-500 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {event?.media_urls && event.media_urls.length > 0 && files.length === 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {event.media_urls.map((url, i) => (
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
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !category}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {event ? "Modifier" : "Ajouter l'antécédent"}
          </button>
        </div>
      </div>
    </div>
  );
}
