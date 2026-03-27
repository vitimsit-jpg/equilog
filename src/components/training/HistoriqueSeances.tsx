"use client";

import { useState, useMemo } from "react";
import type { TrainingSession } from "@/lib/supabase/types";
import { formatDate, TRAINING_TYPE_LABELS, TRAINING_EMOJIS } from "@/lib/utils";
import { ChevronLeft, ChevronDown, Edit2, Trash2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import EmptyState from "@/components/ui/EmptyState";
import MediaGallery from "@/components/media/MediaGallery";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Dumbbell } from "lucide-react";

type DateRange = "7j" | "30j" | "90j" | "6m" | "1an" | "tout";
type Level = 1 | 2 | 3;

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7j", label: "7j" },
  { value: "30j", label: "30j" },
  { value: "90j", label: "90j" },
  { value: "6m", label: "6 mois" },
  { value: "1an", label: "1 an" },
  { value: "tout", label: "Tout" },
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

function fmtDuration(min: number) {
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}m` : ""}`;
  return `${min}min`;
}

export default function HistoriqueSeances({ sessions, horseId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  // Level/navigation state
  const [level, setLevel] = useState<Level>(1);
  const [drillType, setDrillType] = useState<string | null>(null);
  const [drillPerson, setDrillPerson] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [editSession, setEditSession] = useState<TrainingSession | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter state (level 1)
  const [dateRange, setDateRange] = useState<DateRange>("90j");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [intensityFilter, setIntensityFilter] = useState<"all" | "leger" | "modere" | "intense">("all");
  const [personFilter, setPersonFilter] = useState<string>("all");

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("training_sessions").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else {
      toast.success("Séance supprimée");
      setDeleteConfirm(null);
      setSelectedSession(null);
      setLevel(level > 1 ? 2 : 1);
      router.refresh();
    }
  };

  // Separate complements (marcheur/paddock / est_complement=true)
  const mainSessions = useMemo(() =>
    sessions.filter((s) => s.type !== "marcheur" && s.type !== "paddock" && !s.est_complement),
    [sessions]
  );
  const complementSessions = useMemo(() =>
    sessions.filter((s) => s.type === "marcheur" || s.type === "paddock" || s.est_complement),
    [sessions]
  );

  // All persons from main sessions
  const allPersons = useMemo(() => {
    const persons = new Set(mainSessions.map((s) => s.rider).filter(Boolean) as string[]);
    return Array.from(persons);
  }, [mainSessions]);

  // All types from main sessions
  const allTypes = useMemo(() => {
    const types = new Set(mainSessions.map((s) => s.type));
    return Array.from(types);
  }, [mainSessions]);

  // Filtered main sessions
  const filtered = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    return mainSessions.filter((s) => {
      if (cutoff && new Date(s.date) < cutoff) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (intensityFilter === "leger" && s.intensity > 2) return false;
      if (intensityFilter === "modere" && s.intensity !== 3) return false;
      if (intensityFilter === "intense" && s.intensity < 4) return false;
      if (personFilter !== "all" && s.rider !== personFilter) return false;
      return true;
    });
  }, [mainSessions, dateRange, typeFilter, intensityFilter, personFilter]);

  // KPIs
  const totalMin = filtered.reduce((acc, s) => acc + s.duration_min, 0);
  const avgIntensity = filtered.length
    ? (filtered.reduce((acc, s) => acc + s.intensity, 0) / filtered.length).toFixed(1)
    : null;
  const avgFeeling = filtered.length
    ? (filtered.reduce((acc, s) => acc + s.feeling, 0) / filtered.length).toFixed(1)
    : null;

  // Répartition par type
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of filtered) {
      map[s.type] = (map[s.type] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Répartition par personne
  const personBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of filtered) {
      const key = s.rider || "non_renseigné";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Level 2 drill data
  const drillSessions = useMemo(() => {
    if (!drillType && !drillPerson) return filtered;
    if (drillType) return filtered.filter((s) => s.type === drillType);
    if (drillPerson) return filtered.filter((s) => (s.rider || "non_renseigné") === drillPerson);
    return filtered;
  }, [filtered, drillType, drillPerson]);

  // Group by month
  const drillGrouped = useMemo(() => {
    const map: Record<string, TrainingSession[]> = {};
    for (const s of drillSessions) {
      const key = format(new Date(s.date), "MMMM yyyy", { locale: fr });
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map);
  }, [drillSessions]);

  // Rider label helper
  const riderLabel: Record<string, string> = {
    owner: "Moi seule",
    owner_with_coach: "Cours coach",
    coach: "Coach seul·e",
    longe: "Longe",
    travail_a_pied: "À pied",
    non_renseigné: "Non renseigné",
  };

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

  // ── LEVEL 3 — Détail séance ──────────────────────────────────────────────
  if (level === 3 && selectedSession) {
    const s = selectedSession;
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedSession(null); setLevel(2); }}
          className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-black"
        >
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <div className="card space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{TRAINING_EMOJIS[s.type] || "🏇"}</span>
              <div>
                <p className="font-bold text-black">{TRAINING_TYPE_LABELS[s.type] || s.type}</p>
                <p className="text-xs text-gray-400">{formatDate(s.date)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditSession(s)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteConfirm(s.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-danger transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xs text-gray-400 mb-0.5">Durée</p>
              <p className="text-sm font-bold text-black">{fmtDuration(s.duration_min)}</p>
              {s.duree_planifiee != null && s.duree_planifiee !== s.duration_min && (
                <p className="text-2xs text-gray-400 mt-0.5">
                  Prévu : {fmtDuration(s.duree_planifiee)}
                  {s.duration_min > s.duree_planifiee
                    ? <span className="text-orange ml-1">+{fmtDuration(s.duration_min - s.duree_planifiee)}</span>
                    : <span className="text-success ml-1">-{fmtDuration(s.duree_planifiee - s.duration_min)}</span>
                  }
                </p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xs text-gray-400 mb-0.5">Intensité</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-4 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-200"}`} />
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xs text-gray-400 mb-0.5">État cheval</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-4 rounded-full ${i < s.feeling ? "bg-success" : "bg-gray-200"}`} />
                ))}
              </div>
            </div>
            {s.rider && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xs text-gray-400 mb-0.5">Qui s&apos;en occupe</p>
                <p className="text-sm font-bold text-black">{riderLabel[s.rider] || s.rider}</p>
              </div>
            )}
          </div>

          {s.objectif && (
            <div>
              <p className="text-2xs text-gray-400 mb-0.5">Objectif</p>
              <p className="text-sm text-gray-700">{s.objectif}</p>
            </div>
          )}
          {s.notes && (
            <div>
              <p className="text-2xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700 italic">{s.notes}</p>
            </div>
          )}
          {s.lieu && (
            <div>
              <p className="text-2xs text-gray-400 mb-0.5">Lieu</p>
              <p className="text-sm text-gray-700">{s.lieu}</p>
            </div>
          )}
          {s.coach_present && (
            <span className="inline-block text-2xs bg-blue-50 text-blue-600 font-semibold px-2 py-1 rounded-full">Coach présent</span>
          )}
          {/* ICr foal fields (TRAV-20) */}
          {(s.session_type || s.foal_reaction) && (
            <div className="flex flex-wrap gap-2">
              {s.session_type && (
                <span className="text-2xs bg-green-50 text-green-700 font-semibold px-2 py-1 rounded-full capitalize">
                  🐣 {{
                    manipulation: "Manipulation",
                    toilettage: "Toilettage",
                    longe_douce: "Longe douce",
                    debourrage: "Débourrage",
                    premiere_monte: "1ère monte",
                    autre: "Autre",
                  }[s.session_type] ?? s.session_type}
                </span>
              )}
              {s.foal_reaction && (
                <span className="text-2xs bg-gray-50 text-gray-600 font-semibold px-2 py-1 rounded-full">
                  {{
                    calme: "😌 Calme",
                    attentif: "🧐 Attentif",
                    nerveux: "😬 Nerveux",
                    agite: "😤 Agité",
                    difficile: "😣 Difficile",
                  }[s.foal_reaction] ?? s.foal_reaction}
                </span>
              )}
            </div>
          )}
          {s.linked_competition_id && (
            <span className="inline-flex items-center gap-1 text-2xs bg-orange-light text-orange font-semibold px-2 py-1 rounded-full">
              <Link2 className="h-3 w-3" /> Lié à un concours
            </span>
          )}
          {s.mode_entree && (
            <p className="text-2xs text-gray-300">
              {s.mode_entree === "planifie" ? "Issu du programme" : "Loggé directement"}
            </p>
          )}
          <MediaGallery
            entityType="training"
            entityId={s.id}
            horseId={horseId}
            initialMediaUrls={s.media_urls ?? []}
          />
        </div>

        {deleteConfirm === s.id && (
          <div className="card bg-red-50 border-red-100 space-y-3">
            <p className="text-sm font-bold text-danger">Supprimer cette séance ?</p>
            <p className="text-xs text-gray-500">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary text-sm">Annuler</button>
              <button onClick={() => handleDelete(s.id)} className="flex-1 bg-danger text-white font-bold text-sm py-2 rounded-xl">Supprimer</button>
            </div>
          </div>
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

  // ── LEVEL 2 — Drill-down list ────────────────────────────────────────────
  if (level === 2) {
    const drillLabel = drillType
      ? (TRAINING_EMOJIS[drillType] || "🏇") + " " + (TRAINING_TYPE_LABELS[drillType] || drillType)
      : drillPerson
      ? riderLabel[drillPerson] || drillPerson
      : "Toutes les séances";

    return (
      <div className="space-y-4">
        <button
          onClick={() => { setLevel(1); setDrillType(null); setDrillPerson(null); }}
          className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-black"
        >
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>

        <h3 className="font-bold text-black">{drillLabel}</h3>
        <p className="text-xs text-gray-400">{drillSessions.length} séance{drillSessions.length !== 1 ? "s" : ""}</p>

        {drillGrouped.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-sm text-gray-400">Aucune séance sur cette période</p>
          </div>
        ) : (
          drillGrouped.map(([month, monthSessions]) => (
            <div key={month} className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-black text-sm capitalize">{month}</h4>
                <span className="text-2xs text-gray-400">
                  {monthSessions.length} séance{monthSessions.length !== 1 ? "s" : ""}
                  {" · "}
                  {fmtDuration(monthSessions.reduce((acc, s) => acc + s.duration_min, 0))}
                </span>
              </div>
              <div className="space-y-1">
                {monthSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSession(s); setLevel(3); }}
                    className="w-full text-left flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <span className="text-xl flex-shrink-0">{TRAINING_EMOJIS[s.type] || "🏇"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-black">{TRAINING_TYPE_LABELS[s.type] || s.type}</span>
                        <span className="text-xs text-gray-400">{s.duration_min}min</span>
                        {s.lieu && <span className="text-xs text-gray-400">· {s.lieu}</span>}
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(s.date)}</p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-3.5 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ── LEVEL 1 — Résumé + Répartitions ─────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Period pills */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              dateRange === opt.value ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        {/* Type filter */}
        <div>
          <p className="text-2xs font-bold uppercase text-gray-400 mb-1.5">Type</p>
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
                {TRAINING_EMOJIS[t]} {TRAINING_TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity filter */}
        <div>
          <p className="text-2xs font-bold uppercase text-gray-400 mb-1.5">Intensité</p>
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "Toutes" },
              { value: "leger", label: "Légère" },
              { value: "modere", label: "Modérée" },
              { value: "intense", label: "Intense" },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setIntensityFilter(o.value as typeof intensityFilter)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${intensityFilter === o.value ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Person filter */}
        {allPersons.length > 1 && (
          <div>
            <p className="text-2xs font-bold uppercase text-gray-400 mb-1.5">Qui s&apos;en occupe</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPersonFilter("all")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${personFilter === "all" ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                Tous
              </button>
              {allPersons.map((p) => (
                <button
                  key={p}
                  onClick={() => setPersonFilter(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${personFilter === p ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  {riderLabel[p] || p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 KPIs */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card">
            <span className="text-xl font-black text-black">{filtered.length}</span>
            <span className="text-2xs text-gray-400 leading-tight">séances</span>
          </div>
          <div className="stat-card">
            <span className="text-xl font-black text-black">
              {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h` : `${totalMin}m`}
            </span>
            <span className="text-2xs text-gray-400 leading-tight">total</span>
          </div>
          <div className="stat-card">
            <span className="text-xl font-black text-black">{avgIntensity ?? "—"}</span>
            <span className="text-2xs text-gray-400 leading-tight">intensité</span>
          </div>
          <div className="stat-card">
            <span className="text-xl font-black text-black">{avgFeeling ?? "—"}</span>
            <span className="text-2xs text-gray-400 leading-tight">ressenti</span>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-6">
          <p className="text-sm text-gray-400">Aucune séance sur cette période</p>
          <button onClick={() => { setDateRange("tout"); setTypeFilter("all"); setIntensityFilter("all"); setPersonFilter("all"); }} className="text-xs text-orange hover:underline mt-1">
            Voir tout l&apos;historique
          </button>
        </div>
      ) : (
        <>
          {/* Répartition TRAVAIL */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-black text-sm">Répartition travail</h3>
              <button
                onClick={() => { setDrillType(null); setDrillPerson(null); setLevel(2); }}
                className="text-2xs text-orange hover:underline"
              >
                Voir tout →
              </button>
            </div>
            <div className="space-y-2">
              {typeBreakdown.slice(0, 5).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => { setDrillType(type); setDrillPerson(null); setLevel(2); }}
                  className="w-full flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1 py-0.5 transition-colors"
                >
                  <span className="text-base flex-shrink-0">{TRAINING_EMOJIS[type] || "🏇"}</span>
                  <span className="text-xs text-gray-600 flex-1 text-left">{TRAINING_TYPE_LABELS[type] || type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange rounded-full"
                        style={{ width: `${Math.round((count / filtered.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-black w-4 text-right">{count}</span>
                  </div>
                </button>
              ))}
              {typeBreakdown.length > 5 && (
                <button
                  onClick={() => { setDrillType(null); setDrillPerson(null); setLevel(2); }}
                  className="text-2xs text-gray-400 hover:text-gray-600 mt-1"
                >
                  +{typeBreakdown.length - 5} autres types →
                </button>
              )}
            </div>
          </div>

          {/* Répartition QUI S'EN OCCUPE */}
          {personBreakdown.length > 1 && (
            <div className="card">
              <h3 className="font-bold text-black text-sm mb-3">Qui s&apos;en occupe</h3>
              <div className="space-y-2">
                {personBreakdown.map(([person, count]) => (
                  <button
                    key={person}
                    onClick={() => { setDrillType(null); setDrillPerson(person); setLevel(2); }}
                    className="w-full flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1 py-0.5 transition-colors"
                  >
                    <span className="text-xs text-gray-600 flex-1 text-left">{riderLabel[person] || person}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full"
                          style={{ width: `${Math.round((count / filtered.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-black w-4 text-right">{count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* COMPLÉMENTS section */}
      {complementSessions.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-3">Compléments</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-black">{complementSessions.length}</p>
              <p className="text-2xs text-gray-400">séances</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-black">{fmtDuration(complementSessions.reduce((a, s) => a + s.duration_min, 0))}</p>
              <p className="text-2xs text-gray-400">total</p>
            </div>
          </div>
          <div className="flex gap-3">
            {["marcheur", "paddock"].map((type) => {
              const cnt = complementSessions.filter((s) => s.type === type).length;
              if (!cnt) return null;
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="text-base">{TRAINING_EMOJIS[type]}</span>
                  <span className="text-xs text-gray-500">{TRAINING_TYPE_LABELS[type] || type}</span>
                  <span className="text-xs font-bold text-black">×{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
