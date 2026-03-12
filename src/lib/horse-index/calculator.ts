import { differenceInDays, parseISO } from "date-fns";
import type {
  TrainingSession,
  HealthRecord,
  Competition,
  WearableData,
  ScoreBreakdown,
} from "@/lib/supabase/types";

interface HorseData {
  trainingSessions: TrainingSession[];
  healthRecords: HealthRecord[];
  competitions: Competition[];
  wearableData: WearableData[];
}

export function calculateHorseIndex(data: HorseData): ScoreBreakdown {
  const now = new Date();
  const hasWearables = data.wearableData.length > 0;

  const regularite = calculateRegularite(data.trainingSessions, now);
  const progression = calculateProgression(data.trainingSessions, data.competitions, now);
  const sante = calculateSante(data.healthRecords, now);
  const recuperation = calculateRecuperation(data.trainingSessions, now);
  const wearables = hasWearables ? calculateWearables(data.wearableData, now) : 0;

  let total: number;
  if (hasWearables) {
    total = regularite + progression + sante + recuperation + wearables;
  } else {
    // Redistribute wearable 10pts proportionally to the other 4 components
    const baseTotal = regularite + progression + sante + recuperation;
    const maxBase = 90;
    total = Math.round((baseTotal / maxBase) * 100);
  }

  return {
    regularite: Math.round(regularite),
    progression: Math.round(progression),
    sante: Math.round(sante),
    recuperation: Math.round(recuperation),
    wearables: Math.round(wearables),
    total: Math.min(100, Math.max(0, total)),
    has_wearables: hasWearables,
  };
}

function calculateRegularite(sessions: TrainingSession[], now: Date): number {
  // Max 25 pts
  // Ne compter que les séances de 15 min ou plus comme séances réelles
  const validSessions = sessions.filter((s) => s.duration_min >= 15);

  const last30Days = validSessions.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= 30
  );
  const last90Days = validSessions.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= 90
  );

  if (last90Days.length === 0) return 0;

  // Average sessions per week over 90 days
  const avgWeekly = last90Days.length / 13;
  // Current 30-day pace (sessions per week)
  const currentWeekly = last30Days.length / 4.3;

  // Base score from frequency (ideal = 3-5 sessions/week = 25pts)
  let score = Math.min(25, (currentWeekly / 4) * 25);

  // Penalty: find longest gap in last 30 days
  const sorted = last30Days
    .map((s) => parseISO(s.date))
    .sort((a, b) => a.getTime() - b.getTime());

  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInDays(sorted[i], sorted[i - 1]);
    if (gap > maxGap) maxGap = gap;
  }

  if (maxGap > 14) score *= 0.6;
  else if (maxGap > 10) score *= 0.75;
  else if (maxGap > 7) score *= 0.85;

  // Bonus régularité historique (pace actuel ≥ 90% de la moyenne 90j)
  if (currentWeekly >= avgWeekly * 0.9 && avgWeekly > 0) {
    score = Math.min(25, score * 1.1);
  }

  // Bonus streak : aucune semaine à 0 séance sur les 4 dernières semaines
  const hasStreakBonus = (() => {
    for (let week = 0; week < 4; week++) {
      const inWeek = last30Days.filter((s) => {
        const d = differenceInDays(now, parseISO(s.date));
        return d >= week * 7 && d < (week + 1) * 7;
      });
      if (inWeek.length === 0) return false;
    }
    return true;
  })();
  if (hasStreakBonus && last30Days.length >= 12) {
    score = Math.min(25, score * 1.08); // +8% si aucune semaine sans séance sur 30j
  }

  return score;
}

function calculateProgression(
  sessions: TrainingSession[],
  competitions: Competition[],
  now: Date
): number {
  // Max 25 pts
  if (sessions.length < 4) return 12; // Neutral score with few data

  const last6Months = sessions.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= 180
  );

  if (last6Months.length === 0) return 0;

  // Split into first half vs second half
  const midpoint = 90;
  const firstHalf = last6Months.filter(
    (s) => differenceInDays(now, parseISO(s.date)) > midpoint
  );
  const secondHalf = last6Months.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= midpoint
  );

  const avgIntensityFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, s) => sum + s.intensity, 0) / firstHalf.length
      : 3;
  const avgIntensitySecond =
    secondHalf.length > 0
      ? secondHalf.reduce((sum, s) => sum + s.intensity, 0) / secondHalf.length
      : 3;

  const avgFeelingFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, s) => sum + s.feeling, 0) / firstHalf.length
      : 3;
  const avgFeelingSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((sum, s) => sum + s.feeling, 0) / secondHalf.length
      : 3;

  // Progression trend
  const intensityTrend = avgIntensitySecond - avgIntensityFirst;
  const feelingTrend = avgFeelingSecond - avgFeelingFirst;
  const combinedTrend = (intensityTrend + feelingTrend) / 2;

  let score = 12.5; // Neutral
  score += combinedTrend * 5; // +/- 5 pts per unit of trend

  // Competition results bonus
  const recentComps = competitions.filter(
    (c) => differenceInDays(now, parseISO(c.date)) <= 180 && c.result_rank && c.total_riders
  );

  if (recentComps.length > 0) {
    const avgPercentile =
      recentComps.reduce((sum, c) => {
        const pct = 1 - (c.result_rank! - 1) / c.total_riders!;
        return sum + pct;
      }, 0) / recentComps.length;

    const compBonus = avgPercentile * 5; // Up to +5 pts from competitions
    score += compBonus;
  }

  return Math.max(0, Math.min(25, score));
}

