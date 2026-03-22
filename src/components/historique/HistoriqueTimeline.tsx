"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, FileText } from "lucide-react";
import type { HorseHistoryEvent, HistoryCategory } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export const HISTORY_CATEGORY_CONFIG: Record<HistoryCategory, { label: string; emoji: string; color: string }> = {
  boiterie:            { label: "Boiterie",           emoji: "🦵", color: "bg-red-50 border-red-200 text-red-700" },
  ulcere:              { label: "Ulcère",              emoji: "🔴", color: "bg-red-50 border-red-200 text-red-700" },
  colique:             { label: "Colique",             emoji: "⚡", color: "bg-orange-light border-orange/20 text-orange" },
  operation:           { label: "Opération",           emoji: "🏥", color: "bg-red-50 border-red-200 text-red-700" },
  vaccination:         { label: "Vaccination",         emoji: "💉", color: "bg-blue-50 border-blue-200 text-blue-700" },
  bilan_sanguin:       { label: "Bilan sanguin",       emoji: "🩸", color: "bg-blue-50 border-blue-200 text-blue-700" },
  soins_dentaires:     { label: "Soins dentaires",     emoji: "🦷", color: "bg-green-50 border-green-200 text-green-700" },
  osteo:               { label: "Ostéopathie",         emoji: "🤲", color: "bg-green-50 border-green-200 text-green-700" },
  radio:               { label: "Radiographie",        emoji: "🩻", color: "bg-blue-50 border-blue-200 text-blue-700" },
  physio:              { label: "Physiothérapie",      emoji: "💪", color: "bg-green-50 border-green-200 text-green-700" },
  traitement_long_terme: { label: "Traitement long terme", emoji: "💊", color: "bg-orange-light border-orange/20 text-orange" },
  autre:               { label: "Autre",               emoji: "📋", color: "bg-gray-50 border-gray-200 text-gray-600" },
};

const OUTCOME_LABELS: Record<string, string> = {
  gueri:    "Guéri ✓",
  chronique: "Chronique",
  suivi:    "Suivi en cours",
  inconnu:  "Issue inconnue",
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  leger:   { label: "Léger",   color: "text-green-600 bg-green-50" },
  modere:  { label: "Modéré",  color: "text-orange bg-orange-light" },
  severe:  { label: "Sévère",  color: "text-red-600 bg-red-50" },
};

function formatEventDate(event: HorseHistoryEvent): string {
  if (event.date_precision === "exact" && event.event_date) {
    return new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  if (event.date_precision === "mois" && event.event_month && event.event_year) {
    const d = new Date(event.event_year, event.event_month - 1);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  if (event.date_precision === "annee" && event.event_year) {
    return String(event.event_year);
  }
  return "Date inconnue";
}

function getEventYear(event: HorseHistoryEvent): number {
  if (event.event_date) return new Date(event.event_date).getFullYear();
  if (event.event_year) return event.event_year;
  return 0;
}

interface Props {
  events: HorseHistoryEvent[];
  onEdit: (event: HorseHistoryEvent) => void;
}

export default function HistoriqueTimeline({ events, onEdit }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState<string | null>(null);

  const sorted = [...events].sort((a, b) => getEventYear(b) - getEventYear(a));

  // Group by year
  const byYear: Record<string, HorseHistoryEvent[]> = {};
  for (const ev of sorted) {
    const yr = getEventYear(ev) || "Inconnue";
    const key = String(yr);
    if (!byYear[key]) byYear[key] = [];
    byYear[key].push(ev);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeleting(id);
    const { error } = await supabase.from("horse_history_events").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Événement supprimé");
      router.refresh();
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">📜</div>
        <p className="text-sm font-semibold text-gray-400">Aucun événement enregistré</p>
        <p className="text-xs text-gray-300 mt-1">Ajoutez les antécédents médicaux importants de votre cheval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(byYear).map(([year, yearEvents]) => (
        <div key={year}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-bold text-gray-400 px-2">
              {year === "0" ? "Année inconnue" : year}
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="space-y-2">
            {yearEvents.map((ev) => {
              const cfg = HISTORY_CATEGORY_CONFIG[ev.category];
              return (
                <div key={ev.id} className="card">
                  <div className="flex items-start gap-3">
                    {/* Emoji + badge */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                      {cfg.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {ev.severity && (
                            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_LABELS[ev.severity].color}`}>
                              {SEVERITY_LABELS[ev.severity].label}
                            </span>
                          )}
                          {ev.extracted_by_ai && (
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                              IA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* media_urls (new) — show one button per file */}
                          {ev.media_urls && ev.media_urls.length > 0 && ev.media_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors" title={`Fichier ${i + 1}`}>
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          ))}
                          {/* document_url legacy fallback */}
                          {!ev.media_urls?.length && ev.document_url && (
                            <a href={ev.document_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors">
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => onEdit(ev)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            disabled={deleting === ev.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {ev.title && (
                        <p className="text-sm font-semibold text-black mt-1">{ev.title}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatEventDate(ev)}</p>

                      {ev.description && (
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{ev.description}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {ev.vet_name && (
                          <span className="text-2xs text-gray-400">👨‍⚕️ {ev.vet_name}</span>
                        )}
                        {ev.clinic && (
                          <span className="text-2xs text-gray-400">🏥 {ev.clinic}</span>
                        )}
                        {ev.outcome && (
                          <span className="text-2xs text-gray-500 font-medium">{OUTCOME_LABELS[ev.outcome]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
