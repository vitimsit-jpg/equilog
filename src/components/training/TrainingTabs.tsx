"use client";

import { useState, type ReactNode } from "react";
import { LayoutDashboard, Calendar, Clock, Sparkles, Plus, Trophy, X, ChevronDown } from "lucide-react";
import type { TrainingSession, TrainingPlannedSession, AIInsight, HorseIndexMode, RehabProtocol } from "@/lib/supabase/types";
import RehabProtocolCard from "./RehabProtocolCard";
import TrainingDashboard from "./TrainingDashboard";
import VueSemaine from "./VueSemaine";
import HistoriqueSeances from "./HistoriqueSeances";
import QuickTrainingModal from "./QuickTrainingModal";
import EducationTab from "./EducationTab";
import MovementTab from "./MovementTab";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  format, differenceInDays, parseISO,
  startOfWeek, eachDayOfInterval, isToday, addWeeks, subWeeks, addDays,
} from "date-fns";

type Tab = "overview" | "semaine" | "historique" | "education" | "mouvement";

interface NextCompetition {
  date: string;
  event_name: string;
}

interface Props {
  horseId: string;
  horseName?: string;
  horseBirthYear?: number | null;
  sessions: TrainingSession[];
  plannedSessions: TrainingPlannedSession[];
  latestInsight: AIInsight | null;
  horseMode: HorseIndexMode | null;
  nextCompetition?: NextCompetition | null;
  healthRecords?: { id: string; type: string; date: string }[];
  activeRehabProtocol?: RehabProtocol | null;
  competitions?: { id: string; event_name: string; date: string }[] | null;
}

// Tab config by mode
function getTabConfig(mode: HorseIndexMode | null): { overviewLabel: string; showPlanTab: boolean } {
  switch (mode) {
    case "IC":
    case "ICr":
      return { overviewLabel: "Vue d'ensemble", showPlanTab: true };
    case "IE":
    case "IS":
      return { overviewLabel: "Suivi", showPlanTab: false };
    case "IP":
      return { overviewLabel: "Contact", showPlanTab: true };
    case "IR":
      return { overviewLabel: "Rééducation", showPlanTab: true };
    default:
      return { overviewLabel: "Vue d'ensemble", showPlanTab: true };
  }
}

// Mode badge
function ModeBadge({ mode }: { mode: HorseIndexMode | null }) {
  if (!mode) return null;
  const labels: Record<HorseIndexMode, { label: string; color: string }> = {
    IC:  { label: "Compétition",  color: "bg-purple-100 text-purple-700" },
    ICr: { label: "Croissance",   color: "bg-blue-100 text-blue-700" },
    IE:  { label: "Équilibre",    color: "bg-green-100 text-green-700" },
    IP:  { label: "Rééducation",  color: "bg-amber-100 text-amber-700" },
    IR:  { label: "Convalescence",color: "bg-red-100 text-red-700" },
    IS:  { label: "Retraite",     color: "bg-gray-100 text-gray-600" },
  };
  const info = labels[mode];
  if (!info) return null;
  return (
    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
  );
}

// Workload targets per mode (sessions / 7 days)
const WORKLOAD_CFG: Record<HorseIndexMode, { min: number; target: number; max: number }> = {
  IC:  { min: 4, target: 5, max: 7 },
  ICr: { min: 3, target: 4, max: 6 },
  IP:  { min: 2, target: 3, max: 5 },
  IE:  { min: 1, target: 2, max: 4 },
  IS:  { min: 1, target: 2, max: 3 },
  IR:  { min: 1, target: 2, max: 4 },
};

