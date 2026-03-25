"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";
import { Plus, AlertCircle, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { daysUntil, formatCurrency, HEALTH_TYPE_LABELS } from "@/lib/utils";
import type { HealthRecord, MarechalProfile } from "@/lib/supabase/types";
import HealthCategoryCard, { type CategoryConfig } from "./HealthCategoryCard";
import HealthTimeline from "./HealthTimeline";
import QuickHealthModal from "./QuickHealthModal";

const VET_CATEGORIES: CategoryConfig[] = [
  { type: "veterinaire", label: "Vétérinaire", emoji: "🩺", defaultInterval: null, hidePlanning: true },
];

const MANDATORY_CATEGORIES: CategoryConfig[] = [
  { type: "vaccin", label: "Vaccin", emoji: "💉", defaultInterval: 180 },
  { type: "vermifuge", label: "Vermifuge", emoji: "🌿", defaultInterval: 90 },
  { type: "ferrage", label: "Parage", emoji: "🔨", defaultInterval: 35 },
  { type: "dentiste", label: "Dentiste", emoji: "🦷", defaultInterval: 365 },
];

const COMFORT_CATEGORIES: CategoryConfig[] = [
  { type: "osteo", label: "Ostéopathie", emoji: "🤲", defaultInterval: 180 },
  { type: "masseuse", label: "Masseuse", emoji: "💆", defaultInterval: 90 },
  { type: "autre", label: "Autre", emoji: "📋", defaultInterval: null },
];

const CATEGORIES = [...VET_CATEGORIES, ...MANDATORY_CATEGORIES, ...COMFORT_CATEGORIES];

// Max interval per type (aligns with Horse Index calculator)
const MAX_DAYS_BY_TYPE: Record<string, number> = {
  vaccin: 182,
  vermifuge: 90,
  ferrage: 35,
  dentiste: 365,
  osteo: 180,
  masseuse: 90,
};

function getLatestByType(records: HealthRecord[]): Record<string, HealthRecord | null> {
  const map: Record<string, HealthRecord | null> = {};
  for (const cat of CATEGORIES) {
    const forType = records
      .filter((r) => r.type === cat.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    map[cat.type] = forType[0] ?? null;
  }
  return map;
}

interface Props {
  records: HealthRecord[];
  horseId: string;
  marechalProfile?: MarechalProfile | null;
  horseName?: string;
  maladiesChroniques?: string | null;
}

export default function HealthOverview({ records, horseId, marechalProfile, horseName, maladiesChroniques }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [showAdd, setShowAdd] = useState(false);

  const latestByType = getLatestByType(records);

  const today = new Date();

  // Summary stats — aligns with Horse Index calculator logic
  const overdue = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    if (!latest) return false;
    if (latest.next_date) return daysUntil(latest.next_date) < 0;
    // No next_date: check against default max interval
    const maxDays = MAX_DAYS_BY_TYPE[c.type];
    if (!maxDays) return false;
    return differenceInDays(today, parseISO(latest.date)) > maxDays;
  }).length;

  const soon = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    if (!latest) return false;
    if (latest.next_date) {
      const d = daysUntil(latest.next_date);
      return d >= 0 && d <= 14;
    }
    // No next_date: check if approaching max interval (within 14 days)
    const maxDays = MAX_DAYS_BY_TYPE[c.type];
    if (!maxDays) return false;
    const daysSince = differenceInDays(today, parseISO(latest.date));
    return daysSince >= maxDays - 14 && daysSince <= maxDays;
  }).length;

  const toPlan = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    return latest && !latest.next_date;
  }).length;

  const lastCare = records.length > 0
    ? records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // Cost breakdown by type
  const costByType = records
    .filter((r) => r.cost && r.cost > 0)
    .reduce((acc: Record<string, number>, r) => {
      acc[r.type] = (acc[r.type] || 0) + r.cost!;
      return acc;
    }, {});
  const totalCost = Object.values(costByType).reduce((s, v) => s + v, 0);
  const costEntries = Object.entries(costByType).sort((a, b) => b[1] - a[1]);

  // Global health status
  const healthStatus = overdue > 0
    ? { label: `${overdue} soin${overdue > 1 ? "s" : ""} en retard`, color: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500" }
    : soon > 0
    ? { label: `${soon} soin${soon > 1 ? "s" : ""} à venir cette semaine`, color: "bg-orange-light border-orange/20 text-orange", dot: "bg-orange" }
    : records.length === 0
    ? { label: "Aucun soin enregistré", color: "bg-gray-50 border-gray-200 text-gray-500", dot: "bg-gray-400" }
    : { label: "Tous les soins sont à jour", color: "bg-green-50 border-green-200 text-green-700", dot: "bg-green-500" };

  return (
    <div className="space-y-4">
      {/* APCU-10 — Antécédents connus */}
      {maladiesChroniques && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-base flex-shrink-0 mt-0.5">⚕️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-800 mb-0.5">Antécédents connus</p>
            <p className="text-xs text-amber-700 leading-relaxed">{maladiesChroniques}</p>
          </div>
          <a
            href={`/horses/${horseId}`}
            className="text-2xs text-amber-600 font-semibold hover:underline flex-shrink-0 mt-0.5"
          >
            Modifier →
          </a>
        </div>
      )}

      {/* Global health status badge */}
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${healthStatus.color}`}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${healthStatus.dot}`} />
        <span className="text-sm font-semibold">{healthStatus.label}</span>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`card p-3 flex items-center gap-2 ${overdue > 0 ? "bg-red-50 border-red-100" : ""}`}>
          <AlertCircle className={`h-4 w-4 flex-shrink-0 ${overdue > 0 ? "text-red-500" : "text-gray-300"}`} />
          <div>
            <p className={`text-lg font-black leading-none ${overdue > 0 ? "text-red-600" : "text-gray-300"}`}>{overdue}</p>
            <p className="text-2xs text-gray-400 mt-0.5">En retard</p>
          </div>
        </div>
        <div className={`card p-3 flex items-center gap-2 ${soon > 0 ? "bg-orange-light border-orange/20" : ""}`}>
          <Clock className={`h-4 w-4 flex-shrink-0 ${soon > 0 ? "text-orange" : "text-gray-300"}`} />
          <div>
            <p className={`text-lg font-black leading-none ${soon > 0 ? "text-orange" : "text-gray-300"}`}>{soon}</p>
            <p className="text-2xs text-gray-400 mt-0.5">Dans 7 jours</p>
          </div>
        </div>
        <div className={`card p-3 flex items-center gap-2 ${toPlan > 0 ? "" : ""}`}>
          <Calendar className={`h-4 w-4 flex-shrink-0 ${toPlan > 0 ? "text-gray-500" : "text-gray-300"}`} />
          <div>
            <p className={`text-lg font-black leading-none ${toPlan > 0 ? "text-gray-700" : "text-gray-300"}`}>{toPlan}</p>
            <p className="text-2xs text-gray-400 mt-0.5">À planifier</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-gray-700 leading-tight">
              {lastCare ? new Date(lastCare.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
            </p>
            <p className="text-2xs text-gray-400 mt-0.5">Dernier soin</p>
          </div>
        </div>
      </div>

      {/* Tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("overview")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === "overview" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Vue d&apos;ensemble
          </button>
          <button
            onClick={() => setTab("history")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === "history" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Historique
          </button>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un soin
        </button>
      </div>

      {/* Content */}
      {tab === "overview" ? (
        <div className="space-y-3">
          {/* Budget santé */}
          {costEntries.length >= 3 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-black text-sm">Budget santé</h3>
                <span className="text-sm font-black text-black">{formatCurrency(totalCost)}</span>
              </div>
              <div className="space-y-2">
                {costEntries.map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{HEALTH_TYPE_LABELS[type] || type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange rounded-full" style={{ width: `${Math.round((amount / totalCost) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-black w-14 text-right">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5">Vétérinaire</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {VET_CATEGORIES.map((cat) => (
                  <HealthCategoryCard
                    key={cat.type}
                    config={cat}
                    records={records.filter((r) => r.type === cat.type)}
                    horseId={horseId}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5">Soins obligatoires</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MANDATORY_CATEGORIES.map((cat) => (
                  <HealthCategoryCard
                    key={cat.type}
                    config={cat}
                    records={records.filter((r) => r.type === cat.type)}
                    horseId={horseId}
                    marechalProfile={cat.type === "ferrage" ? marechalProfile : undefined}
                    horseName={cat.type === "ferrage" ? horseName : undefined}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5">Soins de confort</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {COMFORT_CATEGORIES.map((cat) => (
                  <HealthCategoryCard
                    key={cat.type}
                    config={cat}
                    records={records.filter((r) => r.type === cat.type)}
                    horseId={horseId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <HealthTimeline records={records} horseId={horseId} />
      )}

      {showAdd && (
        <QuickHealthModal
          open={showAdd}
          horseId={horseId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
