"use client";

import { useState, useRef } from "react";
import { X, Loader2, Check, AlertTriangle, FileText, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { HISTORY_CATEGORY_CONFIG } from "./HistoriqueTimeline";

interface ExtractedEvent {
  category: string;
  title: string;
  description: string;
  date_precision: string;
  event_date?: string;
  event_month?: number;
  event_year?: number;
  vet_name?: string;
  clinic?: string;
  outcome?: string;
  severity?: string;
  confidence: Record<string, number>;
}

interface Props {
  open: boolean;
  horseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function DocumentExtractModal({ open, horseId, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "extracting" | "review" | "saving">("upload");
  const [extracted, setExtracted] = useState<ExtractedEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!open) return null;

  const handleFile = (f: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setStep("extracting");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("horseId", horseId);

    try {
      const res = await fetch("/api/history-extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setExtracted(data.events || []);
      setSelected(new Set(data.events.map((_: ExtractedEvent, i: number) => i)));
      setStep("review");
    } catch {
      toast.error("Extraction échouée. Ajoutez les événements manuellement.");
      setStep("upload");
    }
  };

  const handleSave = async () => {
    setStep("saving");
    const toSave = extracted.filter((_, i) => selected.has(i));

    try {
      const res = await fetch("/api/history-extract/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId, events: toSave }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${toSave.length} événement${toSave.length > 1 ? "s" : ""} importé${toSave.length > 1 ? "s" : ""}`);
      onSaved();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
      setStep("review");
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const getConfidenceColor = (val: number) => {
    if (val >= 0.8) return "text-green-600";
    if (val >= 0.5) return "text-orange";
    return "text-red-500";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-black">Import document IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ordonnance, résultat d&apos;analyse, compte-rendu vétérinaire...</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Step: upload */}
          {(step === "upload") && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-orange hover:bg-orange-light/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Déposez votre document ici</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10 Mo</p>
                </div>
                {file && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl">
                    <FileText className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">{file.name}</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-light rounded-xl border border-orange/10">
                <AlertTriangle className="h-3.5 w-3.5 text-orange flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  L&apos;IA analyse le document et extrait les événements médicaux. Vous pourrez vérifier et corriger avant d&apos;enregistrer.
                </p>
              </div>
            </div>
          )}

          {/* Step: extracting */}
          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-light flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-orange animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-black">Analyse en cours...</p>
                <p className="text-xs text-gray-400 mt-1">L&apos;IA lit votre document et identifie les événements médicaux.</p>
              </div>
            </div>
          )}

          {/* Step: review */}
          {step === "review" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {extracted.length} événement{extracted.length > 1 ? "s" : ""} détecté{extracted.length > 1 ? "s" : ""}.
                Cochez ceux à importer.
              </p>

              {extracted.map((ev, i) => {
                const cfg = HISTORY_CATEGORY_CONFIG[ev.category as keyof typeof HISTORY_CATEGORY_CONFIG];
                const avgConf = Object.values(ev.confidence).reduce((s, v) => s + v, 0) / Math.max(Object.values(ev.confidence).length, 1);
                const isSelected = selected.has(i);

                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`card cursor-pointer transition-all ${isSelected ? "border-black" : "opacity-60"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? "bg-black" : "border-2 border-gray-200"}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{cfg?.emoji || "📋"}</span>
                            <span className="text-xs font-bold text-black">{cfg?.label || ev.category}</span>
                          </div>
                          <span className={`text-2xs font-bold ${getConfidenceColor(avgConf)}`}>
                            {avgConf < 0.8 && "⚠ "}
                            {Math.round(avgConf * 100)}% confiance
                          </span>
                        </div>
                        {ev.title && <p className="text-sm font-semibold text-gray-800 mt-1">{ev.title}</p>}
                        {ev.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.description}</p>}
                        <div className="flex flex-wrap gap-x-3 mt-1.5">
                          {ev.vet_name && <span className="text-2xs text-gray-400">👨‍⚕️ {ev.vet_name}</span>}
                          {ev.event_year && <span className="text-2xs text-gray-400">📅 {ev.event_year}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {extracted.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Aucun événement détecté dans ce document.</p>
                  <p className="text-xs text-gray-300 mt-1">Essayez un document plus lisible ou ajoutez manuellement.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          {step === "upload" && (
            <button
              onClick={handleExtract}
              disabled={!file}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              Analyser avec l&apos;IA
            </button>
          )}
          {step === "review" && (
            <button
              onClick={handleSave}
              disabled={selected.size === 0}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              Importer {selected.size} événement{selected.size > 1 ? "s" : ""}
            </button>
          )}
          {step === "saving" && (
            <button disabled className="w-full btn-primary py-3 opacity-50 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