// Bloc 3 — workload bar
function WorkloadBar({ sessions, mode }: { sessions: TrainingSession[]; mode: HorseIndexMode | null }) {
  if (!mode) return null;
  const cfg = WORKLOAD_CFG[mode];
  if (!cfg) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const count = sessions.filter((s) => new Date(s.date) >= cutoff).length;

  // IE (Loisir) — affiche "Régularité" sans fourchette imposée
  if (mode === "IE") {
    const dotColor = count >= 3 ? "bg-success" : count >= 1 ? "bg-warning" : "bg-danger";
    const label = count === 0 ? "Aucune séance cette semaine" : count >= 3 ? "Bonne régularité 🌿" : "Quelques sorties cette semaine";
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-black">Régularité (7j)</p>
          <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${count >= 3 ? "bg-green-100 text-green-700" : count >= 1 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {count} séance{count !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < count ? dotColor : "bg-gray-100"}`} />
          ))}
        </div>
        <p className="text-2xs text-gray-400 mt-1.5">{label}</p>
      </div>
    );
  }

  let status: "green" | "orange" | "red";
  let statusLabel: string;
  if (count > cfg.max) {
    status = "red";
    statusLabel = "Surcharge — risque de fatigue";
  } else if (count >= cfg.min && count <= cfg.max) {
    status = count === cfg.max ? "orange" : "green";
    statusLabel = count === cfg.max ? "Limite haute — surveiller la récupération" : "Charge optimale";
  } else {
    status = count === 0 ? "red" : "orange";
    statusLabel = count === 0 ? "Aucune séance cette semaine" : "Charge insuffisante";
  }

  const barPct = Math.min((count / cfg.max) * 100, 100);
  const barColor = status === "green" ? "bg-success" : status === "orange" ? "bg-warning" : "bg-danger";
  const badgeClass = status === "green"
    ? "bg-green-100 text-green-700"
    : status === "orange"
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-black">Charge de travail (7j)</p>
        <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {count} séance{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-2xs text-gray-400">{statusLabel}</p>
        <p className="text-2xs text-gray-400">Cible : {cfg.min}–{cfg.target} / sem.</p>
      </div>
    </div>
  );
}

// IE / IS mode: simplified wellness-focused overview
function WellnessOverview({ sessions, horseId, latestInsight }: { sessions: TrainingSession[]; horseId: string; latestInsight: AIInsight | null }) {
  const last7 = sessions.slice(0, 7);
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });
  const avgFeeling = weekSessions.length
    ? (weekSessions.reduce((acc, s) => acc + s.feeling, 0) / weekSessions.length).toFixed(1)
    : null;
  const feelingEmojis: Record<string, string> = { "5.0": "😄", "4.0": "🙂", "3.0": "😐", "2.0": "😕", "1.0": "🤕" };
  const feelingEmoji = avgFeeling ? (feelingEmojis[parseFloat(avgFeeling).toFixed(1)] || "😐") : null;

  let parsedInsight: { summary?: string; insights?: string[] } = {};
  try { if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content); } catch {}

  return (
    <div className="space-y-4">
      {/* Wellness card */}
      <div className="card">
        <h3 className="font-bold text-black text-sm mb-3">Bien-être cette semaine</h3>
        {weekSessions.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-4xl mb-1">{feelingEmoji}</div>
              <p className="text-lg font-black text-black">{avgFeeling}/5</p>
              <p className="text-2xs text-gray-400">Ressenti moyen</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-black">{weekSessions.length}</p>
              <p className="text-2xs text-gray-400">Sortie{weekSessions.length !== 1 ? "s" : ""} cette semaine</p>
              <p className="text-xs text-gray-500 mt-1">
                {weekSessions.reduce((acc, s) => acc + s.duration_min, 0)} min au total
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Aucune sortie cette semaine</p>
        )}
      </div>

      {/* Recent sessions list */}
      {last7.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-3">Dernières sorties</h3>
          <div className="space-y-2">
            {last7.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="text-xl">
                  {s.feeling >= 4 ? "😄" : s.feeling >= 3 ? "🙂" : s.feeling >= 2 ? "😐" : "😕"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black capitalize">{s.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-400">{s.date} · {s.duration_min}min</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-1 h-3 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI insight if available */}
      {parsedInsight.summary && (
        <div className="card bg-orange-light border border-orange/10">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange mb-1">Analyse IA</p>
              <p className="text-sm text-gray-700">{parsedInsight.summary}</p>
              {parsedInsight.insights?.slice(0, 2).map((ins, i) => (
                <p key={i} className="text-xs text-gray-600 mt-1">→ {ins}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// IP mode: contact days view — "X jours de contact / 7"
function IPContactView({ sessions, latestInsight }: { sessions: TrainingSession[]; latestInsight: AIInsight | null }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

  // Index sessions by date string
  const sessionsByDate: Record<string, TrainingSession[]> = {};
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  }

  // Current week contact count
  const contactDays = days.filter((d) => (sessionsByDate[format(d, "yyyy-MM-dd")] || []).length > 0);
  const contactCount = contactDays.length;

  // 4-week trend (including current)
  const weekTrend = [-3, -2, -1, 0].map((offset) => {
    const ws = offset === 0 ? weekStart : offset < 0 ? subWeeks(weekStart, -offset) : addWeeks(weekStart, offset);
    const weekDays = eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
    const count = weekDays.filter((d) => (sessionsByDate[format(d, "yyyy-MM-dd")] || []).length > 0).length;
    return { label: offset === 0 ? "Cette sem." : offset === -1 ? "Sem. -1" : `Sem. ${offset}`, count };
  });

  // Status
  const statusColor = contactCount >= 4 ? "text-success" : contactCount >= 3 ? "text-orange" : "text-danger";
  const statusLabel = contactCount >= 4 ? "Excellent" : contactCount >= 3 ? "Bien" : contactCount >= 1 ? "Insuffisant" : "Aucun contact";

  let parsedInsight: { summary?: string; insights?: string[] } = {};
  try { if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content); } catch {}

  return (
    <div className="space-y-4">
      {/* Main contact card */}
      <div className="card">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-2xs text-gray-400 font-medium uppercase tracking-wide mb-1">Jours de contact — semaine en cours</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-5xl font-black ${statusColor}`}>{contactCount}</span>
              <span className="text-2xl font-bold text-gray-200">/ 7</span>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            contactCount >= 4 ? "bg-green-100 text-green-700" :
            contactCount >= 3 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* 7 day dots */}
        <div className="flex gap-2 justify-between">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const hasSession = (sessionsByDate[key] || []).length > 0;
            const isCurrentDay = isToday(day);
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
                <span className={`text-2xs font-bold ${isCurrentDay ? "text-orange" : "text-gray-400"}`}>
                  {DAY_LABELS[i]}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  hasSession
                    ? "bg-orange shadow-sm"
                    : isCurrentDay
                    ? "border-2 border-orange bg-white"
                    : isPast
                    ? "bg-gray-100"
                    : "bg-gray-50 border border-gray-100"
                }`}>
                  {hasSession ? (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isCurrentDay ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange" />
                  ) : null}
                </div>
                <span className={`text-2xs ${isCurrentDay ? "text-orange font-semibold" : "text-gray-300"}`}>
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Target indicator */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-2xs text-gray-400">Cible : 3–4 jours / semaine</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className={`w-3 h-1 rounded-full ${
                  n <= contactCount
                    ? contactCount >= 4 ? "bg-success" : contactCount >= 3 ? "bg-warning" : "bg-danger"
                    : n <= 4 ? "bg-gray-200" : "bg-gray-100"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 4-week trend */}
      <div className="card">
        <h3 className="font-bold text-black text-sm mb-3">Régularité — 4 semaines</h3>
        <div className="space-y-2">
          {weekTrend.map(({ label, count }) => {
            const pct = (count / 7) * 100;
            const barColor = count >= 4 ? "bg-success" : count >= 3 ? "bg-warning" : "bg-danger";
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-2xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-2xs font-semibold text-gray-600 w-10 text-right flex-shrink-0">
                  {count}/7 j.
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent sessions (last 7) */}
      {sessions.slice(0, 7).length > 0 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-3">Derniers contacts</h3>
          <div className="space-y-2">
            {sessions.slice(0, 7).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-orange-light flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-black capitalize">{s.type.replace(/_/g, " ")}</p>
                  <p className="text-2xs text-gray-400">{s.date} · {s.duration_min}min</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className={`w-1 h-3 rounded-full ${idx < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI insight */}
      {parsedInsight.summary && (
        <div className="card bg-orange-light border border-orange/10">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange mb-1">Analyse IA</p>
              <p className="text-sm text-gray-700">{parsedInsight.summary}</p>
              {parsedInsight.insights?.slice(0, 2).map((ins, i) => (
                <p key={i} className="text-xs text-gray-600 mt-1">→ {ins}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// IR mode: rehab-specific overview
function RehabOverview({ sessions, latestInsight, protocol, horseId }: { sessions: TrainingSession[]; latestInsight: AIInsight | null; protocol: RehabProtocol | null; horseId: string }) {
  const recentSessions = sessions.slice(0, 30);
  const last14 = sessions.filter((s) => {
    const d = new Date(s.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return d >= cutoff;
  });

  // Trend: is intensity increasing over time?
  const recentIntensities = last14.map((s) => s.intensity);
  const avgRecent = recentIntensities.length
    ? recentIntensities.reduce((a, b) => a + b, 0) / recentIntensities.length
    : 0;

  const lightSessions = last14.filter((s) => s.intensity <= 2).length;
  const allLow = last14.length > 0 && lightSessions === last14.length;

  let parsedInsight: { summary?: string; insights?: string[]; alerts?: string[] } = {};
  try { if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content); } catch {}

  return (
    <div className="space-y-4">
      {/* Rehab protocol card */}
      <RehabProtocolCard horseId={horseId} protocol={protocol} />

      {/* Rehab progress */}
      <div className="card">
        <h3 className="font-bold text-black text-sm mb-3">Progression rééducation (14j)</h3>
        {last14.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Intensité moyenne</span>
                  <span className={`text-xs font-bold ${avgRecent <= 2 ? "text-success" : avgRecent <= 3 ? "text-orange" : "text-danger"}`}>
                    {avgRecent.toFixed(1)}/5
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${avgRecent <= 2 ? "bg-success" : avgRecent <= 3 ? "bg-orange" : "bg-danger"}`}
                    style={{ width: `${(avgRecent / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            {allLow && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-100">
                <span className="text-lg">✅</span>
                <p className="text-xs font-medium text-green-700">Toutes les séances sont légères — bonne progressivité</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <span className="text-2xl font-black text-black">{last14.length}</span>
                <span className="text-2xs text-gray-400">séances (14j)</span>
              </div>
              <div className="stat-card">
                <span className="text-2xl font-black text-black">{lightSessions}</span>
                <span className="text-2xs text-gray-400">séances légères</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Aucune séance sur les 14 derniers jours</p>
        )}
      </div>

      {/* Recent session notes — important for rehab tracking */}
      {recentSessions.filter((s) => s.notes).slice(0, 5).length > 0 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-3">Notes récentes</h3>
          <div className="space-y-2">
            {recentSessions.filter((s) => s.notes).slice(0, 5).map((s) => (
              <div key={s.id} className="px-3 py-2 bg-gray-50 rounded-xl">
                <p className="text-2xs text-gray-400 font-medium">{s.date}</p>
                <p className="text-xs text-gray-700 mt-0.5">{s.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedInsight.summary && (
        <div className="card bg-orange-light border border-orange/10">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange mb-1">Analyse IA — Rééducation</p>
              <p className="text-sm text-gray-700">{parsedInsight.summary}</p>
              {parsedInsight.alerts?.map((a, i) => (
                <p key={i} className="text-xs text-danger mt-1">⚠ {a}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrainingTabs({ horseId, horseName, horseBirthYear, sessions, plannedSessions, latestInsight, horseMode, nextCompetition, healthRecords, activeRehabProtocol, competitions }: Props) {
  const router = useRouter();
  const { overviewLabel: _overviewLabel, showPlanTab: _showPlanTab } = getTabConfig(horseMode);

  // Mode-specific default tab
  const getDefaultTab = (): Tab => {
    if (horseMode === "ICr") return "education";
    if (horseMode === "IS") return "mouvement";
    return _showPlanTab ? "semaine" : "overview";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getDefaultTab());
  const [addOpen, setAddOpen] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [programmeExpanded, setProgrammeExpanded] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayPlanned = plannedSessions.find((p) => p.date === todayStr && p.status === "planned") ?? null;
  const showReminder = !reminderDismissed && !!todayPlanned && new Date().getHours() >= 18;

  const daysUntilCompetition = nextCompetition
    ? differenceInDays(parseISO(nextCompetition.date), new Date())
    : null;

  const { overviewLabel, showPlanTab } = getTabConfig(horseMode);
  const isWellnessMode = horseMode === "IE" || horseMode === "IS";
  const isRehabMode = horseMode === "IR";
  const isIPMode = horseMode === "IP";
  const isEducationMode = horseMode === "ICr";
  const isMovementMode = horseMode === "IS";

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    // ICr — onglet Éducation en premier
    ...(isEducationMode ? [{ id: "education" as Tab, label: "Éducation", icon: <Sparkles className="h-3.5 w-3.5" /> }] : []),
    // IS — onglet Mouvement en premier
    ...(isMovementMode ? [{ id: "mouvement" as Tab, label: "Mouvement", icon: <LayoutDashboard className="h-3.5 w-3.5" /> }] : []),
    ...(showPlanTab ? [{ id: "semaine" as Tab, label: "Programme", icon: <Calendar className="h-3.5 w-3.5" /> }] : []),
    // Pour IS et ICr, l'onglet overview reste mais devient secondaire
    ...(!isMovementMode ? [{ id: "overview" as Tab, label: overviewLabel, icon: <LayoutDashboard className="h-3.5 w-3.5" /> }] : []),
    { id: "historique", label: "Historique", icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      {/* Bloc 1 — En-tête contextuel : mode + prochain concours */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ModeBadge mode={horseMode} />
          {nextCompetition && daysUntilCompetition !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-beige rounded-full min-w-0">
              <Trophy className="h-3 w-3 text-orange flex-shrink-0" />
              <span className="text-2xs font-semibold text-black truncate">{nextCompetition.event_name}</span>
              <span className="text-2xs text-gray-400 flex-shrink-0">
                {daysUntilCompetition === 0
                  ? "aujourd'hui"
                  : daysUntilCompetition === 1
                  ? "demain"
                  : `J-${daysUntilCompetition}`}
              </span>
            </div>
          )}
        </div>
        {/* Desktop only — bouton fixe bas sur mobile */}
        <Button size="sm" onClick={() => setAddOpen(true)} className="hidden md:flex">
          <Plus className="h-4 w-4" />
          Ajouter séance
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — mode spécifiques */}
      {activeTab === "education" && (
        <EducationTab horseId={horseId} horseName={horseName} birthYear={horseBirthYear} />
      )}

      {activeTab === "mouvement" && (
        <MovementTab horseId={horseId} horseName={horseName} />
      )}

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {isWellnessMode ? (
            <WellnessOverview sessions={sessions} horseId={horseId} latestInsight={latestInsight} />
          ) : isRehabMode ? (
            <RehabOverview sessions={sessions} latestInsight={latestInsight} protocol={activeRehabProtocol ?? null} horseId={horseId} />
          ) : isIPMode ? (
            <IPContactView sessions={sessions} latestInsight={latestInsight} />
          ) : (
            <TrainingDashboard
              sessions={sessions}
              horseId={horseId}
              horseName={horseName}
              latestInsight={latestInsight}
              hideAddButton
              todayPlanned={todayPlanned}
            />
          )}

          {/* Programme de la semaine inline — collapsible */}
          {showPlanTab && (() => {
            const todayStr2 = format(new Date(), "yyyy-MM-dd");
            const weekStart2 = startOfWeek(new Date(), { weekStartsOn: 1 });
            const weekDays = eachDayOfInterval({ start: weekStart2, end: addDays(weekStart2, 6) });
            const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
            const plannedThisWeek = plannedSessions.filter((p) => {
              const d = parseISO(p.date);
              return d >= weekStart2 && d <= addDays(weekStart2, 6) && p.status === "planned";
            });
            return (
              <div className="card p-0 overflow-hidden">
                <button
                  onClick={() => setProgrammeExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-bold text-black">Programme de la semaine</span>
                    {plannedThisWeek.length > 0 && (
                      <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-light text-orange">
                        {plannedThisWeek.length} prévu{plannedThisWeek.length > 1 ? "es" : "e"}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${programmeExpanded ? "rotate-180" : ""}`} />
                </button>
                {programmeExpanded && (
                  <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {weekDays.map((day, i) => {
                      const key = format(day, "yyyy-MM-dd");
                      const isCurrentDay = key === todayStr2;
                      const dayPlanned = plannedSessions.filter((p) => p.date === key && p.status === "planned");
                      const daySessions = sessions.filter((s) => s.date.slice(0, 10) === key);
                      return (
                        <div key={key} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrentDay ? "bg-orange-light/20" : ""}`}>
                          <div className="w-12 flex-shrink-0">
                            <span className={`text-2xs font-bold ${isCurrentDay ? "text-orange" : "text-gray-400"}`}>{DAY_SHORT[i]}</span>
                            <span className={`ml-1 text-2xs font-black ${isCurrentDay ? "text-orange" : "text-gray-600"}`}>{format(day, "d")}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                            {daySessions.map((s) => (
                              <span key={s.id} className="text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-orange text-white">
                                {s.type.replace(/_/g, " ")} {s.duration_min}min
                              </span>
                            ))}
                            {dayPlanned.map((p) => (
                              <span key={p.id} className="text-2xs font-semibold px-1.5 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500">
                                {p.type.replace(/_/g, " ")}{p.duration_min_target ? ` ${p.duration_min_target}min` : ""}
                              </span>
                            ))}
                            {daySessions.length === 0 && dayPlanned.length === 0 && (
                              <span className="text-2xs text-gray-200">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "semaine" && showPlanTab && (
        <VueSemaine
          horseId={horseId}
          sessions={sessions}
          plannedSessions={plannedSessions}
          healthRecords={healthRecords}
        />
      )}

      {activeTab === "historique" && (
        <HistoriqueSeances sessions={sessions} horseId={horseId} />
      )}

      <QuickTrainingModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        horseId={horseId}
        horseName={horseName}
        todayPlanned={todayPlanned}
        onSaved={() => { setAddOpen(false); router.refresh(); }}
        rehabProtocol={activeRehabProtocol ?? null}
        horseMode={horseMode}
        competitions={competitions}
      />

      {/* Bouton fixe bas — mobile uniquement */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe pb-4 pt-2 bg-white/95 backdrop-blur-sm border-t border-gray-100 md:hidden">
        {/* Bandeau rappel 18h */}
        {showReminder && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-orange-light rounded-lg">
            <span className="text-xs text-orange font-medium flex-1 leading-snug">
              Séance de <strong>{todayPlanned!.type}</strong> prévue aujourd&apos;hui — non loggée.
            </span>
            <button
              onClick={() => { setAddOpen(true); setReminderDismissed(true); }}
              className="text-xs font-bold text-orange underline whitespace-nowrap"
            >
              Logger →
            </button>
            <button onClick={() => setReminderDismissed(true)} className="text-gray-400 flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full py-3.5 bg-orange text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          Ajouter séance
        </button>
      </div>
    </div>
  );
}
