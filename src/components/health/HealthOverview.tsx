"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { daysUntil } from "@/lib/utils";
import type { HealthRecord } from "@/lib/supabase/types";
import HealthCategoryCard, { type CategoryConfig } from "./HealthCategoryCard";
import HealthTimeline from "./HealthTimeline";
import HealthTimeline30 from "./HealthTimeline30";
import HealthEventModal from "./HealthEventModal";

const CATEGORIES: CategoryConfig[] = [
  { type: "veterinaire", label: "Vétérinaire", emoji: "🩺", defaultInterval: null },
  { type: "vaccin", label: "Vaccin", emoji: "💉", defaultInterval: 180 },
  { type: "vermifuge", label: "Vermifuge", emoji: "🌿", defaultInterval: 90 },
  { type: "ferrage", label: "Parage", emoji: "🔨", defaultInterval: 35 },
  { type: "dentiste", label: "Dentiste", emoji: "🦷", defaultInterval: 365 },
  { type: "osteo", label: "Ostéopathie", emoji: "🤲", defaultInterval: 180 },
  { type: "masseuse", label: "Masseuse", emoji: "💆", defaultInterval: 90 },
  { type: "autre", label: "Autre", emoji: "📋", defaultInterval: null },
];

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
}

export default function HealthOverview({ records, horseId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [showAdd, setShowAdd] = useState(false);

  const latestByType = getLatestByType(records);

  // Summary stats
  const overdue = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    return latest?.next_date && daysUntil(latest.next_date) < 0;
  }).length;

  const soon = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    if (!latest?.next_date) return false;
    const d = daysUntil(latest.next_date);
    return d >= 0 && d <= 7;
  }).length;

  const toPlan = CATEGORIES.filter((c) => {
    const latest = latestByType[c.type];
    return latest && !latest.next_date;
  }).length;

  const lastCare = records.length > 0
    ? records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

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
          <HealthTimeline30 records={records} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <HealthCategoryCard
                key={cat.type}
                config={cat}
                records={records.filter((r) => r.type === cat.type)}
                horseId={horseId}
              />
            ))}
          </div>
        </div>
      ) : (
        <HealthTimeline records={records} horseId={horseId} />
      )}

      {showAdd && (
        <HealthEventModal
          horseId={horseId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
