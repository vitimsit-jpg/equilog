import { getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks } from "date-fns";
import type { HorseIndexMode } from "./supabase/types";

/** Minimum sessions per week to count the week as "active" */
export function getStreakTarget(mode: HorseIndexMode | null): number {
  if (mode === "IR" || mode === "IS") return 2;
  return 3;
}

/** ISO week string: "2025-W12" */
export function isoWeekKey(date: Date): string {
  const w = getISOWeek(date);
  const y = getISOWeekYear(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export interface StreakResult {
  current: number;
  best: number;
  /** Week keys that were active (for debug/display) */
  activeWeeks: string[];
}

/** Compute streak from an array of session date strings (YYYY-MM-DD or ISO datetime) */
export function computeStreak(
  sessionDates: string[],
  mode: HorseIndexMode | null
): StreakResult {
  const target = getStreakTarget(mode);

  // Group sessions by ISO week
  const weekCounts: Record<string, number> = {};
  for (const d of sessionDates) {
    const date = new Date(d.slice(0, 10));
    const key = isoWeekKey(date);
    weekCounts[key] = (weekCounts[key] ?? 0) + 1;
  }

  const activeWeeks = Object.keys(weekCounts).filter((k) => weekCounts[k] >= target).sort();

  if (activeWeeks.length === 0) return { current: 0, best: 0, activeWeeks: [] };

  // Compute best streak across all data
  let best = 0;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of activeWeeks) {
    if (!prevKey) {
      run = 1;
    } else {
      // Check if key is exactly 1 week after prevKey
      const prevDate = isoWeekKeyToDate(prevKey);
      const currDate = isoWeekKeyToDate(key);
      const diff = Math.round((currDate.getTime() - prevDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (diff === 1) {
        run++;
      } else {
        run = 1;
      }
    }
    if (run > best) best = run;
    prevKey = key;
  }

  // Compute current streak (backwards from current/last week)
  const nowKey = isoWeekKey(new Date());
  const prevWeekKey = isoWeekKey(addWeeks(startOfISOWeek(new Date()), -1));

  // Current streak: count backwards from current week or last week
  let current = 0;
  // Start from nowKey or prevWeekKey (whichever is active)
  let cursor = activeWeeks.includes(nowKey) ? nowKey : prevWeekKey;

  while (activeWeeks.includes(cursor)) {
    current++;
    const cursorDate = isoWeekKeyToDate(cursor);
    cursor = isoWeekKey(addWeeks(cursorDate, -1));
  }

  return { current, best, activeWeeks };
}

function isoWeekKeyToDate(key: string): Date {
  // "2025-W12" → start of that ISO week
  const [yearStr, weekStr] = key.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  // Jan 4 is always in week 1 of ISO year
  const jan4 = new Date(year, 0, 4);
  const startWeek1 = startOfISOWeek(jan4);
  return addWeeks(startWeek1, week - 1);
}
