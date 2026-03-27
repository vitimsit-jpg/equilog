"use client";

/**
 * DASHBOARD-01 — Cards Planning multi-chevaux
 * Une card par cheval actif (hors retraite IS / date_retraite),
 * triées alphabétiquement par premier mot du nom.
 * Lecture seule — aucune saisie. Tap card → onglet Travail du cheval.
 * Refresh au focus de page (router.refresh()).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  startOfWeek,
  eachDayOfInterval,
  addDays,
  format,
  isToday,
} from "date-fns";
import { ChevronRight } from "lucide-react";
import { TRAINING_TYPE_LABELS } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HorseRow {
  id: string;
  name: string;
  avatar_url: string | null;
  horse_index_mode: string | null;
  date_retraite: string | null;
}

interface WeekSession {
  id: string;
  horse_id: string;
  date: string;
  type: string;
  rider: string | null;
  est_complement: boolean | null;
}

interface WeekPlanned {
  id: string;
  horse_id: string;
  date: string;
  type: string;
  qui_sen_occupe: string | null;
  status: string;
}

interface Props {
  horses: HorseRow[];
  weekSessions: WeekSession[];
  weekPlannedSessions: WeekPlanned[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RIDER_LABELS: Record<string, string> = {
  owner: "Seule",
  owner_with_coach: "Avec coach",
  coach: "Coach seule",
  longe: "À la longe",
  travail_a_pied: "À pied",
};

type DayStatus =
  | { kind: "main"; rider: string | null; type: string }
  | { kind: "complement"; type: string }
  | { kind: "planned"; type: string; rider: string | null }
  | { kind: "repos" };

function getDayStatus(sessions: WeekSession[], planned: WeekPlanned[]): DayStatus {
  // Priority: main session > complement > planned > repos
  const main = sessions.filter(
    (s) => !s.est_complement && s.type !== "marcheur" && s.type !== "paddock"
  );
  if (main.length > 0) {
    return { kind: "main", rider: main[0].rider, type: main[0].type };
  }
  const complements = sessions.filter(
    (s) => s.est_complement || s.type === "marcheur" || s.type === "paddock"
  );
  if (complements.length > 0) {
    return { kind: "complement", type: complements[0].type };
  }
  if (planned.length > 0) {
    return { kind: "planned", type: planned[0].type, rider: planned[0].qui_sen_occupe };
  }
  return { kind: "repos" };
}

function getStatusLabel(status: DayStatus): string {
  if (status.kind === "repos") return "Repos";
  if (status.kind === "complement") {
    return status.type === "marcheur" ? "Marcheur" : "Paddock";
  }
  const typeLabel = TRAINING_TYPE_LABELS[status.type] || status.type;
  if (status.kind === "planned") {
    return `${typeLabel} · Planifié`;
  }
  const riderLabel = status.rider ? RIDER_LABELS[status.rider] : null;
  return riderLabel ? `${typeLabel} · ${riderLabel}` : typeLabel;
}

// Circle indicator — spec §2.3 (6 états)
function StatusDot({ status, sm }: { status: DayStatus; sm?: boolean }) {
  const base = sm ? "w-2 h-2" : "w-2.5 h-2.5";

  if (status.kind === "repos") {
    return <div className={`${sm ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full bg-[#CCCCCC] flex-shrink-0`} />;
  }
  if (status.kind === "complement") {
    return <div className={`${base} rounded-full bg-[#388E3C] flex-shrink-0`} />;
  }
  if (status.kind === "planned") {
    return <div className={`${base} rounded-full border-2 border-dashed border-[#E63900] bg-transparent flex-shrink-0`} />;
  }
  // main
  if (status.rider === "coach") {
    return <div className={`${base} rounded-full bg-[#1565C0] flex-shrink-0`} />;
  }
  if (status.rider === "owner_with_coach") {
    return (
      <div className={`relative ${base} flex-shrink-0`}>
        <div className={`${base} rounded-full bg-[#E63900]`} />
        <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-[#1565C0] border border-white" />
      </div>
    );
  }
  // owner / longe / travail_a_pied
  return <div className={`${base} rounded-full bg-[#E63900] flex-shrink-0`} />;
}

function getCardBorder(status: DayStatus): string {
  if (status.kind === "repos") return "bg-[#F5F5F5] border border-transparent";
  if (status.kind === "complement") return "bg-white border border-[#388E3C]";
  if (status.kind === "planned") return "bg-white border border-dashed border-[#E63900]";
  if (status.kind === "main" && status.rider === "coach") return "bg-white border border-[#1565C0]";
  return "bg-white border border-[#E63900]";
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HorsePlanningCards({ horses, weekSessions, weekPlannedSessions }: Props) {
  const router = useRouter();

  // §4.3 — Refresh au focus
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  // §1.1 — Filtrer chevaux actifs (hors IS / date_retraite)
  const activeHorses = [...horses]
    .filter((h) => h.horse_index_mode !== "IS" && !h.date_retraite)
    .sort((a, b) =>
      a.name.split(" ")[0].toLowerCase().localeCompare(b.name.split(" ")[0].toLowerCase(), "fr")
    );

  if (activeHorses.length === 0) return null;

  // Semaine courante (lundi → dimanche)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const todayKey = format(today, "yyyy-MM-dd");

  // Index sessions par cheval + date
  const sessionsByHorseDay: Record<string, Record<string, WeekSession[]>> = {};
  for (const s of weekSessions) {
    const key = s.date.slice(0, 10);
    if (!sessionsByHorseDay[s.horse_id]) sessionsByHorseDay[s.horse_id] = {};
    if (!sessionsByHorseDay[s.horse_id][key]) sessionsByHorseDay[s.horse_id][key] = [];
    sessionsByHorseDay[s.horse_id][key].push(s);
  }
  const plannedByHorseDay: Record<string, Record<string, WeekPlanned[]>> = {};
  for (const p of weekPlannedSessions) {
    const key = p.date.slice(0, 10);
    if (!plannedByHorseDay[p.horse_id]) plannedByHorseDay[p.horse_id] = {};
    if (!plannedByHorseDay[p.horse_id][key]) plannedByHorseDay[p.horse_id][key] = [];
    plannedByHorseDay[p.horse_id][key].push(p);
  }

  return (
    <div className="space-y-3">
      {activeHorses.map((horse) => {
        const firstName = horse.name.split(" ")[0];
        const todaySessions = sessionsByHorseDay[horse.id]?.[todayKey] || [];
        const todayPlanned = plannedByHorseDay[horse.id]?.[todayKey] || [];
        const todayStatus = getDayStatus(todaySessions, todayPlanned);

        return (
          <Link
            key={horse.id}
            href={`/horses/${horse.id}/training`}
            className={`block rounded-xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-opacity active:opacity-80 ${getCardBorder(todayStatus)}`}
          >
            {/* §2.1 Ligne header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                {horse.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={horse.avatar_url}
                    alt={firstName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold leading-none">{firstName[0]}</span>
                  </div>
                )}
                <span className="text-sm font-bold text-black">{firstName}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            {/* §2.3 Ligne statut du jour */}
            <div className="flex items-center gap-1.5 mb-3">
              <StatusDot status={todayStatus} />
              <span className="text-xs font-semibold text-gray-700 truncate">
                {getStatusLabel(todayStatus)}
              </span>
            </div>

            {/* §2.4 Mini grille semaine — purement informative */}
            <div className="flex items-end gap-0.5">
              {days.map((day, i) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const isCurrentDay = isToday(day);
                const daySessions = sessionsByHorseDay[horse.id]?.[dateKey] || [];
                const dayPlanned = plannedByHorseDay[horse.id]?.[dateKey] || [];
                const dayStatus = getDayStatus(daySessions, dayPlanned);

                return (
                  <div key={dateKey} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="flex items-center justify-center h-2.5">
                      <StatusDot status={dayStatus} sm />
                    </div>
                    <span
                      className={`text-[9px] leading-none ${
                        isCurrentDay ? "font-black text-gray-600" : "font-medium text-gray-400"
                      }`}
                    >
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
