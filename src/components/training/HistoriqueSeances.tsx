"use client";

import { useState, useMemo } from "react";
import type { TrainingSession } from "@/lib/supabase/types";
import { formatDate, TRAINING_TYPE_LABELS } from "@/lib/utils";
import { Dumbbell, Edit2, Trash2, ChevronDown, Filter, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import EmptyState from "@/components/ui/EmptyState";
import MediaGallery from "@/components/media/MediaGallery";
import SwipeToDelete from "@/components/ui/SwipeToDelete";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

type DateRange = "7j" | "30j" | "90j" | "6m" | "1an" | "tout";
type IntensityFilter = "all" | "leger" | "modere" | "intense";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "6m", label: "6 mois" },
  { value: "1an", label: "1 an" },
  { value: "tout", label: "Tout" },
];

const INTENSITY_OPTIONS: { value: IntensityFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "leger", label: "Légère (1-2)" },
  { value: "modere", label: "Modérée (3)" },
  { value: "intense", label: "Intense (4-5)" },
];

function getDateCutoff(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "7j": return subDays(now, 7);
    case "30j": return subDays(now, 30);
    case "90j": return subDays(now, 90);
    case "6m": return subMonths(now, 6);
    case "1an": return subMonths(now, 12);
    case "tout": return null;
  }
}

interface Props {
  sessions: TrainingSession[];
  horseId: string;
}

const PAGE_SIZE = 20;

