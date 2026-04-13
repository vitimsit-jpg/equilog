import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";
import type { DayState } from "./types";
import { isComplement } from "./constants";

// ── Index sessions par date (fonction pure, pas de hooks) ────────────────────

function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.date.slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

export function buildPlanningData(
  sessions: TrainingSession[],
  plannedSessions: TrainingPlannedSession[],
) {
  const sessionsByDate = groupByDate(sessions);
  const active = plannedSessions.filter((p) => p.status === "planned" && !p.linked_session_id);
  const plannedByDate = groupByDate(active);

  function getDayState(dateKey: string): DayState {
    const done = sessionsByDate[dateKey] ?? [];
    const planned = plannedByDate[dateKey] ?? [];

    const mainDone = done.filter((s) => !isComplement(s.type) && !s.est_complement);
    const complements = done.filter((s) => isComplement(s.type) || s.est_complement);
    const totalMinutes = done.reduce((sum, s) => sum + (s.duration_min || 0), 0);

    const doneCount = mainDone.length;
    const plannedCount = planned.length;
    const complementCount = complements.length;

    let kind: DayState["kind"];
    if (doneCount > 0 && plannedCount > 0) kind = "mixte";
    else if (doneCount > 0) kind = "fait";
    else if (plannedCount > 0) kind = "planifie";
    else if (complementCount > 0) kind = "complement";
    else kind = "repos";

    return { kind, doneCount, plannedCount, complementCount, totalMinutes };
  }

  function getDayLoad(dateKey: string): number {
    const done = sessionsByDate[dateKey] ?? [];
    return done.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  }

  function getSessionsForDay(dateKey: string): TrainingSession[] {
    return sessionsByDate[dateKey] ?? [];
  }

  function getPlannedForDay(dateKey: string): TrainingPlannedSession[] {
    return plannedByDate[dateKey] ?? [];
  }

  return {
    sessionsByDate,
    plannedByDate,
    getDayState,
    getDayLoad,
    getSessionsForDay,
    getPlannedForDay,
  };
}