function calculateSante(healthRecords: HealthRecord[], now: Date): number {
  // Max 20 pts
  const checks = [
    { type: "vaccin",    maxDays: 182, weight: 5 },
    { type: "vermifuge", maxDays: 90,  weight: 4 },
    { type: "ferrage",   maxDays: 35,  weight: 4 },
    { type: "dentiste",  maxDays: 365, weight: 4 },
    { type: "osteo",     maxDays: 180, weight: 2, optional: true },
  ];

  let score = 0;

  for (const check of checks) {
    const records = healthRecords
      .filter((r) => r.type === check.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (records.length === 0) continue;

    const lastRecord = records[0];
    const nextDate = lastRecord.next_date ? parseISO(lastRecord.next_date) : null;

    if (nextDate) {
      const daysUntilNext = differenceInDays(nextDate, now);
      if (daysUntilNext >= 0) {
        score += check.weight;
      } else if (daysUntilNext >= -7) {
        score += check.weight * 0.5;
      }
      // Dépassé de plus de 7 jours = 0 pt
    } else {
      const daysSinceRecord = differenceInDays(now, parseISO(lastRecord.date));
      if (daysSinceRecord <= check.maxDays) {
        score += check.weight;
      } else if (daysSinceRecord <= check.maxDays * 1.2) {
        score += check.weight * 0.5;
      }
    }
  }

  // Bonus vétérinaire : visite vét dans les 12 derniers mois = +1 pt (suivi proactif)
  const recentVet = healthRecords.some(
    (r) => r.type === "veterinaire" && differenceInDays(now, parseISO(r.date)) <= 365
  );
  if (recentVet) score += 1;

  return Math.min(20, score);
}

function calculateRecuperation(sessions: TrainingSession[], now: Date): number {
  // Max 20 pts
  const last14Days = sessions.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= 14
  );

  if (last14Days.length === 0) {
    return 10; // Pas de séances récentes — score neutre
  }

  // Jours de repos (jours sans séance)
  const trainingDays = new Set(last14Days.map((s) => s.date.substring(0, 10)));
  const restDays = 14 - trainingDays.size;
  const restRatio = restDays / 14;

  // Ratio idéal : 30-50% (4-7 jours de repos sur 14)
  let restScore: number;
  if (restRatio >= 0.3 && restRatio <= 0.5) restScore = 8;
  else if (restRatio >= 0.2 && restRatio < 0.3) restScore = 5;
  else if (restRatio > 0.5 && restRatio <= 0.7) restScore = 6;
  else if (restRatio < 0.2) restScore = 2; // Surmenage
  else restScore = 4; // Trop de repos

  // Score ressenti moyen
  const avgFeeling =
    last14Days.reduce((sum, s) => sum + s.feeling, 0) / last14Days.length;
  const feelingScore = (avgFeeling / 5) * 11;

  // Pénalité : séances longues (>90 min) sans récupération déclarée
  const intensiveSessions = last14Days.filter(
    (s) => s.duration_min > 90 && s.intensity >= 4
  );
  const intensiveWithoutRecovery = intensiveSessions.filter(
    (s) => !s.equipement_recuperation
  ).length;
  const recoveryPenalty = Math.min(2, intensiveWithoutRecovery * 0.5);

  // Bonus : équipement récupération utilisé au moins une fois
  const usesRecovery = last14Days.some((s) => !!s.equipement_recuperation);
  const recoveryBonus = usesRecovery ? 1 : 0;

  return Math.min(20, restScore + feelingScore - recoveryPenalty + recoveryBonus);
}

function calculateWearables(wearableData: WearableData[], now: Date): number {
  // Max 10 pts
  const last30Days = wearableData.filter(
    (w) => differenceInDays(now, parseISO(w.date)) <= 30
  );

  if (last30Days.length === 0) return 0;

  let score = 0;
  let count = 0;

  for (const w of last30Days) {
    let itemScore = 0;
    let itemCount = 0;

    if (w.symmetry_score !== null) {
      // Symmetry: 90+ = perfect, below 80 = issues
      itemScore += Math.min(1, w.symmetry_score / 90);
      itemCount++;
    }

    if (w.hr_recovery !== null) {
      // HR recovery: lower is better (< 60s to recover = good)
      const normalizedRecovery = Math.max(0, 1 - (w.hr_recovery - 30) / 90);
      itemScore += normalizedRecovery;
      itemCount++;
    }

    if (itemCount > 0) {
      score += itemScore / itemCount;
      count++;
    }
  }

  return count > 0 ? (score / count) * 10 : 5;
}