export default function HistoriqueSeances({ sessions, horseId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [editSession, setEditSession] = useState<TrainingSession | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("90j");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>("all");
  const [page, setPage] = useState(1);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette séance ?")) return;
    const { error } = await supabase.from("training_sessions").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Séance supprimée"); router.refresh(); }
  };

  const allTypes = useMemo(() => {
    const types = new Set(sessions.map((s) => s.type));
    return Array.from(types);
  }, [sessions]);

  const filtered = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    return sessions.filter((s) => {
      if (cutoff && new Date(s.date) < cutoff) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (intensityFilter === "leger" && s.intensity > 2) return false;
      if (intensityFilter === "modere" && s.intensity !== 3) return false;
      if (intensityFilter === "intense" && s.intensity < 4) return false;
      return true;
    });
  }, [sessions, dateRange, typeFilter, intensityFilter]);

  // Paginate by sessions (20/page), then group visible sessions by month
  const visibleSessions = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visibleSessions.length < filtered.length;

  const grouped = useMemo(() => {
    const map: Record<string, TrainingSession[]> = {};
    for (const s of visibleSessions) {
      const key = format(new Date(s.date), "MMMM yyyy", { locale: fr });
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [visibleSessions]);

  const groupedEntries = Object.entries(grouped);

  // Stats for filtered period
  const totalMin = filtered.reduce((acc, s) => acc + s.duration_min, 0);
  const avgIntensity = filtered.length
    ? (filtered.reduce((acc, s) => acc + s.intensity, 0) / filtered.length).toFixed(1)
    : null;
  const avgFeeling = filtered.length
    ? (filtered.reduce((acc, s) => acc + s.feeling, 0) / filtered.length).toFixed(1)
    : null;

  const activeFilters = (typeFilter !== "all" ? 1 : 0) + (intensityFilter !== "all" ? 1 : 0);

  if (sessions.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Dumbbell}
          title="Aucune séance enregistrée"
          description="Suivez chaque sortie : type de travail, intensité, ressenti et objectifs."
          steps={[
            { label: "Enregistrer une première séance" },
            { label: "Suivre l'intensité & le ressenti" },
            { label: "Analyser la progression sur 30 jours" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card">
        {/* Date range tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-3">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setDateRange(opt.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${dateRange === opt.value ? "bg-black text-white" : "text-gray-500 hover:text-black hover:bg-gray-100"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${showFilters || activeFilters > 0 ? "bg-orange-light text-orange" : "text-gray-400 hover:text-black hover:bg-gray-100"}`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtres
          {activeFilters > 0 && <span className="bg-orange text-white text-2xs font-bold px-1 py-0.5 rounded-full">{activeFilters}</span>}
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div className="mt-3 space-y-3 pt-3 border-t border-gray-50">
            <div>
              <p className="text-2xs font-bold uppercase text-gray-400 mb-1.5">Type de travail</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${typeFilter === "all" ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  Tous
                </button>
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${typeFilter === t ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {TRAINING_TYPE_LABELS[t] || t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-gray-400 mb-1.5">Intensité</p>
              <div className="flex flex-wrap gap-1.5">
                {INTENSITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setIntensityFilter(o.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${intensityFilter === o.value ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {(typeFilter !== "all" || intensityFilter !== "all") && (
              <button
                onClick={() => { setTypeFilter("all"); setIntensityFilter("all"); }}
                className="text-xs text-gray-400 hover:text-danger underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats for period */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <span className="text-2xl font-black text-black">{filtered.length}</span>
            <span className="text-2xs text-gray-400">séances</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-black text-black">
              {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h` : `${totalMin}m`}
            </span>
            <span className="text-2xs text-gray-400">total</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-black text-black">{avgIntensity ?? "—"}</span>
            <span className="text-2xs text-gray-400">intensité moy.</span>
          </div>
        </div>
      )}

      {/* Sessions grouped by month */}
      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-gray-400">Aucune séance sur cette période</p>
          <button onClick={() => { setDateRange("tout"); setTypeFilter("all"); setIntensityFilter("all"); }} className="text-xs text-orange hover:underline mt-1">
            Voir tout l&apos;historique
          </button>
        </div>
      ) : (
        <>
          {groupedEntries.map(([month, monthSessions]) => (
            <div key={month} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-black text-sm capitalize">{month}</h3>
                <span className="text-2xs text-gray-400">
                  {monthSessions.length} séance{monthSessions.length !== 1 ? "s" : ""}
                  {" · "}
                  {monthSessions.reduce((acc, s) => acc + s.duration_min, 0) >= 60
                    ? `${Math.floor(monthSessions.reduce((acc, s) => acc + s.duration_min, 0) / 60)}h${monthSessions.reduce((acc, s) => acc + s.duration_min, 0) % 60 > 0 ? `${monthSessions.reduce((acc, s) => acc + s.duration_min, 0) % 60}min` : ""}`
                    : `${monthSessions.reduce((acc, s) => acc + s.duration_min, 0)}min`}
                </span>
              </div>
              <div className="space-y-2">
                {monthSessions.map((s) => (
                  <SwipeToDelete key={s.id} onDelete={() => handleDelete(s.id)}>
                  <div className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-black">{TRAINING_TYPE_LABELS[s.type] || s.type}</span>
                            <span className="text-xs text-gray-400">{s.duration_min}min</span>
                            {s.lieu && <span className="text-xs text-gray-400">· {s.lieu}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDate(s.date)}</span>
                            {s.coach_present && (
                              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "#6B8CAE22", color: "#6B8CAE" }}>Coach</span>
                            )}
                            {s.linked_competition_id && (
                              <span className="flex items-center gap-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded bg-orange-light text-orange">
                                <Link2 className="h-2.5 w-2.5" /> Concours
                              </span>
                            )}
                            {s.objectif && (
                              <span className="text-xs text-gray-500 italic truncate max-w-[140px]">— {s.objectif}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`w-1.5 h-4 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-200"}`} />
                          ))}
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`w-1.5 h-4 rounded-full ${i < s.feeling ? "bg-success" : "bg-gray-200"}`} />
                          ))}
                        </div>
                        <button onClick={() => setEditSession(s)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {s.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 ml-11 italic">{s.notes}</p>
                    )}
                    <div className="mt-2 ml-11">
                      <MediaGallery
                        entityType="training"
                        entityId={s.id}
                        horseId={horseId}
                        initialMediaUrls={s.media_urls ?? []}
                      />
                    </div>
                  </div>
                  </SwipeToDelete>
                ))}
              </div>
            </div>
          ))}

          {hasMore ? (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 text-sm font-semibold text-gray-400 hover:text-black bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Voir {Math.min(PAGE_SIZE, filtered.length - visibleSessions.length)} séances de plus
            </button>
          ) : filtered.length > 0 && (
            <p className="text-center text-2xs text-gray-300 py-2">
              Toutes les séances sont affichées · {filtered.length} séance{filtered.length !== 1 ? "s" : ""} au total
            </p>
          )}
        </>
      )}

      {editSession && (
        <Modal open={true} onClose={() => setEditSession(null)} title="Modifier la séance">
          <TrainingForm
            horseId={horseId}
            defaultValues={editSession}
            onSaved={() => { setEditSession(null); router.refresh(); }}
            onCancel={() => setEditSession(null)}
          />
        </Modal>
      )}
    </div>
  );
}
